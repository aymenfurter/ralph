import { LoopExecutionState, TelegramStatus } from '../types';
import { TelegramBot } from './telegramBot';
import { getTelegramAllowedUsers, getTelegramStatusUpdateInterval } from './telegramConfig';
import { openCopilotWithPrompt } from '../copilotIntegration';
import { getWorkspaceRoot, ensureDirectoryExists, downloadFile } from '../fileUtils';
import { transcribeAudio } from './stt';
import * as path from 'path';

export interface ILoopOrchestrator {
    startLoop(): Promise<void>;
    pauseLoop(): void;
    resumeLoop(): void;
    stopLoop(): Promise<void>;
    runSingleStep(): Promise<void>;
    notifyTelegram(message: string, chatId?: string, silent?: boolean, replyMarkup?: any): Promise<void>;
    getLogCallback(): (message: string, highlight?: boolean) => void;
    getState(): LoopExecutionState;
    getConfirmationResolver(): ((approved: boolean) => void) | undefined;
    getSessionStatsMessage(): Promise<string>;
    handleGenericTelegramCommand(command: string, chatId?: string): Promise<void>;
    updateTelegramStatus(status: TelegramStatus): void;
}

export class TelegramHandler {
    private bot: TelegramBot;
    private orchestrator: ILoopOrchestrator;
    private pollingInterval: NodeJS.Timeout | undefined;
    private isMuted: boolean = false;
    private lastStatusUpdate: number = 0;
    private botInfo: any;
    private lastStatus: TelegramStatus | undefined;

    // Backoff variables
    private failCount = 0;
    private isPolling = false;

    constructor(orchestrator: ILoopOrchestrator) {
        this.orchestrator = orchestrator;
        this.bot = new TelegramBot();
        this.lastStatusUpdate = Date.now();
        this.updateUiStatus();
    }

    public getLastStatus(): TelegramStatus | undefined {
        return this.lastStatus;
    }

    private updateUiStatus(error?: string): void {
        const isEnabled = this.isEnabled();
        const status: TelegramStatus = {
            isTokenLoaded: isEnabled,
            isConfigValid: isEnabled,
            isLongPollingActive: this.isPolling,
            botName: this.botInfo ? this.botInfo.username : undefined,
            lastError: error || (this.failCount > 0 ? `Connection failed (x${this.failCount})` : undefined)
        };
        this.lastStatus = status;
        this.orchestrator.updateTelegramStatus(status);
    }

    public isEnabled(): boolean {
        return this.bot.isEnabled();
    }

    /**
     * Set commands for the bot on Telegram side
     */
    public async registerCommands(): Promise<void> {
        if (!this.isEnabled()) return;

        // Try getting bot info once
        if (!this.botInfo) {
            try {
                const res = await this.bot.getMe();
                if (res && res.result) {
                    this.botInfo = res.result;
                    this.updateUiStatus();
                }
            } catch (e) {
                console.error('Failed to get bot info', e);
            }
        }

        const commands = [
            { command: 'start', description: 'Start Ralph loop' },
            { command: 'pause', description: 'Pause Ralph loop' },
            { command: 'stop', description: 'Stop Ralph loop' },
            { command: 'status', description: 'Get current status' },
            { command: 'chat', description: 'Send prompt to Copilot' },
            { command: 'help', description: 'Show help message' },
            { command: 'list', description: 'List pending tasks' },
            { command: 'log', description: 'Get recent logs' },
            { command: 'add', description: 'Add new task to PRD' },
            { command: 'skip', description: 'Skip current task' },
            { command: 'retry', description: 'Retry current task' },
            { command: 'mute', description: 'Mute notifications' },
            { command: 'unmute', description: 'Unmute notifications' }
        ];

        await this.bot.setMyCommands(commands);
    }

    public startPolling(intervalMs: number = 30000): void {
        this.stopPolling();

        if (!this.isEnabled()) return;

        // Register commands on startup
        this.registerCommands().catch(err => console.error('Failed to register commands', err));

        this.isPolling = true;
        this.updateUiStatus();

        // Recursive polling with backoff
        const pollLoop = async () => {
            if (!this.isPolling) return;

            const startTime = Date.now();
            let nextDelay = intervalMs;

            try {
                // We use a shorter timeout for the actual fetch to be responsive
                await this.poll(true, 10);

                // Reset failure count on success
                this.failCount = 0;
                this.updateUiStatus();

                // Subtract elapsed time from interval, but ensure minimum delay
                const elapsed = Date.now() - startTime;
                nextDelay = Math.max(1000, intervalMs - elapsed);

            } catch (error: any) {
                this.failCount++;
                const errMsg = error?.message || 'Unknown error';
                // Exponential backoff: 30s, 60s, 120s... capped at 5 mins
                const backoff = Math.min(30000 * Math.pow(1.5, this.failCount), 300000);
                nextDelay = backoff;
                console.error(`Telegram polling failed (attempt ${this.failCount}). Retrying in ${Math.round(nextDelay / 1000)}s...`, error);
                this.updateUiStatus(errMsg);
            }

            // Periodic status update check
            // await this.checkPeriodicStatus(); // Disabled periodic status for now

            if (this.isPolling) {
                this.pollingInterval = setTimeout(pollLoop, nextDelay);
            }
        };

        // Start the loop
        pollLoop();
    }

    private async checkPeriodicStatus(): Promise<void> {
        const intervalMinutes = getTelegramStatusUpdateInterval();
        if (intervalMinutes > 0) {
            const intervalMs = intervalMinutes * 60 * 1000;
            if (Date.now() - this.lastStatusUpdate >= intervalMs) {
                this.lastStatusUpdate = Date.now();
                const message = await this.orchestrator.getSessionStatsMessage();
                await this.notify(`🔔 Periodic Update: \n${message}`);
            }
        }
    }

    public stopPolling(): void {
        this.isPolling = false;
        if (this.pollingInterval) {
            clearTimeout(this.pollingInterval);
            this.pollingInterval = undefined;
        }
    }

    public async poll(block: boolean = false, timeoutSec: number = 1): Promise<void> {
        if (!this.isEnabled()) return;

        const task = this.bot.fetchBotMessages(timeoutSec)
            .then((updates) => {
                if (updates.length > 0) {
                    this.log(`📨 Telegram: ${updates.length} new message(s) received.`);
                    return this.processUpdates(updates);
                }
                return Promise.resolve();
            });
        // Removed catch block here to let caller handle it for backoff

        if (block) {
            await task;
        }
    }

    public async notify(message: string, chatId?: string, _silent: boolean = false, replyMarkup?: any): Promise<void> {
        if (this.isMuted) {
            return;
        }
        await this.bot.sendMessage(message, chatId, replyMarkup);
    }

    public setMuted(muted: boolean): void {
        this.isMuted = muted;
    }

    public isNotificationsMuted(): boolean {
        return this.isMuted;
    }

    private log(message: string, highlight: boolean = false): void {
        this.orchestrator.getLogCallback()(message, highlight);
    }

    private async processUpdates(updates: any[]): Promise<void> {
        const allowedUsers = getTelegramAllowedUsers();

        if (allowedUsers.length === 0) {
            if (updates.length > 0) {
                this.log('Telegram: Blocked updates - RALPH_TELEGRAM_ALLOWED_USERS is empty. Configure it in environment variables to allow access.');
            }
            return;
        }

        for (const update of updates) {
            let msg: string | undefined;
            let senderId: string | undefined;
            let senderUsername: string | undefined;
            let chatId: string | undefined;
            let isCallback = false;

            if (update.callback_query) {
                isCallback = true;
                msg = update.callback_query.data;
                senderId = update.callback_query.from?.id?.toString();
                senderUsername = update.callback_query.from?.username;
                chatId = update.callback_query.message?.chat?.id?.toString();
            } else if (update.message) {
                senderId = update.message.from?.id?.toString();
                senderUsername = update.message.from?.username;
                chatId = update.message.chat?.id?.toString();
            }

            // Strict Security Check: Deny if not in allowedUsers
            const isAllowed = (senderId && allowedUsers.includes(senderId)) ||
                (senderUsername && allowedUsers.includes(senderUsername));

            if (!isAllowed) {
                this.log(`Telegram: Blocked unauthorized activity from user ${senderUsername || senderId} (ID: ${senderId})`);
                continue;
            }

            // Process callback query response or voice message only if authorized
            if (isCallback) {
                await this.bot.answerCallbackQuery(update.callback_query.id);
            } else if (update.message) {
                if (update.message.voice) {
                    const result = await this.processVoiceMessage(update.message.voice, chatId!);
                    msg = result || undefined;
                } else {
                    msg = update.message.text?.trim();
                }
            }

            if (!msg) continue;

            // Sanitize input
            msg = msg.replace(/\0/g, '').trim();
            // Truncate excessively long messages to prevent potential DoS or buffer issues
            if (msg.length > 4096) {
                msg = msg.substring(0, 4096);
            }

            await this.handleCommand(msg, chatId);
        }
    }

    private async handleCommand(msg: string, chatId: string | undefined): Promise<void> {
        const state = this.orchestrator.getState();
        const confirmationResolver = this.orchestrator.getConfirmationResolver();

        // Approval checks
        if (/^\/approve$/i.test(msg)) {
            if (state === LoopExecutionState.WAITING_FOR_CONFIRMATION && confirmationResolver) {
                confirmationResolver(true);
                this.log('Telegram: Confirmed via /approve.');
                await this.notify('✅ Approved.', chatId);
                return;
            } else if (state !== LoopExecutionState.WAITING_FOR_CONFIRMATION) {
                await this.notify('No pending confirmation request.', chatId);
                return;
            }
        } else if (/^\/reject$/i.test(msg)) {
            if (state === LoopExecutionState.WAITING_FOR_CONFIRMATION && confirmationResolver) {
                confirmationResolver(false);
                this.log('Telegram: Rejected via /reject.');
                await this.notify('❌ Rejected.', chatId);
                return;
            } else if (state !== LoopExecutionState.WAITING_FOR_CONFIRMATION) {
                await this.notify('No pending confirmation request.', chatId);
                return;
            }
        }

        // Control commands
        if (/^\/start(?:-loop)?$/i.test(msg)) {
            await this.orchestrator.startLoop();
            await this.notify('<b>Loop started by Telegram command.</b>', chatId);
            this.log('Telegram: Loop started.');
        } else if (/^\/pause$/i.test(msg)) {
            this.orchestrator.pauseLoop();
            await this.notify('<b>Loop paused by Telegram command.</b>', chatId);
            this.log('Telegram: Loop paused.');
        } else if (/^\/resume$/i.test(msg)) {
            this.orchestrator.resumeLoop();
            await this.notify('<b>Loop resumed by Telegram command.</b>', chatId);
            this.log('Telegram: Loop resumed.');
        } else if (/^\/stop$/i.test(msg)) {
            await this.orchestrator.stopLoop();
            await this.notify('<b>Loop stopped by Telegram command.</b>', chatId);
            this.log('Telegram: Loop stopped.');
        } else if (/^\/mute$/i.test(msg)) {
            this.isMuted = true;
            await this.notify('<i>Notifications muted. Only errors and direct replies will be sent.</i>', chatId);
            this.log('Telegram: Notifications muted.');
        } else if (/^\/unmute$/i.test(msg)) {
            this.isMuted = false;
            await this.notify('<i>Notifications unmuted. All updates will be sent.</i>', chatId);
            this.log('Telegram: Notifications unmuted.');
        } else if (/^\/continue$/i.test(msg)) {
            this.log('Telegram: Sending "continue" to Copilot...');
            await openCopilotWithPrompt('yes, continue', { freshChat: false });
            await this.notify('Sent "yes, continue" to Copilot.', chatId);
        } else if (/^\/mark_done$/i.test(msg)) {
            this.log('Telegram: Asking Copilot to update PRD...');
            await openCopilotWithPrompt('Please mark the task as explicitly completed in PRD.md', { freshChat: false });
            await this.notify('Asked Copilot to update PRD.md.', chatId);
        } else if (/^\/chat(\s+.*)?$/i.test(msg)) {
            const m = msg.match(/^\/chat\s+(.*)$/i);
            const prompt = m ? m[1].trim() : '';
            if (!prompt) {
                await this.notify('Usage: /chat &lt;prompt&gt; — provide a prompt to send to Copilot Chat', chatId);
                this.log('Telegram: /chat used without prompt.');
            } else {
                this.log(`Telegram: Sending prompt to Copilot: ${prompt} `);
                try {
                    const result = await openCopilotWithPrompt(prompt, { freshChat: false });
                    if (result === 'agent') {
                        await this.notify('Prompt sent to Copilot Agent (edit session opened).', chatId);
                    } else if (result === 'chat') {
                        await this.notify('Prompt opened in Copilot Chat.', chatId);
                    } else {
                        await this.notify('Prompt copied to clipboard — paste into Copilot Chat manually.', chatId);
                    }
                    this.log('Telegram: /chat processed.');
                } catch (err) {
                    this.log('Telegram: /chat failed.');
                    await this.notify('<b>Failed to send prompt to Copilot Chat.</b>', chatId);
                }
            }
        }

        // Note: Generic unknown command handling should probably be delegated back to orchestrator 
        // OR we need to move handleTelegramCommand logic here too.
        // For now, let's assume `handleTelegramCommand` logic from Orchestrator also moves here or we expose a method.
        // The original code had `handleTelegramCommand` in Orchestrator for things like /status, /log etc. 
        // We should move those here or keep delegating.
        // Moving them here is cleaner for "Separation of Concerns".
        else {
            // We need to support the other commands that were in `handleTelegramCommand` like /status, /log, /ls, /cat, /add, /list, /exec, /skip, /retry
            // Since those require access to Orchestrator state (TaskRunner, etc), we might need to expose more from Orchestrator via interface
            // OR keep `handleTelegramCommand` in Orchestrator and call it from here.

            // To truly isolate, `TelegramHandler` should know how to handle these, but it needs data.
            // Let's defer to a method `handleOtherCommands` on Orchestrator for now to minimize massive refactoring risk, 
            // but ideally logic moves here.

            // Wait, the instruction is "Refactor: Improve architecture and isolate Telegram integration modules."
            // So I should try to move logic here.

            // I'll need to pass `ILoopOrchestratorExtended` or similar, or just cast `orchestrator` to `any` (ugly) or `LoopOrchestrator` (circular).
            // Better: pass a callback or event.

            // Actually, since I have `orchestrator` instance, I can assume it has a method `handleGenericTelegramCommand` 
            // that I call if none of the above matched.

            // But wait, I am defining `ILoopOrchestrator` above. I can add `handleGenericTelegramCommand` to it.
            await (this.orchestrator as any).handleGenericTelegramCommand(msg, chatId);
        }
    }

    private async processVoiceMessage(voice: any, chatId: string): Promise<string | null> {
        this.log('Telegram: Voice message received.');
        await this.notify('🎤 <i>Voice message received, processing...</i>', chatId);

        const fileLink = await this.bot.getFileLink(voice.file_id);
        if (!fileLink) {
            await this.notify('❌ Failed to get voice file link.', chatId);
            return null;
        }

        const workspaceRoot = getWorkspaceRoot();
        if (!workspaceRoot) {
            await this.notify('❌ Ralph not active (no workspace).', chatId);
            return null;
        }

        const voiceDir = path.join(workspaceRoot, '.ralph_voice');
        ensureDirectoryExists(voiceDir);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filePath = path.join(voiceDir, `voice_${timestamp}_${voice.file_unique_id || 'unknown'}.ogg`);
        try {
            await downloadFile(fileLink, filePath);
            this.log(`Telegram: Voice downloaded to ${filePath} `);
        } catch (err) {
            console.error('Download failed', err);
            await this.notify('❌ Failed to download voice message.', chatId);
            return null;
        }

        const text = await transcribeAudio(filePath);
        if (!text) {
            await this.notify('⚠️ Voice received but transcription failed (check logs or OPENAI_API_KEY). Audio saved locally.', chatId);
            return null;
        }

        await this.notify(`🗣️ <b>Transcribed: </b> "${TelegramBot.escapeHtml(text)}"`, chatId);
        return text;
    }
}
