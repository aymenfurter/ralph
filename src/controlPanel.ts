import * as vscode from 'vscode';
import { getTaskStatsAsync, getNextTaskAsync, readPRDAsync } from './fileUtils';
import { TaskCompletion, TaskRequirements, RalphSettings, IRalphUI } from './types';
import {
    getStyles,
    getClientScripts,
    getHeader,
    getControls,
    getSetupSection,
    getTimelineSection,
    getRequirementsSection,
    getTaskSection,
    getLogSection,
    getFooter,
    getSettingsOverlay,
    getLogo,
    getNonce,
    escapeHtml
} from './webview';

export type PanelEventType =
    | 'start'
    | 'stop'
    | 'pause'
    | 'resume'
    | 'next'
    | 'generatePrd'
    | 'requirementsChanged'
    | 'settingsChanged';

export interface PanelEventData {
    taskDescription?: string;
    requirements?: TaskRequirements;
    settings?: RalphSettings;
}

export type PanelEventHandler = (data?: PanelEventData) => void;

export class RalphPanel implements IRalphUI {
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];
    private isDisposed = false;

    private readonly eventHandlers = new Map<PanelEventType, Set<PanelEventHandler>>();

    private onDisposeCallback?: () => void;

    constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.initializeHtml();
        this.setupMessageHandler();
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }

    private async initializeHtml(): Promise<void> {
        this.panel.webview.html = await RalphPanel.generateHtmlAsync();
    }

    on(event: PanelEventType, handler: PanelEventHandler): vscode.Disposable {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event)!.add(handler);

        return {
            dispose: () => {
                this.eventHandlers.get(event)?.delete(handler);
            }
        };
    }

    private emit(event: PanelEventType, data?: PanelEventData): void {
        this.eventHandlers.get(event)?.forEach(handler => handler(data));
    }

    private setupMessageHandler(): void {
        this.panel.webview.onDidReceiveMessage(
            message => this.handleMessage(message),
            null,
            this.disposables
        );
    }

    private handleMessage(message: { command: string; taskDescription?: string; requirements?: TaskRequirements; settings?: RalphSettings }): void {
        switch (message.command) {
            case 'start': this.emit('start'); break;
            case 'stop': this.emit('stop'); break;
            case 'pause': this.emit('pause'); break;
            case 'resume': this.emit('resume'); break;
            case 'next': this.emit('next'); break;
            case 'refresh': this.refresh(); break;
            case 'generatePrd':
                if (message.taskDescription) {
                    this.emit('generatePrd', { taskDescription: message.taskDescription });
                }
                break;
            case 'requirementsChanged':
                if (message.requirements) {
                    this.emit('requirementsChanged', { requirements: message.requirements });
                }
                break;
            case 'settingsChanged':
                if (message.settings) {
                    this.emit('settingsChanged', { settings: message.settings });
                }
                break;
        }
    }

    public static createPanel(extensionUri: vscode.Uri): vscode.WebviewPanel {
        const column = vscode.ViewColumn.Two;
        const panel = vscode.window.createWebviewPanel(
            'ralphPanel', 'Ralph', column,
            { enableScripts: true, retainContextWhenHidden: true }
        );
        panel.iconPath = vscode.Uri.joinPath(extensionUri, 'icon.png');
        return panel;
    }

    public reveal(): void {
        this.panel.reveal(vscode.ViewColumn.Two);
    }

    public onDispose(callback: () => void): void {
        this.onDisposeCallback = callback;
    }

    public async refresh(): Promise<void> {
        this.panel.webview.html = await RalphPanel.generateHtmlAsync();
    }

    public updateStatus(status: string, iteration: number, taskInfo: string, _history: TaskCompletion[]): void {
        this.panel.webview.postMessage({ type: 'update', status, iteration, taskInfo });
    }

    public updateCountdown(seconds: number): void {
        this.panel.webview.postMessage({ type: 'countdown', seconds });
    }

    public updateHistory(history: TaskCompletion[]): void {
        this.panel.webview.postMessage({ type: 'history', history });
    }

    public updateSessionTiming(startTime: number, taskHistory: TaskCompletion[], pendingTasks: number): void {
        this.panel.webview.postMessage({ type: 'timing', startTime, taskHistory, pendingTasks });
    }

    public async updateStats(): Promise<void> {
        const stats = await getTaskStatsAsync();
        const nextTask = await getNextTaskAsync();
        const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

        this.panel.webview.postMessage({
            type: 'stats',
            completed: stats.completed,
            pending: stats.pending,
            total: stats.total,
            progress,
            nextTask: nextTask?.description || null
        });
    }

    public static async generateHtmlAsync(): Promise<string> {
        const stats = await getTaskStatsAsync();
        const nextTask = await getNextTaskAsync();
        const prd = await readPRDAsync();
        const hasPrd = !!prd;
        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>Ralph</title>
    <style>${getStyles()}</style>
</head>
<body>
    ${getHeader()}
    ${getControls(hasPrd)}
    <div class="content">
        ${!hasPrd ? getSetupSection() : ''}
        ${getTimelineSection()}
        ${hasPrd ? getRequirementsSection() : ''}
        ${getTaskSection(nextTask, stats.total > 0)}
        ${getLogSection()}
        ${getFooter()}
    </div>
    ${getSettingsOverlay()}
    <script>${getClientScripts()}</script>
</body>
</html>`;
    }

    public addLog(message: string, highlight: boolean = false): void {
        this.panel.webview.postMessage({ type: 'log', message, highlight });
    }

    public showPrdGenerating(): void {
        this.panel.webview.postMessage({ type: 'prdGenerating' });
    }

    private dispose(): void {
        if (this.isDisposed) { return; }
        this.isDisposed = true;

        this.onDisposeCallback?.();

        this.eventHandlers.clear();

        this.panel.dispose();
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}

export class RalphSidebarProvider implements vscode.WebviewViewProvider, IRalphUI {
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this.getHtml();

        webviewView.webview.onDidReceiveMessage(message => {
            if (message.command === 'openPanel') {
                vscode.commands.executeCommand('ralph.showPanel');
            }
        });
    }

    private getHtml(): string {
        const nonce = getNonce();
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>Ralph</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            padding: 16px;
            margin: 0;
        }
        .container {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 16px;
        }
        .logo { margin-bottom: 8px; }
        h2 { margin: 0; font-size: 16px; font-weight: 600; }
        p {
            margin: 0;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            line-height: 1.5;
        }
        .open-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            font-family: inherit;
            cursor: pointer;
            background: linear-gradient(135deg, #7c3aed, #2563eb);
            color: white;
            transition: opacity 0.15s, transform 0.15s;
        }
        .open-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .open-btn:active { transform: translateY(0); }
    </style>
</head>
<body>
    <div class="container">
        ${getLogo(48)}
        <h2>Ralph</h2>
        <p>Autonomous PRD Development<br/>with GitHub Copilot</p>
        <button class="open-btn" onclick="openPanel()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
            Open Control Panel
        </button>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        function openPanel() { vscode.postMessage({ command: 'openPanel' }); }
    </script>
</body>
</html>`;
    }

    private isViewAvailable(): boolean {
        return !!(this._view && this._view.webview);
    }

    public updateStatus(_status: string, _iteration: number, _currentTask: string, _history: TaskCompletion[]): void {

    }

    public updateCountdown(_seconds: number): void {

    }

    public updateHistory(_history: TaskCompletion[]): void {

    }

    public updateSessionTiming(_startTime: number, _taskHistory: TaskCompletion[], _pendingTasks: number): void {

    }

    public updateStats(): void {

    }

    public refresh(): void {

        if (this.isViewAvailable()) {
            try {
                this._view!.webview.html = this.getHtml();
            } catch {
                // Ignore errors when refreshing webview
            }
        }
    }

    public addLog(_message: string, _highlight: boolean = false): void {

    }

    public showPrdGenerating(): void {

    }
}
