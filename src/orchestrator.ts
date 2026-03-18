import * as vscode from 'vscode';
import {
    LoopExecutionState,
    TaskRequirements,
    RalphSettings,
    REVIEW_COUNTDOWN_SECONDS,
    IRalphUI,
    TaskStatus,
    TelegramStatus
} from './types';
import { logError } from './logger';
import { readPRDAsync, getNextTaskAsync, getTaskStatsAsync, getWorkspaceRoot, appendProgressAsync, ensureProgressFileAsync, appendTaskToPrdAsync, parseTasksAsync, readFileAsync, listDirectoryContentsAsync } from './fileUtils';
import { RalphStatusBar } from './statusBar';
import { CountdownTimer, InactivityMonitor } from './timerManager';
import { FileWatcherManager } from './fileWatchers';
import { UIManager } from './uiManager';
import { TaskRunner } from './taskRunner';

import { TelegramBot } from './telegram/telegramBot';
import { TelegramHandler, ILoopOrchestrator } from './telegram/telegramHandler';
import * as cp from 'child_process';
import * as util from 'util';

const execAsync = util.promisify(cp.exec);

export class LoopOrchestrator implements ILoopOrchestrator {
    private lastError: string | null = null;
    private state: LoopExecutionState = LoopExecutionState.IDLE;
    private isPaused = false;
    private sessionStartTime = 0;
    private lastStatusUpdate = 0;

    private readonly ui: UIManager;
    private readonly taskRunner: TaskRunner;
    private readonly fileWatchers = new FileWatcherManager();
    private readonly countdownTimer = new CountdownTimer();
    private readonly inactivityMonitor = new InactivityMonitor();

    // Polling interval handle
    private pollingInterval: NodeJS.Timeout | undefined;

    private readonly telegramHandler: TelegramHandler;

    private confirmationResolver?: (approved: boolean) => void;
    private pendingExecCommand: { command: string, chatId?: string } | null = null;

    private isTransitioning = false;

    constructor(statusBar: RalphStatusBar) {
        this.ui = new UIManager(statusBar);
        this.taskRunner = new TaskRunner();
        this.lastStatusUpdate = Date.now();

        this.taskRunner.setLogCallback((message, highlight) => {
            this.ui.addLog(message, highlight);
        });

        this.telegramHandler = new TelegramHandler(this);
        // Start background polling for Telegram if enabled
        this.telegramHandler.startPolling();
    }

    setPanel(panel: IRalphUI | null): void {
        this.ui.setPanel(panel);
        if (panel) {
            const status = this.telegramHandler.getLastStatus();
            if (status) {
                panel.updateTelegramStatus(status);
            }
        }
    }

    setSidebarView(view: IRalphUI): void {
        this.ui.setSidebarView(view);
        const status = this.telegramHandler.getLastStatus();
        if (status) {
            view.updateTelegramStatus(status);
        }
    }

    setRequirements(requirements: TaskRequirements): void {
        this.taskRunner.setRequirements(requirements);
    }

    getRequirements(): TaskRequirements {
        return this.taskRunner.getRequirements();
    }

    setSettings(settings: RalphSettings): void {
        this.taskRunner.setSettings(settings);
    }

    getSettings(): RalphSettings {
        return this.taskRunner.getSettings();
    }

    async startLoop(): Promise<void> {
        if (this.isTransitioning) {
            this.ui.addLog('Operation in progress, please wait...');
            return;
        }
        if (this.state === LoopExecutionState.RUNNING) {
            this.ui.addLog('Loop is already running');
            return;
        }

        this.isTransitioning = true;
        try {
            const stats = await getTaskStatsAsync();
            if (stats.pending === 0) {
                this.ui.addLog('No pending tasks found. Add tasks to PRD.md first.');
                vscode.window.showInformationMessage('Ralph: No pending tasks found in PRD.md');
                return;
            }

            // Ensure progress.txt exists
            await ensureProgressFileAsync();

            this.taskRunner.clearHistory();
            this.ui.clearLogs();
            this.ui.updateHistory([]);

            this.state = LoopExecutionState.RUNNING;
            this.isPaused = false;
            this.taskRunner.resetIterations();
            this.sessionStartTime = Date.now();
            this.lastStatusUpdate = Date.now();

            await this.ui.updateStats();

            // Quick poll for Telegram messages when loop starts
            // Avoid awaiting here to not block loop startup, but initiate poll
            this.telegramHandler.poll(false);

            this.ui.addLog('🚀 Starting Ralph loop...');
            await this.notifyTelegram('<b>Ralph loop started.</b>');
            await this.updatePanelTiming();
            this.ui.updateStatus('running', this.taskRunner.getIterationCount(), this.taskRunner.getCurrentTask());

            await this.setupWatchers();
            await this.runNextTask();
        } finally {
            this.isTransitioning = false;
        }
    }

    pauseLoop(): void {
        if (this.state !== LoopExecutionState.RUNNING) { return; }

        this.isPaused = true;
        this.fileWatchers.prdWatcher.disable();
        this.inactivityMonitor.pause();
        this.countdownTimer.stop();

        this.ui.addLog('Loop paused');
        this.notifyTelegram('<b>Ralph loop paused.</b>').catch(() => { });
        this.ui.updateStatus('paused', this.taskRunner.getIterationCount(), this.taskRunner.getCurrentTask());

        // Poll Telegram when paused to pick up any remote commands
        this.telegramHandler.poll();
    }

    resumeLoop(): void {
        if (!this.isPaused) { return; }

        this.isPaused = false;
        this.inactivityMonitor.resume();
        this.ui.addLog('Loop resumed');
        this.notifyTelegram('<b>Ralph loop resumed.</b>').catch(() => { });
        this.ui.updateStatus('running', this.taskRunner.getIterationCount(), this.taskRunner.getCurrentTask());

        // Poll Telegram after resume
        this.telegramHandler.poll();
        this.runNextTask();
    }

    async stopLoop(): Promise<void> {
        if (this.isTransitioning) {
            this.ui.addLog('Operation in progress, please wait...');
            return; // Or maybe queue it?
        }

        this.isTransitioning = true;
        try {
            this.fileWatchers.dispose();
            this.countdownTimer.stop();
            this.inactivityMonitor.stop();

            this.state = LoopExecutionState.IDLE;
            this.isPaused = false;

            this.ui.updateStatus('idle', this.taskRunner.getIterationCount(), this.taskRunner.getCurrentTask());
            this.ui.updateCountdown(0);

            this.ui.updateSessionTiming(0, this.taskRunner.getTaskHistory(), 0);
            await this.ui.updateStats();

            // Poll Telegram when loop stops
            await this.telegramHandler.poll(false);
            await this.notifyTelegram('<b>Ralph loop stopped.</b>');
        } finally {
            this.isTransitioning = false;
        }
    }

    async runSingleStep(): Promise<void> {
        if (this.state === LoopExecutionState.RUNNING) {
            this.ui.addLog('Cannot run single step while loop is running');
            return;
        }

        const task = await getNextTaskAsync();
        if (!task) {
            this.ui.addLog('No pending tasks');
            vscode.window.showInformationMessage('Ralph: No pending tasks in PRD.md');
            return;
        }

        if (this.taskRunner.checkIterationLimit()) { return; }

        this.taskRunner.incrementIteration();
        this.taskRunner.setCurrentTask(task.description);
        this.ui.addLog(`Single step: ${task.description}`);

        // Quick poll to pick up remote commands before running single step
        this.telegramHandler.poll();

        await this.taskRunner.triggerCopilotAgent(task.description);
    }

    async generatePrdFromDescription(taskDescription: string): Promise<void> {
        const root = getWorkspaceRoot();
        if (!root) {
            vscode.window.showErrorMessage('Ralph: No workspace folder open');
            return;
        }

        this.ui.showPrdGenerating();
        this.setupPrdCreationWatcher();
        await this.taskRunner.triggerPrdGeneration(taskDescription);
    }

    async showStatus(stream: vscode.ChatResponseStream): Promise<void> {
        const taskStats = await getTaskStatsAsync();
        const task = await getNextTaskAsync();
        const prd = await readPRDAsync();
        const settings = this.taskRunner.getSettings();

        stream.markdown('## Ralph Status\n\n');

        if (!prd) {
            stream.markdown('**No PRD found.** Run `@ralph /init` to create template files.\n');
            return;
        }

        stream.markdown(`**State:** ${this.state}\n`);
        stream.markdown(`**Tasks:** ${taskStats.completed}/${taskStats.total} complete\n`);
        stream.markdown(`**Iterations:** ${this.taskRunner.getIterationCount()}${settings.maxIterations > 0 ? ` / ${settings.maxIterations}` : ''}\n\n`);

        if (task) {
            stream.markdown(`**Next Task:** ${task.description}\n`);
        } else if (taskStats.total > 0) {
            stream.markdown('**All tasks completed!**\n');
        }
    }

    dispose(): void {
        this.telegramHandler.stopPolling();
        this.stopLoop();
    }

    private async setupWatchers(): Promise<void> {
        const initialContent = await readPRDAsync() || '';

        this.fileWatchers.prdWatcher.start(initialContent, (newContent) => {
            this.handlePrdChange(newContent);
        });
        this.ui.addLog('👁️ Watching PRD.md for task completion...');

        this.fileWatchers.activityWatcher.start(() => {
            this.inactivityMonitor.recordActivity();
            // Check Telegram for any quick messages when activity occurs      
            this.telegramHandler.poll();
        });

        this.inactivityMonitor.start(() => this.handleInactivity());
    }

    private setupPrdCreationWatcher(): void {
        this.fileWatchers.prdCreationWatcher.start(async () => {
            this.ui.addLog('PRD.md created successfully!', true);
            await this.ui.refresh();
            this.fileWatchers.prdCreationWatcher.dispose();
            vscode.window.showInformationMessage('Ralph: PRD.md created! Click Start to begin.');
        });
        this.ui.addLog('👁️ Watching for PRD.md creation...');
    }

    private async runNextTask(): Promise<void> {
        if (this.state !== LoopExecutionState.RUNNING || this.isPaused) {
            return;
        }

        const stats = await getTaskStatsAsync();

        if (stats.pending === 0) {
            this.ui.addLog('🎉 All tasks completed!', true);
            this.stopLoop();
            vscode.window.showInformationMessage('Ralph: All PRD tasks completed! 🎉');
            await this.notifyTelegram('🎉 <b>All PRD tasks completed!</b>');
            return;
        }

        const task = await getNextTaskAsync();
        if (!task) {
            this.ui.addLog('No more tasks to process');
            this.stopLoop();
            return;
        }

        if (this.taskRunner.checkIterationLimit()) {
            this.stopLoop();
            return;
        }

        const iteration = this.taskRunner.incrementIteration();
        this.taskRunner.setCurrentTask(task.description);
        this.ui.setIteration(iteration);
        this.ui.setTaskInfo(task.description);
        this.ui.updateStatus('running', iteration, task.description);

        this.ui.addLog(`Task ${iteration}: ${task.description}`);
        await this.taskRunner.triggerCopilotAgent(task.description);

        this.fileWatchers.prdWatcher.enable();
        this.inactivityMonitor.setWaiting(true);
        this.ui.updateStatus('waiting', iteration, task.description);
        this.ui.addLog('Waiting for Copilot to complete and update PRD.md...');
    }

    private async handlePrdChange(newContent: string): Promise<void> {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        try {
            // Check if PRD is fully written (sometimes file events fire on partial writes)
            if (!newContent.trim()) return;

            this.ui.addLog('📝 PRD.md changed - checking task status...');
            // Poll Telegram immediately on PRD changes (non-blocking)
            this.telegramHandler.poll();
            this.inactivityMonitor.recordActivity();
            this.fileWatchers.prdWatcher.updateContent(newContent);

            // "Start new chat dialog" is an actual VS Code UI dialog caused by launching a new chat while unaccepted edits remain.
            // Handled automatically before updating todo.

            const task = await getNextTaskAsync();
            const currentTask = this.taskRunner.getCurrentTask();

            if (!task || task.description !== currentTask) {

                this.fileWatchers.prdWatcher.disable();
                this.inactivityMonitor.stop();

                const completion = this.taskRunner.recordTaskCompletion();

                // Append to progress.txt
                const progressEntry = `✅ Completed: ${completion.taskDescription} (took ${Math.round(completion.duration / 1000)}s)`;
                await appendProgressAsync(progressEntry);

                // Send Telegram notification about task completion and updated progress
                try {
                    const stats = await getTaskStatsAsync();
                    const progressText = `${stats.completed}/${stats.total} complete`;
                    await this.notifyTelegram(`✅ <b>Task completed:</b> <i>${TelegramBot.escapeHtml(completion.taskDescription)}</i> (took ${Math.round(completion.duration / 1000)}s). <b>Progress:</b> ${progressText}`, undefined, true);
                } catch (err) {
                    // ignore telegram notification failures
                }

                this.ui.updateHistory(this.taskRunner.getTaskHistory());
                await this.updatePanelTiming();

                await this.startCountdown();
            }
        } catch (error) {
            logError('Error handling PRD change', error);
            this.ui.addLog('Error processing PRD change');
            try {
                this.lastError = String(error);
                await this.notifyTelegram(`<b>Error processing PRD change:</b>\n<pre>${TelegramBot.escapeHtml(String(error))}</pre>`);
            } catch (err) {
                // swallow
            }
        } finally {
            this.isTransitioning = false;
        }
    }

    private async handleInactivity(): Promise<void> {
        this.ui.addLog('⚠️ No file activity detected for 60 seconds...');

        this.ui.addLog(`⚠️ Detected possible Copilot stuck state`);
        const recentLogs = await this.ui.getRecentChatLogs(15);
        const escapedLogs = recentLogs.map((line) => TelegramBot.escapeHtml(line)).join('\n');
        const truncatedLogs = escapedLogs.length > 3600 ? escapedLogs.substring(escapedLogs.length - 3600) : escapedLogs;
        const recentLogText = truncatedLogs.length > 0
            ? `\n\n<b>Last 15 chat lines:</b>\n<pre>${truncatedLogs}</pre>`
            : '';
        this.lastError = 'Agent stuck (inactivity)';

        // Stuck resolution keyboard
        const stuckKeyboard = {
            inline_keyboard: [
                [
                    { text: '💬 "Yes, continue"', callback_data: '/continue' },
                    { text: '📝 "Mark Done"', callback_data: '/mark_done' }
                ],
                [
                    { text: '🔄 Retry Task', callback_data: '/retry' },
                    { text: '⏭️ Skip Task', callback_data: '/skip' }
                ]
            ]
        };

        await this.notifyTelegram(
            `⚠️ <b>Agent appears stuck</b> while processing task "<i>${TelegramBot.escapeHtml(this.taskRunner.getCurrentTask() || 'unknown')}</i>".${recentLogText}\n\nChoose an action:`,
            undefined,
            false,
            stuckKeyboard as any
        );

        const action = await vscode.window.showWarningMessage(
            `Ralph: No file changes detected for 60 seconds. Is Copilot still working on the task?`,
            'Continue Waiting',
            'Retry Task',
            'Skip Task',
            'Stop Loop'
        );

        switch (action) {
            case 'Continue Waiting':
                this.ui.addLog('Continuing to wait...');
                this.inactivityMonitor.start(() => this.handleInactivity());
                break;
            case 'Retry Task':
                this.ui.addLog('Retrying current task...');
                this.fileWatchers.prdWatcher.disable();
                await this.runNextTask();
                break;
            case 'Skip Task':
                this.ui.addLog('Skipping to next task...');
                this.fileWatchers.prdWatcher.disable();
                this.taskRunner.setCurrentTask('');
                await this.startCountdown();
                break;
            case 'Stop Loop':
                this.stopLoop();
                break;
            default:
                this.inactivityMonitor.start(() => this.handleInactivity());
        }
    }

    private async startCountdown(): Promise<void> {
        this.ui.addLog(`Starting next task in ${REVIEW_COUNTDOWN_SECONDS} seconds...`);

        await this.countdownTimer.start(REVIEW_COUNTDOWN_SECONDS, (remaining) => {
            this.ui.updateCountdown(remaining);
        });

        // Loop until there has been NO file activity for 10 seconds.
        // This ensures Copilot has fully finished generating files (e.g. progress.txt)
        // after it might have checked the task in PRD.md
        while (Date.now() - this.inactivityMonitor.getLastActivityTime() < 10000) {
            if (this.state !== LoopExecutionState.RUNNING || this.isPaused) {
                break;
            }
            this.ui.addLog('⏳ Waiting for agent to finish writing files...');
            await new Promise(r => setTimeout(r, 2000));
        }

        if (this.state === LoopExecutionState.RUNNING && !this.isPaused) {
            await this.ui.updateStats();
            await this.runNextTask();
        }
    }

    private async updatePanelTiming(): Promise<void> {
        const stats = await getTaskStatsAsync();
        this.ui.updateSessionTiming(this.sessionStartTime, this.taskRunner.getTaskHistory(), stats.pending);
    }

    public async notifyTelegram(message: string, chatId?: string, isVerbose: boolean = false, customKeyboard?: any): Promise<void> {
        //if (!isVerbose && this.telegramHandler.isNotificationsMuted()) return;

        if (this.telegramHandler.isEnabled()) {
            try {
                const keyboard = customKeyboard || this.getInlineKeyboard();
                await this.telegramHandler.notify(message, chatId, false, keyboard);
            } catch (err) {
                this.ui.addLog(`Telegram notification failed: ${err}`);
            }
        }
    }

    private getInlineKeyboard() {
        const keyboard = [];

        if (this.state === LoopExecutionState.WAITING_FOR_CONFIRMATION) {
            keyboard.push([
                { text: '✅ Approve', callback_data: '/approve' },
                { text: '❌ Reject', callback_data: '/reject' }
            ]);
        } else if (this.state === LoopExecutionState.RUNNING) {
            if (this.isPaused) {
                keyboard.push([
                    { text: '▶️ Resume', callback_data: '/resume' },
                    { text: '⏹️ Stop', callback_data: '/stop' }
                ]);
            } else {
                keyboard.push([
                    { text: '⏸️ Pause', callback_data: '/pause' },
                    { text: '📊 Stats', callback_data: '/status' }
                ]);
            }
        } else {
            // IDLE
            keyboard.push([
                { text: '▶️ Start', callback_data: '/start' },
                { text: '📊 Stats', callback_data: '/status' }
            ]);
        }

        return { inline_keyboard: keyboard };
    }

    // Handler for Telegram commands (edge-case intervention)
    public async handleGenericTelegramCommand(cmd: string, chatId?: string): Promise<void> {
        if (/(stuck|reset)/i.test(cmd)) {
            this.ui.addLog('Telegram: Stuck counter reset.');
            await this.notifyTelegram('Stuck counter reset', chatId);
        } else if (/ambiguous/i.test(cmd)) {
            this.ui.addLog('Telegram: Ambiguous counter reset.');
            await this.notifyTelegram('Ambiguous counter reset', chatId);
        } else if (/^\/mute$/i.test(cmd)) {
            this.telegramHandler.setMuted(true);
            this.ui.addLog('Telegram: Muted verbose notifications.');
            await this.notifyTelegram('Verbose notifications muted. You will only receive important updates.', chatId);
        } else if (/^\/unmute$/i.test(cmd)) {
            this.telegramHandler.setMuted(false);
            this.ui.addLog('Telegram: Unmuted verbose notifications.');
            await this.notifyTelegram('Verbose notifications unmuted. You will receive all updates.', chatId);
        } else if (/^\/status|\/stats/i.test(cmd) || /status|stats/i.test(cmd)) {
            // Gather session stats
            this.lastStatusUpdate = Date.now();
            const message = await this.getSessionStatsMessage();
            await this.notifyTelegram(message, chatId);
            this.ui.addLog('Telegram: Session stats sent.');
        } else if (/^\/exec\s+(.*)$/i.test(cmd)) {
            const m = cmd.match(/^\/exec\s+(.*)$/i);
            const execCmd = m ? m[1].trim() : '';

            if (this.pendingExecCommand) {
                await this.notifyTelegram('⚠️ Another command is already pending confirmation. Use /cancel_exec or /confirm_exec first.', chatId);
                return;
            }

            if (execCmd) {
                this.pendingExecCommand = { command: execCmd, chatId };
                const keyboard = {
                    inline_keyboard: [[
                        { text: '✅ Run', callback_data: '/confirm_exec' },
                        { text: '❌ Cancel', callback_data: '/cancel_exec' }
                    ]]
                };
                const escaped = TelegramBot.escapeHtml(execCmd);
                await this.telegramHandler.notify(
                    `⚠️ <b>Confirm Execution:</b>\nRunning the following shell command:\n<pre>${escaped}</pre>`,
                    chatId,
                    false,
                    keyboard
                );
            } else {
                await this.notifyTelegram('Usage: /exec <command>', chatId);
            }
        } else if (/^\/confirm_exec$/i.test(cmd)) {
            if (this.pendingExecCommand) {
                const { command, chatId: originChatId } = this.pendingExecCommand;
                this.pendingExecCommand = null;

                await this.notifyTelegram(`🚀 Executing: <code>${TelegramBot.escapeHtml(command)}</code>`, originChatId);
                this.ui.addLog(`Telegram: Executing shell command: ${command}`);

                try {
                    const { stdout, stderr } = await execAsync(command, {
                        cwd: getWorkspaceRoot() || undefined,
                        timeout: 30000, // 30s timeout
                        maxBuffer: 1024 * 1024 * 2 // 2MB buffer
                    });

                    let output = '';
                    if (stdout) { output += `<b>STDOUT:</b>\n<pre>${TelegramBot.escapeHtml(stdout.trim())}</pre>\n`; }
                    if (stderr) { output += `<b>STDERR:</b>\n<pre>${TelegramBot.escapeHtml(stderr.trim())}</pre>`; }

                    if (!output) { output = '<i>Command executed successfully with no output.</i>'; }

                    // Truncate if too long
                    if (output.length > 4000) {
                        output = output.substring(0, 4000) + '\n... (truncated)';
                    }

                    await this.notifyTelegram(output, originChatId);
                } catch (error: any) {
                    const errStr = TelegramBot.escapeHtml(error.message || String(error));
                    await this.notifyTelegram(`❌ <b>Execution Failed:</b>\n<pre>${errStr}</pre>`, originChatId);
                }
            } else {
                await this.notifyTelegram('No pending execution command found.', chatId);
            }
        } else if (/^\/cancel_exec$/i.test(cmd)) {
            if (this.pendingExecCommand) {
                this.pendingExecCommand = null;
                await this.notifyTelegram('🚫 Execution cancelled.', chatId);
            } else {
                await this.notifyTelegram('No pending execution command to cancel.', chatId);
            }
        } else if (/^\/log(?:\s+(\d+))?$/i.test(cmd)) {
            const match = cmd.match(/^\/log(?:\s+(\d+))?$/i);
            const count = match && match[1] ? parseInt(match[1], 10) : 15;
            const logs = await this.ui.getRecentChatLogs(count);
            if (logs.length === 0) {
                await this.notifyTelegram('No logs available.', chatId);
            } else {
                const escapedLogs = logs.map(l => TelegramBot.escapeHtml(l)).join('\n');
                const truncatedLogs = escapedLogs.length > 3600 ? escapedLogs.substring(escapedLogs.length - 3600) : escapedLogs;
                const logMessage = `<b>Last ${logs.length} log lines:</b>\n<pre>${truncatedLogs}</pre>`;
                // Another, final truncate to avoid Telegram message length limits
                const truncated = logMessage.length > 4000 ? logMessage.substring(0, 4000) : logMessage;
                await this.notifyTelegram(truncated, chatId);
            }
            this.ui.addLog(`Telegram: Sent last ${logs.length} log lines.`);
        } else if (/^\/list$/i.test(cmd)) {
            const tasks = await parseTasksAsync();
            const pendingTasks = tasks.filter(t => t.status === TaskStatus.PENDING || t.status === TaskStatus.IN_PROGRESS);

            if (pendingTasks.length === 0) {
                await this.notifyTelegram('No pending tasks found in PRD.md.', chatId);
            } else {
                let message = `<b>Pending Tasks (${pendingTasks.length}):</b>\n\n`;
                pendingTasks.forEach((t, i) => {
                    const icon = t.status === TaskStatus.IN_PROGRESS ? '🚧 ' : '';
                    message += `${i + 1}. ${icon}${TelegramBot.escapeHtml(t.description)}\n`;
                });

                // Truncate if too long (Telegram limit ~4096)
                if (message.length > 4000) {
                    message = message.substring(0, 4000) + '\n... (truncated)';
                }

                await this.notifyTelegram(message, chatId);
            }
            this.ui.addLog('Telegram: Listed pending tasks.');
        } else if (/^\/skip$/i.test(cmd)) {
            if (this.state === LoopExecutionState.RUNNING) {
                this.fileWatchers.prdWatcher.disable();
                this.taskRunner.setCurrentTask('');
                this.ui.addLog('Telegram: Skipping to next task...');
                await this.notifyTelegram('<i>Skipping to the next task...</i>', chatId);
                await this.startCountdown();
            } else {
                await this.notifyTelegram('No active task to skip.', chatId);
            }
        } else if (/^\/retry$/i.test(cmd)) {
            if (this.state === LoopExecutionState.RUNNING && this.taskRunner.getCurrentTask()) {
                this.fileWatchers.prdWatcher.disable();
                this.ui.addLog('Telegram: Retrying current task...');
                await this.notifyTelegram('<i>Retrying current task...</i>', chatId);
                await this.runNextTask();
            } else {
                await this.notifyTelegram('No active task to retry.', chatId);
            }
        } else if (/stop/i.test(cmd)) {
            await this.stopLoop();
            await this.notifyTelegram('<b>Loop stopped by Telegram command.</b>', chatId);
            this.ui.addLog('Telegram: Loop stopped.');
        } else if (/^\/ls(\s+.*)?$/i.test(cmd)) {
            const m = cmd.match(/^\/ls\s+(.*)$/i);
            const pathArg = m ? m[1].trim() : '.';

            this.ui.addLog(`Telegram: Listing directory ${pathArg}`);
            try {
                const entries = await listDirectoryContentsAsync(pathArg);
                if (entries === null) {
                    await this.notifyTelegram(`❌ Directory not found or not a directory: ${TelegramBot.escapeHtml(pathArg)}`, chatId);
                } else if (entries.length === 0) {
                    await this.notifyTelegram(`📂 Directory is empty: ${TelegramBot.escapeHtml(pathArg)}`, chatId);
                } else {
                    entries.sort((a, b) => {
                        if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
                        return a.isDirectory ? -1 : 1;
                    });

                    const lines = entries.map(e => {
                        const icon = e.isDirectory ? '📁' : '📄';
                        return `${icon} ${TelegramBot.escapeHtml(e.name)}`;
                    });

                    let chunks: string[] = [];
                    let currentChunk = `<b>📂 Contents of ${TelegramBot.escapeHtml(pathArg)}:</b>\n\n`;

                    for (const line of lines) {
                        if (currentChunk.length + line.length > 3000) {
                            chunks.push(currentChunk);
                            currentChunk = line + '\n';
                        } else {
                            currentChunk += line + '\n';
                        }
                    }
                    if (currentChunk) chunks.push(currentChunk);

                    for (const chunk of chunks) {
                        await this.notifyTelegram(chunk, chatId);
                        if (chunks.length > 1) await new Promise(r => setTimeout(r, 200));
                    }
                }
            } catch (err) {
                await this.notifyTelegram(`Error listing directory: ${TelegramBot.escapeHtml(String(err))}`, chatId);
            }
        } else if (/^\/cat(\s+.*)?$/i.test(cmd)) {
            const m = cmd.match(/^\/cat\s+(.*)$/i);
            const pathArg = m ? m[1].trim() : '';

            // Security check for sensitive files
            if (pathArg.toLowerCase() === '.env' || pathArg.endsWith('/.env') || pathArg.endsWith('\\.env')) {
                await this.notifyTelegram('⚠️ Access denied to configuration files.', chatId);
                return;
            }

            if (!pathArg) {
                await this.notifyTelegram('Usage: /cat <path> — show file content', chatId);
            } else {
                this.ui.addLog(`Telegram: Reading file ${pathArg}`);
                try {
                    const content = await readFileAsync(pathArg);
                    if (content === null) {
                        await this.notifyTelegram(`❌ File not found: ${TelegramBot.escapeHtml(pathArg)}`, chatId);
                    } else {
                        const escaped = TelegramBot.escapeHtml(content);
                        // Telegram message limit is ~4096 chars
                        if (escaped.length < 3000) {
                            await this.notifyTelegram(`<b>File: ${TelegramBot.escapeHtml(pathArg)}</b>\n<pre>${escaped}</pre>`, chatId);
                        } else {
                            await this.notifyTelegram(`<b>File: ${TelegramBot.escapeHtml(pathArg)}</b> (Large file, sending in chunks...)`, chatId);

                            const chunkSize = 3000;
                            for (let i = 0; i < escaped.length; i += chunkSize) {
                                const chunk = escaped.substring(i, i + chunkSize);
                                await this.notifyTelegram(`<pre>${chunk}</pre>`, chatId);
                                // Prevent rate limiting issues
                                await new Promise(r => setTimeout(r, 300));
                            }
                        }
                    }
                } catch (err) {
                    await this.notifyTelegram(`Error reading file: ${TelegramBot.escapeHtml(String(err))}`, chatId);
                }
            }
        } else if (/^\/add(\s+.*)?$/i.test(cmd)) {
            const m = cmd.match(/^\/add\s+(.*)$/i);
            const taskDesc = m ? m[1].trim() : '';

            if (!taskDesc) {
                await this.notifyTelegram('Usage: /add <task description>', chatId);
            } else {
                this.ui.addLog(`Telegram: Adding new task to PRD: "${taskDesc}"`);
                try {
                    const success = await appendTaskToPrdAsync(taskDesc);
                    if (success) {
                        await this.notifyTelegram(`✅ Added task to PRD: "<b>${TelegramBot.escapeHtml(taskDesc)}</b>"`, chatId);
                    } else {
                        await this.notifyTelegram('❌ Failed to add task: PRD.md not found or "## Tasks" section missing.', chatId);
                    }
                } catch (err) {
                    await this.notifyTelegram(`Error adding task: ${TelegramBot.escapeHtml(String(err))}`, chatId);
                }
            }
        } else if (/^\/help$/i.test(cmd)) {
            const helpMessage = `Available commands:
"/start" - Start Ralph session
"/pause" - Pause current session
"/stop" - Stop Ralph session
"/skip" - Skip current task and proceed to next
"/retry" - Retry the current task
"/approve" - Approve pending confirmation
"/reject" - Reject pending confirmation
"/status" or "/stats" - Show session stats
"/chat <prompt>" - Send text to Copilot Chat
"/add <task>" - Append new task to PRD.md
"/mute" - Mute verbose notifications
"/unmute" - Unmute verbose notifications
"/list" - List all pending tasks
"/log <n>" - Show last n log lines
"/cat <path>" - Show file content
"/ls <path>" - List directory contents
"/help" - Show this message`;
            await this.notifyTelegram(helpMessage, chatId);
        } else {
            await this.notifyTelegram('Unknown command. Use /help to see available commands.', chatId);
        }
    }


    async waitForConfirmation(message: string): Promise<boolean> {
        if (!this.telegramHandler.isEnabled()) {
            return true; // Auto-approve if Telegram is disabled
        }

        const previousState = this.state;
        this.state = LoopExecutionState.WAITING_FOR_CONFIRMATION;
        this.ui.updateStatus('waiting_for_confirmation', this.taskRunner.getIterationCount(), this.taskRunner.getCurrentTask());
        this.ui.addLog(`Waiting for confirmation: ${message}`);

        await this.notifyTelegram(`⚠️ Confirmation required: ${message}`, undefined, true);

        // Poll more frequently while waiting
        const tempPollInterval = setInterval(() => {
            this.telegramHandler.poll(false, 1);
        }, 2000);

        return new Promise<boolean>((resolve) => {
            this.confirmationResolver = (approved: boolean) => {
                clearInterval(tempPollInterval);
                this.state = previousState;
                this.confirmationResolver = undefined;
                resolve(approved);
            };
        });
    }

    getLogCallback(): (message: string, highlight?: boolean) => void {
        return (message, highlight) => this.ui.addLog(message, highlight);
    }

    getState(): LoopExecutionState {
        return this.state;
    }

    getConfirmationResolver(): ((approved: boolean) => void) | undefined {
        return this.confirmationResolver;
    }

    public async getSessionStatsMessage(): Promise<string> {
        const stats = await getTaskStatsAsync();
        const currentTask = this.taskRunner.getCurrentTask();
        const elapsedMs = this.sessionStartTime ? Date.now() - this.sessionStartTime : 0;
        const elapsed = this.sessionStartTime ? `${Math.floor(elapsedMs / 60000)}m ${Math.floor((elapsedMs % 60000) / 1000)}s` : 'N/A';
        const state = this.state;
        const lastError = this.lastError || 'None';
        let message = `<b>Ralph Session Stats:</b>\n`;
        message += `<b>State:</b> ${state}\n`;
        message += `<b>Muted:</b> ${this.telegramHandler.isNotificationsMuted() ? 'Yes' : 'No'}\n`;
        message += `<b>Current Task:</b> <i>${TelegramBot.escapeHtml(currentTask || 'None')}</i>\n`;
        message += `<b>Progress:</b> ${stats.completed}/${stats.total} complete\n`;
        message += `<b>Elapsed Time:</b> ${elapsed}\n`;
        if (lastError !== 'None') {
            message += `<b>Last Error:</b>\n<pre>${TelegramBot.escapeHtml(lastError)}</pre>`;
        } else {
            message += `<b>Last Error:</b> None`;
        }
        return message;
    }

    public updateTelegramStatus(status: TelegramStatus): void {
        this.ui.updateTelegramStatus(status);
    }
}
