import { RalphStatusBar, LoopStatus } from './statusBar';
import { TaskCompletion, IRalphUI } from './types';
import { log } from './logger';

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

    getRecentLogs(count: number): string[] {
        if (count <= 0) {
            return [];
        }
        const startIndex = Math.max(this.logs.length - count, 0);
        return this.logs.slice(startIndex);
    }

    clearLogs(): void {
        this.logs = [];
    }
}
