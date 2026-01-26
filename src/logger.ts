import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel | null = null;

/**
 * Check if debug mode is enabled in settings.
 * When disabled, sensitive data like task content is redacted from logs.
 */
export function isDebugMode(): boolean {
    return vscode.workspace.getConfiguration('ralph').get<boolean>('logging.debugMode', false);
}

export function getLogger(): vscode.OutputChannel {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel('Ralph');
    }
    return outputChannel;
}

export function log(message: string): void {
    const timestamp = new Date().toISOString();
    getLogger().appendLine(`[${timestamp}] ${message}`);
}

/**
 * Log a message that may contain sensitive data (task descriptions, PRD content).
 * Content is redacted unless debug mode is enabled.
 */
export function logSensitive(message: string, sensitiveContent?: string): void {
    const timestamp = new Date().toISOString();
    if (isDebugMode() && sensitiveContent) {
        getLogger().appendLine(`[${timestamp}] ${message}: ${sensitiveContent}`);
    } else {
        getLogger().appendLine(`[${timestamp}] ${message}${sensitiveContent ? ' [content redacted - enable ralph.logging.debugMode to view]' : ''}`);
    }
}

export function logError(message: string, error?: unknown): void {
    const timestamp = new Date().toISOString();
    const errorStr = error instanceof Error ? error.message : String(error || '');
    getLogger().appendLine(`[${timestamp}] ❌ ERROR: ${message} ${errorStr}`);
}

export function showLogs(): void {
    getLogger().show();
}

export function disposeLogger(): void {
    outputChannel?.dispose();
    outputChannel = null;
}
