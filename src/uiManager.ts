import { RalphStatusBar, LoopStatus } from './statusBar';
import { TaskCompletion, IRalphUI, TelegramStatus } from './types';
import { log } from './logger';
import * as vscode from 'vscode';

export class UIManager {
    private panel: IRalphUI | null = null;
    private sidebarView: IRalphUI | null = null;
    private readonly statusBar: RalphStatusBar;
    private logs: string[] = [];

    constructor(statusBar: RalphStatusBar) {
        this.statusBar = statusBar;
    }

    setPanel(panel: IRalphUI | null): void {
        this.panel = panel;
    }

    setSidebarView(view: IRalphUI): void {
        this.sidebarView = view;
    }

    updateStatus(status: LoopStatus, iteration: number, currentTask: string): void {
        this.statusBar.setStatus(status);
        this.panel?.updateStatus(status, iteration, currentTask, []);
        this.sidebarView?.updateStatus(status, iteration, currentTask, []);
    }

    updateTelegramStatus(status: TelegramStatus): void {
        this.panel?.updateTelegramStatus(status);
        this.sidebarView?.updateTelegramStatus(status);
    }

    setIteration(iteration: number): void {
        this.statusBar.setIteration(iteration);
    }

    setTaskInfo(info: string): void {
        this.statusBar.setTaskInfo(info);
    }

    updateCountdown(seconds: number): void {
        this.panel?.updateCountdown(seconds);
        this.sidebarView?.updateCountdown(seconds);
    }

    updateHistory(history: TaskCompletion[]): void {
        this.panel?.updateHistory(history);
        this.sidebarView?.updateHistory(history);
    }

    updateSessionTiming(startTime: number, taskHistory: TaskCompletion[], pendingTasks: number): void {
        this.panel?.updateSessionTiming(startTime, taskHistory, pendingTasks);
        this.sidebarView?.updateSessionTiming(startTime, taskHistory, pendingTasks);
    }

    async updateStats(): Promise<void> {
        await this.panel?.updateStats();
        this.sidebarView?.updateStats();
    }

    async refresh(): Promise<void> {
        await this.panel?.refresh();
        this.sidebarView?.refresh();
    }

    showPrdGenerating(): void {
        this.panel?.showPrdGenerating();
        this.sidebarView?.showPrdGenerating();
    }

    addLog(message: string, highlight: boolean = false): void {
        log(message);
        this.logs.push(message);
        this.panel?.addLog(message, highlight);
        this.sidebarView?.addLog(message, highlight);
    }

    async getRecentChatLogs(count: number): Promise<string[]> {
        if (count <= 0) return [];
        try {
            // Try copying Copilot/Chat contents to clipboard. Some environments
            // may be slow to update the clipboard or the command may require
            // the chat view to be active. Retry a few times before falling back.
            const maxAttempts = 3;
            const retryDelayMs = 200;
            let text = '';
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                await vscode.commands.executeCommand('workbench.action.chat.copyAll');
                // Small delay to allow clipboard to be populated
                await new Promise(r => setTimeout(r, retryDelayMs));
                text = (await vscode.env.clipboard.readText()).trim();
                if (text.length > 0) break;
            }

            if (text.length > 0) {
                const copilotChatLog = text.split(/\r?\n/).filter(Boolean);
                return copilotChatLog.slice(-count);
            }

            // If clipboard is empty after retries, fall through to fallback below
        } catch (e) {
            // Fallback to logs stored in memory if clipboard access or chat copy fails.
            log(`getRecentChatLogs clipboard error: ${e}`);
        }
        // Fallback: return last messages from the in-memory UI logs. These are
        // not the full Copilot chat contents, but are useful when clipboard
        // access or the chat copy command isn't available.
        const start = Math.max(this.logs.length - count, 0);
        const fallback = this.logs.slice(start);
        if (fallback.length === 0) {
            return [`[No chat content available — fallback logs are empty]`];
        }
        // Mark lines to indicate this is a fallback.
        return fallback.map(l => `[FALLBACK] ${l}`);
    }

    clearLogs(): void {
        this.logs = [];
    }
}
