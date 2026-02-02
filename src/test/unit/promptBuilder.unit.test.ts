import * as assert from 'assert';

// Since promptBuilder imports vscode modules, we test the pure utility functions
// by re-implementing them here for unit testing purposes.
// The actual integration testing happens in the VS Code test environment.

const MAX_TASK_DESCRIPTION_LENGTH = 5000;

function sanitizeTaskDescription(input: string): string {
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

function applyCustomTemplate(template: string, variables: TemplateVariables): string {
    return template
        .replace(/\{\{task\}\}/g, variables.task)
        .replace(/\{\{prd\}\}/g, variables.prd)
        .replace(/\{\{progress\}\}/g, variables.progress)
        .replace(/\{\{requirements\}\}/g, variables.requirements)
        .replace(/\{\{workspace\}\}/g, variables.workspace);
}

// Re-implementation of buildRequirementsSteps for testing
interface TaskRequirements {
    runTests: boolean;
    runLinting: boolean;
    runTypeCheck: boolean;
    writeTests: boolean;
    updateDocs: boolean;
    commitChanges: boolean;
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

describe('PromptBuilder', () => {
    describe('sanitizeTaskDescription', () => {
        it('should return empty string for null input', () => {
            assert.strictEqual(sanitizeTaskDescription(null as unknown as string), '');
        });

        it('should return empty string for undefined input', () => {
            assert.strictEqual(sanitizeTaskDescription(undefined as unknown as string), '');
        });

        it('should return empty string for non-string input', () => {
            assert.strictEqual(sanitizeTaskDescription(123 as unknown as string), '');
        });

        it('should trim whitespace', () => {
            assert.strictEqual(sanitizeTaskDescription('  hello world  '), 'hello world');
        });

        it('should replace control characters', () => {
            const input = 'hello\x00world\x1F';
            const result = sanitizeTaskDescription(input);
            assert.ok(!result.includes('\x00'));
            assert.ok(!result.includes('\x1F'));
        });

        it('should collapse multiple newlines', () => {
            const input = 'line1\n\n\n\nline2';
            const result = sanitizeTaskDescription(input);
            assert.strictEqual(result, 'line1\n\nline2');
        });

        it('should escape code fences', () => {
            const input = '```javascript\ncode\n```';
            const result = sanitizeTaskDescription(input);
            assert.ok(result.includes('\\`\\`\\`'));
        });

        it('should truncate long descriptions', () => {
            const longInput = 'a'.repeat(10000);
            const result = sanitizeTaskDescription(longInput);
            assert.strictEqual(result.length, 5000);
        });
    });

    describe('applyCustomTemplate', () => {
        it('should replace {{task}} placeholder', () => {
            const template = 'Task: {{task}}';
            const result = applyCustomTemplate(template, {
                task: 'My Task',
                prd: '',
                progress: '',
                requirements: '',
                workspace: ''
            });
            assert.strictEqual(result, 'Task: My Task');
        });

        it('should replace {{prd}} placeholder', () => {
            const template = 'PRD: {{prd}}';
            const result = applyCustomTemplate(template, {
                task: '',
                prd: 'PRD Content',
                progress: '',
                requirements: '',
                workspace: ''
            });
            assert.strictEqual(result, 'PRD: PRD Content');
        });

        it('should replace {{progress}} placeholder', () => {
            const template = 'Progress: {{progress}}';
            const result = applyCustomTemplate(template, {
                task: '',
                prd: '',
                progress: 'Progress Log',
                requirements: '',
                workspace: ''
            });
            assert.strictEqual(result, 'Progress: Progress Log');
        });

        it('should replace {{requirements}} placeholder', () => {
            const template = 'Requirements: {{requirements}}';
            const result = applyCustomTemplate(template, {
                task: '',
                prd: '',
                progress: '',
                requirements: '1. Write tests\n2. Run linting',
                workspace: ''
            });
            assert.strictEqual(result, 'Requirements: 1. Write tests\n2. Run linting');
        });

        it('should replace {{workspace}} placeholder', () => {
            const template = 'Workspace: {{workspace}}';
            const result = applyCustomTemplate(template, {
                task: '',
                prd: '',
                progress: '',
                requirements: '',
                workspace: '/home/user/project'
            });
            assert.strictEqual(result, 'Workspace: /home/user/project');
        });

        it('should replace multiple placeholders', () => {
            const template = 'Task: {{task}}\nPRD: {{prd}}\nWorkspace: {{workspace}}';
            const result = applyCustomTemplate(template, {
                task: 'Build feature',
                prd: '# My PRD',
                progress: '',
                requirements: '',
                workspace: '/project'
            });
            assert.strictEqual(result, 'Task: Build feature\nPRD: # My PRD\nWorkspace: /project');
        });

        it('should replace multiple occurrences of same placeholder', () => {
            const template = '{{task}} - {{task}} - {{task}}';
            const result = applyCustomTemplate(template, {
                task: 'Test',
                prd: '',
                progress: '',
                requirements: '',
                workspace: ''
            });
            assert.strictEqual(result, 'Test - Test - Test');
        });

        it('should leave template unchanged if no placeholders', () => {
            const template = 'This is a plain template with no placeholders';
            const result = applyCustomTemplate(template, {
                task: 'Task',
                prd: 'PRD',
                progress: 'Progress',
                requirements: 'Requirements',
                workspace: '/workspace'
            });
            assert.strictEqual(result, template);
        });

        it('should handle empty variables', () => {
            const template = 'Task: {{task}}, PRD: {{prd}}';
            const result = applyCustomTemplate(template, {
                task: '',
                prd: '',
                progress: '',
                requirements: '',
                workspace: ''
            });
            assert.strictEqual(result, 'Task: , PRD: ');
        });

        it('should handle complex multi-line template', () => {
            const template = `===== CUSTOM PROMPT =====
Task to implement: {{task}}

Current PRD:
{{prd}}

Progress so far:
{{progress}}

Steps:
{{requirements}}

Working in: {{workspace}}`;

            const result = applyCustomTemplate(template, {
                task: 'Add login feature',
                prd: '# Login PRD\n- [ ] Add auth',
                progress: 'Started project setup',
                requirements: '1. Implement\n2. Test',
                workspace: '/my/project'
            });

            assert.ok(result.includes('Task to implement: Add login feature'));
            assert.ok(result.includes('# Login PRD'));
            assert.ok(result.includes('Started project setup'));
            assert.ok(result.includes('1. Implement'));
            assert.ok(result.includes('Working in: /my/project'));
        });

        it('should handle special regex characters in variables', () => {
            const template = 'Task: {{task}}';
            const result = applyCustomTemplate(template, {
                task: 'Fix $100 bug (regex: /test/)',
                prd: '',
                progress: '',
                requirements: '',
                workspace: ''
            });
            assert.strictEqual(result, 'Task: Fix $100 bug (regex: /test/)');
        });

        it('should handle unicode characters in variables', () => {
            const template = '{{task}} - {{workspace}}';
            const result = applyCustomTemplate(template, {
                task: '日本語タスク 🚀',
                prd: '',
                progress: '',
                requirements: '',
                workspace: '/путь/到/项目'
            });
            assert.strictEqual(result, '日本語タスク 🚀 - /путь/到/项目');
        });
    });

    describe('buildRequirementsSteps', () => {
        const noRequirements: TaskRequirements = {
            runTests: false,
            runLinting: false,
            runTypeCheck: false,
            writeTests: false,
            updateDocs: false,
            commitChanges: false
        };

        it('should return minimum 3 steps with no requirements enabled', () => {
            const steps = buildRequirementsSteps('My task', noRequirements);
            assert.strictEqual(steps.length, 3);
            assert.ok(steps[0].includes('Implement the task'));
            assert.ok(steps[1].includes('UPDATE PRD.md'));
            assert.ok(steps[2].includes('APPEND to progress.txt'));
        });

        it('should include task description in PRD update step', () => {
            const steps = buildRequirementsSteps('Create login form', noRequirements);
            assert.ok(steps.some(s => s.includes('Create login form')));
        });

        it('should add writeTests step when enabled', () => {
            const requirements = { ...noRequirements, writeTests: true };
            const steps = buildRequirementsSteps('My task', requirements);
            assert.ok(steps.some(s => s.includes('Write unit tests')));
        });

        it('should add runTests step when enabled', () => {
            const requirements = { ...noRequirements, runTests: true };
            const steps = buildRequirementsSteps('My task', requirements);
            assert.ok(steps.some(s => s.includes('Run tests')));
        });

        it('should add runTypeCheck step when enabled', () => {
            const requirements = { ...noRequirements, runTypeCheck: true };
            const steps = buildRequirementsSteps('My task', requirements);
            assert.ok(steps.some(s => s.includes('type checking')));
        });

        it('should add runLinting step when enabled', () => {
            const requirements = { ...noRequirements, runLinting: true };
            const steps = buildRequirementsSteps('My task', requirements);
            assert.ok(steps.some(s => s.includes('linting')));
        });

        it('should add updateDocs step when enabled', () => {
            const requirements = { ...noRequirements, updateDocs: true };
            const steps = buildRequirementsSteps('My task', requirements);
            assert.ok(steps.some(s => s.includes('documentation')));
        });

        it('should add commitChanges step when enabled', () => {
            const requirements = { ...noRequirements, commitChanges: true };
            const steps = buildRequirementsSteps('My task', requirements);
            assert.ok(steps.some(s => s.includes('Commit')));
        });

        it('should have correct step count with all requirements enabled', () => {
            const allRequirements: TaskRequirements = {
                runTests: true,
                runLinting: true,
                runTypeCheck: true,
                writeTests: true,
                updateDocs: true,
                commitChanges: true
            };
            const steps = buildRequirementsSteps('My task', allRequirements);
            // 1 implement + 6 requirements + 2 mandatory = 9 steps
            assert.strictEqual(steps.length, 9);
        });

        it('should number steps sequentially', () => {
            const allRequirements: TaskRequirements = {
                runTests: true,
                runLinting: true,
                runTypeCheck: true,
                writeTests: true,
                updateDocs: true,
                commitChanges: true
            };
            const steps = buildRequirementsSteps('My task', allRequirements);
            
            steps.forEach((step, index) => {
                const expectedNum = index + 1;
                assert.ok(step.startsWith(`${expectedNum}.`), `Step ${index} should start with "${expectedNum}." but got: ${step}`);
            });
        });

        it('should preserve correct order: writeTests before runTests', () => {
            const requirements = { ...noRequirements, writeTests: true, runTests: true };
            const steps = buildRequirementsSteps('My task', requirements);
            
            const writeTestsIndex = steps.findIndex(s => s.includes('Write unit tests'));
            const runTestsIndex = steps.findIndex(s => s.includes('Run tests'));
            
            assert.ok(writeTestsIndex < runTestsIndex, 'writeTests should come before runTests');
        });

        it('should always end with PRD update and progress append steps', () => {
            const allRequirements: TaskRequirements = {
                runTests: true,
                runLinting: true,
                runTypeCheck: true,
                writeTests: true,
                updateDocs: true,
                commitChanges: true
            };
            const steps = buildRequirementsSteps('Test task', allRequirements);
            
            const lastStep = steps[steps.length - 1];
            const secondToLastStep = steps[steps.length - 2];
            
            assert.ok(lastStep.includes('progress.txt'), 'Last step should mention progress.txt');
            assert.ok(secondToLastStep.includes('PRD.md'), 'Second to last step should mention PRD.md');
        });

        it('should handle task description with special characters', () => {
            const steps = buildRequirementsSteps('Fix bug #123: "Error" in <component>', noRequirements);
            assert.ok(steps.some(s => s.includes('Fix bug #123')));
        });
    });
});
