import * as vscode from 'vscode';

export type LoopStatus = 'idle' | 'running' | 'paused' | 'waiting' | 'waiting_for_confirmation';

export class RalphStatusBar {
    private statusItem: vscode.StatusBarItem;
    private status: LoopStatus = 'idle';
    private taskInfo: string = '';
    private iteration: number = 0;

    constructor() {
        this.statusItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.statusItem.command = 'ralph.showPanel';
        this.update();
        this.statusItem.show();
    }

    setStatus(status: LoopStatus): void {
        this.status = status;
        this.update();
    }

    setTaskInfo(info: string): void {
        this.taskInfo = info;
        this.update();
    }

    setIteration(n: number): void {
        this.iteration = n;
        this.update();
    }

    private update(): void {
        let icon: string;
        let text: string;
        let tooltip: string;

        switch (this.status) {
            case 'running':
                icon = '$(sync~spin)';
                text = `Ralph: Running #${this.iteration}`;
                tooltip = `Working on: ${this.taskInfo || 'Starting...'}\nClick to open control panel`;
                break;
            case 'paused':
                icon = '$(debug-pause)';
                text = 'Ralph: Paused';
                tooltip = 'Loop paused. Click to open control panel';
                break;
            case 'waiting':
                icon = '$(watch)';
                text = 'Ralph: Waiting';
                tooltip = `Waiting for you to accept changes\nTask: ${this.taskInfo}\nClick to open control panel`;
                break;
            default:
                icon = '$(rocket)';
                text = 'Ralph';
                tooltip = 'Click to open Ralph control panel';
        }

        this.statusItem.text = `${icon} ${text}`;
        this.statusItem.tooltip = tooltip;

        this.statusItem.backgroundColor = this.status === 'running'
            ? new vscode.ThemeColor('statusBarItem.warningBackground')
            : undefined;
    }

    dispose(): void {
        this.statusItem.dispose();
    }
}
