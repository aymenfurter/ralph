import * as vscode from 'vscode';

export interface CopilotOptions {
    freshChat: boolean;
}

export async function openCopilotWithPrompt(
    prompt: string,
    options: CopilotOptions = { freshChat: false }
): Promise<'agent' | 'chat' | 'clipboard'> {
    if (options.freshChat) {
        await tryCommand('workbench.action.chat.newEditSession');
    }

    if (await tryCommand('workbench.action.chat.openEditSession', { query: prompt })) {
        // Try to actually send the prompt (press Enter) after opening the chat.
        await pressEnterIfPossible();
        return 'agent';
    }

    if (await tryCommand('workbench.action.chat.open', { query: prompt })) {
        // Try to actually send the prompt (press Enter) after opening the chat.
        await pressEnterIfPossible();
        return 'chat';
    }

    await vscode.env.clipboard.writeText(prompt);
    vscode.window.showInformationMessage('Ralph: Prompt copied. Paste in Copilot Chat.');
    return 'clipboard';
}

async function tryCommand(command: string, args?: unknown): Promise<boolean> {
    try {
        await vscode.commands.executeCommand(command, args);
        return true;
    } catch {
        return false;
    }
}

export async function startFreshChatSession(): Promise<boolean> {
    // If Copilot is still generating, attempting to start a new edit session or chat
    // will show a "Start new chat?" dialog asking for user confirmation.
    // By invoking the cancel command first, we stop any ongoing generation
    // and prevent the dialog from appearing.
    try {
        await vscode.commands.executeCommand('chatEditing.acceptAllFiles');
        await new Promise(r => setTimeout(r, 200));
        await vscode.commands.executeCommand('chatEditor.action.acceptAllEdits');
        await new Promise(r => setTimeout(r, 200));
        await vscode.commands.executeCommand('workbench.action.files.saveAll');
    } catch (_) {
        // ignore
    }

    try {
        await vscode.commands.executeCommand('workbench.action.chat.cancel');
        await new Promise(r => setTimeout(r, 100));
    } catch (_) {
        // ignore
    }

    // Also try to close / cancel edit sessions
    try {
        await vscode.commands.executeCommand('github.copilot.interactiveEditor.cancel');
        await new Promise(r => setTimeout(r, 100));
    } catch (_) { }

    return tryCommand('workbench.action.chat.newEditSession');
}

async function pressEnterIfPossible(): Promise<boolean> {
    // Small delay to allow the chat input to focus after opening with a query
    await new Promise((r) => setTimeout(r, 120));

    // First try a dedicated chat send command (may not exist in all VS Code versions)
    try {
        await vscode.commands.executeCommand('workbench.action.chat.send');
        return true;
    } catch (_) {
        // ignore
    }

    // Fallback: simulate an Enter keypress via the public 'type' command
    try {
        await vscode.commands.executeCommand('type', { text: '\n' });
        return true;
    } catch (_) {
        return false;
    }
}
