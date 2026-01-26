import * as vscode from 'vscode';
import {
    TaskCompletion,
    TaskRequirements,
    RalphSettings,
    DEFAULT_REQUIREMENTS,
    DEFAULT_SETTINGS
} from './types';
import { logError, logSensitive } from './logger';
import { getWorkspaceRoot } from './fileUtils';
import { buildAgentPromptAsync, buildPrdGenerationPrompt } from './promptBuilder';
import { openCopilotWithPrompt, startFreshChatSession } from './copilotIntegration';
import { formatDuration } from './timerManager';

export type CopilotResult = 'agent' | 'chat' | 'clipboard';

export type LogCallback = (message: string, highlight?: boolean) => void;

export class TaskRunner {
    private requirements: TaskRequirements = { ...DEFAULT_REQUIREMENTS };
    private settings: RalphSettings = { ...DEFAULT_SETTINGS };
    private taskHistory: TaskCompletion[] = [];
    private taskStartTime = 0;
    private currentTaskDescription = '';
    private iterationCount = 0;
    private logCallback: LogCallback | null = null;

    setLogCallback(callback: LogCallback): void {
        this.logCallback = callback;
    }

    private log(message: string, highlight: boolean = false): void {
        this.logCallback?.(message, highlight);
    }

    setRequirements(requirements: TaskRequirements): void {
        this.requirements = requirements;
        this.log('Updated task requirements');
    }

    getRequirements(): TaskRequirements {
        return this.requirements;
    }

    setSettings(settings: RalphSettings): void {
        this.settings = settings;
        this.log('Updated settings');
    }

    getSettings(): RalphSettings {
        return this.settings;
    }

    getTaskHistory(): TaskCompletion[] {
        return [...this.taskHistory];
    }

    clearHistory(): void {
        this.taskHistory = [];
    }

    getCurrentTask(): string {
        return this.currentTaskDescription;
    }

    setCurrentTask(description: string): void {
        this.currentTaskDescription = description;
        this.taskStartTime = Date.now();
    }

    getIterationCount(): number {
        return this.iterationCount;
    }

    incrementIteration(): number {
        return ++this.iterationCount;
    }

    resetIterations(): void {
        this.iterationCount = 0;
    }

    recordTaskCompletion(): TaskCompletion {
        const duration = Date.now() - this.taskStartTime;
        const completion: TaskCompletion = {
            taskDescription: this.currentTaskDescription,
            completedAt: Date.now(),
            duration,
            iteration: this.iterationCount
        };
        this.taskHistory.push(completion);
        this.log(`✅ Task completed in ${formatDuration(duration)}!`, true);
        return completion;
    }

    checkIterationLimit(): boolean {
        if (this.settings.maxIterations > 0 && this.iterationCount >= this.settings.maxIterations) {
            this.log(`🛑 Reached maximum iterations (${this.settings.maxIterations}). Stopping.`, true);
            return true;
        }
        return false;
    }

    async triggerCopilotAgent(taskDescription: string): Promise<CopilotResult | null> {
        try {
            const prompt = await buildAgentPromptAsync(taskDescription, this.requirements);
            logSensitive('Generated agent prompt', prompt);

            // Always start fresh chat session
            const success = await startFreshChatSession();
            if (success) {
                this.log('Started fresh chat session');
            }

            const method = await openCopilotWithPrompt(prompt);
            this.log(
                method === 'agent' ? 'Opened Copilot Agent Mode' :
                    method === 'chat' ? 'Opened Copilot Chat' :
                        'Prompt copied to clipboard'
            );
            return method;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.log(`Failed to trigger Copilot: ${errorMessage}`);
            logError('Failed to trigger Copilot Agent', error);
            return null;
        }
    }

    async triggerPrdGeneration(taskDescription: string): Promise<CopilotResult | null> {
        const root = getWorkspaceRoot();
        if (!root) {
            vscode.window.showErrorMessage('Ralph: No workspace folder open');
            return null;
        }

        this.log('✨ Generating PRD.md from your description...');

        try {
            const prompt = buildPrdGenerationPrompt(taskDescription, root);
            logSensitive('Generated PRD prompt', prompt);
            const method = await openCopilotWithPrompt(prompt);
            this.log(
                method === 'agent' ? 'Opened Copilot Agent Mode' :
                    method === 'chat' ? 'Opened Copilot Chat' :
                        'Prompt copied to clipboard'
            );
            return method;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.log(`Failed to open Copilot for PRD: ${errorMessage}`);
            logError('Failed to open Copilot for PRD generation', error);
            return null;
        }
    }
}
