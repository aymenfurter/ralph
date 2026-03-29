import { TaskRequirements } from './types';
import { readPRDAsync, readProgressAsync, getWorkspaceRoot } from './fileUtils';
import { getConfig } from './config';

const MAX_TASK_DESCRIPTION_LENGTH = 5000;

export function sanitizeTaskDescription(input: string): string {
    if (!input || typeof input !== 'string') {
        return '';
    }

    let sanitized = input.trim().slice(0, MAX_TASK_DESCRIPTION_LENGTH);

    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

    sanitized = sanitized.replace(/^```/gm, '\\`\\`\\`');

    return sanitized;
}

interface TemplateVariables {
    task: string;
    prd: string;
    progress: string;
    requirements: string;
    workspace: string;
}

/**
 * Applies custom template by replacing placeholder variables.
 * Supported placeholders: {{task}}, {{prd}}, {{progress}}, {{requirements}}, {{workspace}}
 */
export function applyCustomTemplate(template: string, variables: TemplateVariables): string {
    return template
        .replace(/\{\{task\}\}/g, variables.task)
        .replace(/\{\{prd\}\}/g, variables.prd)
        .replace(/\{\{progress\}\}/g, variables.progress)
        .replace(/\{\{requirements\}\}/g, variables.requirements)
        .replace(/\{\{workspace\}\}/g, variables.workspace);
}

export async function buildAgentPromptAsync(taskDescription: string, requirements: TaskRequirements): Promise<string> {
    const sanitizedTask = sanitizeTaskDescription(taskDescription);
    const config = getConfig();

    const prd = await readPRDAsync() || '';
    const progress = await readProgressAsync();
    const root = getWorkspaceRoot();

    // Check if custom template is provided
    if (config.prompt.customTemplate && config.prompt.customTemplate.trim()) {
        return applyCustomTemplate(config.prompt.customTemplate, {
            task: sanitizedTask,
            prd: prd,
            progress: progress || '',
            requirements: buildRequirementsSteps(sanitizedTask, requirements).join('\n'),
            workspace: root || ''
        });
    }

    const parts: string[] = [
        '===================================================================',
        '                       YOUR TASK TO IMPLEMENT',
        '===================================================================',
        '',
        sanitizedTask,
        '',
        '===================================================================',
        '           MANDATORY: UPDATE PRD.md AND progress.txt WHEN DONE',
        '═══════════════════════════════════════════════════════════════',
        '',
        '🚨 THESE STEPS ARE REQUIRED - DO NOT SKIP THEM! 🚨',
        '',
        '1. After completing the task, UPDATE PRD.md:',
        '',
        `   Find this line:    - [ ] ${sanitizedTask}`,
        `   Change it to:      - [x] ${sanitizedTask}`,
        '',
        '2. APPEND to progress.txt with what you did:',
        '',
        '   Add a new line describing what was completed, e.g.:',
        `   "Completed: ${sanitizedTask} - [brief summary of changes made]"`,
        '',
        'Both updates are required for Ralph to continue to the next task!',
        '',
        '═══════════════════════════════════════════════════════════════',
        '                      PROJECT CONTEXT',
        '═══════════════════════════════════════════════════════════════',
        '',
        '## Current PRD.md Contents:',
        '```markdown',
        prd,
        '```',
        ''
    ];

    if (progress && progress.trim()) {
        parts.push('## Progress Log (progress.txt):');
        parts.push('This file tracks completed work. Append your progress here when done.');
        parts.push('```');
        parts.push(progress);
        parts.push('```');
        parts.push('');
    } else {
        parts.push('## Progress Log (progress.txt):');
        parts.push('No progress recorded yet. Create or append to progress.txt when you complete this task.');
        parts.push('');
    }

    parts.push('═══════════════════════════════════════════════════════════════');
    parts.push('                       WORKFLOW REMINDER');
    parts.push('═══════════════════════════════════════════════════════════════');
    parts.push('');

    const reqSteps = buildRequirementsSteps(sanitizedTask, requirements);
    parts.push(...reqSteps);
    parts.push('');
    parts.push(`Workspace: ${root}`);
    parts.push('');
    parts.push('Begin now. Remember: updating both progress.txt and PRD.md when done is MANDATORY!');

    return parts.join('\n');
}

function buildRequirementsSteps(taskDescription: string, requirements: TaskRequirements): string[] {
    const reqSteps: string[] = ['1. ✅ Implement the task'];
    let stepNum = 2;

    if (requirements.writeTests) {
        reqSteps.push(`${stepNum}. ✅ Write unit tests for your implementation`);
        stepNum++;
    }
    if (requirements.runTests) {
        reqSteps.push(`${stepNum}. ✅ Run tests and ensure they pass`);
        stepNum++;
    }
    if (requirements.runTypeCheck) {
        reqSteps.push(`${stepNum}. ✅ Run type checking (tsc --noEmit or equivalent)`);
        stepNum++;
    }
    if (requirements.runLinting) {
        reqSteps.push(`${stepNum}. ✅ Run linting and fix any issues`);
        stepNum++;
    }
    if (requirements.updateDocs) {
        reqSteps.push(`${stepNum}. ✅ Update documentation if needed`);
        stepNum++;
    }
    if (requirements.commitChanges) {
        reqSteps.push(`${stepNum}. ✅ Commit your changes with a descriptive message`);
        stepNum++;
    }
    reqSteps.push(`${stepNum}. ✅ UPDATE PRD.md: Change "- [ ] ${taskDescription}" to "- [x] ${taskDescription}"`);
    stepNum++;
    reqSteps.push(`${stepNum}. ✅ APPEND to progress.txt: Record what you completed`);

    return reqSteps;
}

export function buildPrdGenerationPrompt(taskDescription: string, workspaceRoot: string): string {
    const sanitizedTask = sanitizeTaskDescription(taskDescription);
    const config = getConfig();

    // Check if custom PRD generation template is provided
    if (config.prompt.customPrdGenerationTemplate && config.prompt.customPrdGenerationTemplate.trim()) {
        return applyCustomTemplate(config.prompt.customPrdGenerationTemplate, {
            task: sanitizedTask,
            workspace: workspaceRoot,
            prd: '',
            progress: '',
            requirements: ''
        });
    }

    return `===================================================================
                       CREATE PRD.md FILE
===================================================================

The user wants to build something. Your job is to create a PRD.md file with a structured task list.

## USER'S REQUEST:
${sanitizedTask}

===================================================================
                    REQUIRED OUTPUT FORMAT
===================================================================

Create a file called \`PRD.md\` in the workspace root with this EXACT structure:

\`\`\`markdown
# Project Name

## Overview
Brief description of what we're building.

## Tasks
- [ ] Task 1: Clear, actionable task description
- [ ] Task 2: Another specific task
- [ ] Task 3: Continue breaking down the work
... (add more tasks as needed)

## Technical Details
Any relevant technical decisions, stack info, etc.
\`\`\`

═══════════════════════════════════════════════════════════════
                    ⚠️ IMPORTANT RULES
═══════════════════════════════════════════════════════════════

1. **Task Format**: Each task MUST use \`- [ ] \` checkbox format (this is how Ralph tracks progress)
2. **Keep it SHORT**: Generate exactly 5-6 tasks maximum. Each task runs as a separate agent request.
3. **Logical Order**: Order tasks so they can be completed sequentially
4. **Comprehensive Tasks**: Each task should accomplish a meaningful chunk of work (not too granular!)
5. **Clear Actions**: Start each task with a verb (Create, Add, Implement, Configure, etc.)

## EXAMPLE TASKS (good - notice only 5 tasks!):
- [ ] Set up project structure with dependencies and configuration
- [ ] Create the core data models and types
- [ ] Implement the main application logic and components
- [ ] Add user interface and styling
- [ ] Write tests and documentation

## BAD TASKS (too many or too granular):
- [ ] Create package.json (too small - combine with other setup)
- [ ] Add button component (too granular - combine UI work)
- [ ] 20+ tasks (way too many - keep it to 5-6!)

═══════════════════════════════════════════════════════════════

Workspace: ${workspaceRoot}

Now create the PRD.md file based on the user's request above. Make the tasks specific and actionable.`;
}
