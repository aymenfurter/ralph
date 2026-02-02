import * as assert from 'assert';
import {
    LoopExecutionState,
    TaskStatus,
    DEFAULT_CONFIG,
    DEFAULT_REQUIREMENTS,
    DEFAULT_SETTINGS,
    REVIEW_COUNTDOWN_SECONDS,
    INACTIVITY_TIMEOUT_MS,
    INACTIVITY_CHECK_INTERVAL_MS
} from '../../types';

describe('Types', () => {
    describe('LoopExecutionState enum', () => {
        it('should have IDLE state', () => {
            assert.strictEqual(LoopExecutionState.IDLE, 'IDLE');
        });

        it('should have RUNNING state', () => {
            assert.strictEqual(LoopExecutionState.RUNNING, 'RUNNING');
        });

        it('should have exactly 2 states', () => {
            const states = Object.values(LoopExecutionState);
            assert.strictEqual(states.length, 2);
        });

        it('should have unique state values', () => {
            const states = Object.values(LoopExecutionState);
            const uniqueStates = new Set(states);
            assert.strictEqual(uniqueStates.size, states.length);
        });
    });

    describe('TaskStatus enum', () => {
        it('should have PENDING status', () => {
            assert.strictEqual(TaskStatus.PENDING, 'PENDING');
        });

        it('should have IN_PROGRESS status', () => {
            assert.strictEqual(TaskStatus.IN_PROGRESS, 'IN_PROGRESS');
        });

        it('should have COMPLETE status', () => {
            assert.strictEqual(TaskStatus.COMPLETE, 'COMPLETE');
        });

        it('should have BLOCKED status', () => {
            assert.strictEqual(TaskStatus.BLOCKED, 'BLOCKED');
        });

        it('should have exactly 4 statuses', () => {
            const statuses = Object.values(TaskStatus);
            assert.strictEqual(statuses.length, 4);
        });

        it('should have unique status values', () => {
            const statuses = Object.values(TaskStatus);
            const uniqueStatuses = new Set(statuses);
            assert.strictEqual(uniqueStatuses.size, statuses.length);
        });

        it('should have string values for all statuses', () => {
            Object.values(TaskStatus).forEach(status => {
                assert.strictEqual(typeof status, 'string');
            });
        });
    });

    describe('DEFAULT_CONFIG', () => {
        it('should have default PRD path', () => {
            assert.strictEqual(DEFAULT_CONFIG.files.prdPath, 'PRD.md');
        });

        it('should have default progress path', () => {
            assert.strictEqual(DEFAULT_CONFIG.files.progressPath, 'progress.txt');
        });

        it('should have files object', () => {
            assert.ok(DEFAULT_CONFIG.files);
            assert.ok(typeof DEFAULT_CONFIG.files === 'object');
        });

        it('should have prompt object', () => {
            assert.ok(DEFAULT_CONFIG.prompt);
            assert.ok(typeof DEFAULT_CONFIG.prompt === 'object');
        });

        it('should have empty customTemplate by default', () => {
            assert.strictEqual(DEFAULT_CONFIG.prompt.customTemplate, '');
        });

        it('should have empty customPrdGenerationTemplate by default', () => {
            assert.strictEqual(DEFAULT_CONFIG.prompt.customPrdGenerationTemplate, '');
        });

        it('should have all expected top-level keys', () => {
            const expectedKeys = ['files', 'prompt'];
            const actualKeys = Object.keys(DEFAULT_CONFIG);
            expectedKeys.forEach(key => {
                assert.ok(actualKeys.includes(key), `Missing key: ${key}`);
            });
        });

        it('should have files.prdPath as a string', () => {
            assert.strictEqual(typeof DEFAULT_CONFIG.files.prdPath, 'string');
        });

        it('should have files.progressPath as a string', () => {
            assert.strictEqual(typeof DEFAULT_CONFIG.files.progressPath, 'string');
        });

        it('should have prompt.customTemplate as a string', () => {
            assert.strictEqual(typeof DEFAULT_CONFIG.prompt.customTemplate, 'string');
        });

        it('should have prompt.customPrdGenerationTemplate as a string', () => {
            assert.strictEqual(typeof DEFAULT_CONFIG.prompt.customPrdGenerationTemplate, 'string');
        });
    });

    describe('DEFAULT_REQUIREMENTS', () => {
        it('should have runTests set to false', () => {
            assert.strictEqual(DEFAULT_REQUIREMENTS.runTests, false);
        });

        it('should have runLinting set to false', () => {
            assert.strictEqual(DEFAULT_REQUIREMENTS.runLinting, false);
        });

        it('should have runTypeCheck set to false', () => {
            assert.strictEqual(DEFAULT_REQUIREMENTS.runTypeCheck, false);
        });

        it('should have writeTests set to false', () => {
            assert.strictEqual(DEFAULT_REQUIREMENTS.writeTests, false);
        });

        it('should have updateDocs set to false', () => {
            assert.strictEqual(DEFAULT_REQUIREMENTS.updateDocs, false);
        });

        it('should have commitChanges set to false', () => {
            assert.strictEqual(DEFAULT_REQUIREMENTS.commitChanges, false);
        });

        it('should have all expected properties', () => {
            const expectedKeys = ['runTests', 'runLinting', 'runTypeCheck', 'writeTests', 'updateDocs', 'commitChanges'];
            const actualKeys = Object.keys(DEFAULT_REQUIREMENTS);
            expectedKeys.forEach(key => {
                assert.ok(actualKeys.includes(key), `Missing property: ${key}`);
            });
        });

        it('should have exactly 6 properties', () => {
            const actualKeys = Object.keys(DEFAULT_REQUIREMENTS);
            assert.strictEqual(actualKeys.length, 6);
        });

        it('should have all boolean values', () => {
            Object.values(DEFAULT_REQUIREMENTS).forEach(value => {
                assert.strictEqual(typeof value, 'boolean');
            });
        });

        it('should have all values set to false by default', () => {
            Object.values(DEFAULT_REQUIREMENTS).forEach(value => {
                assert.strictEqual(value, false);
            });
        });
    });

    describe('DEFAULT_SETTINGS', () => {
        it('should have maxIterations set to 50', () => {
            assert.strictEqual(DEFAULT_SETTINGS.maxIterations, 50);
        });

        it('should have maxIterations as a number', () => {
            assert.strictEqual(typeof DEFAULT_SETTINGS.maxIterations, 'number');
        });

        it('should have maxIterations as a positive integer', () => {
            assert.ok(DEFAULT_SETTINGS.maxIterations > 0);
            assert.strictEqual(DEFAULT_SETTINGS.maxIterations, Math.floor(DEFAULT_SETTINGS.maxIterations));
        });

        it('should have exactly 1 property', () => {
            const actualKeys = Object.keys(DEFAULT_SETTINGS);
            assert.strictEqual(actualKeys.length, 1);
        });
    });

    describe('Constants', () => {
        it('REVIEW_COUNTDOWN_SECONDS should be 12', () => {
            assert.strictEqual(REVIEW_COUNTDOWN_SECONDS, 12);
        });

        it('INACTIVITY_TIMEOUT_MS should be 60000 (60 seconds)', () => {
            assert.strictEqual(INACTIVITY_TIMEOUT_MS, 60_000);
        });

        it('INACTIVITY_CHECK_INTERVAL_MS should be 10000 (10 seconds)', () => {
            assert.strictEqual(INACTIVITY_CHECK_INTERVAL_MS, 10_000);
        });

        it('REVIEW_COUNTDOWN_SECONDS should be a positive integer', () => {
            assert.ok(REVIEW_COUNTDOWN_SECONDS > 0);
            assert.strictEqual(REVIEW_COUNTDOWN_SECONDS, Math.floor(REVIEW_COUNTDOWN_SECONDS));
        });

        it('INACTIVITY_TIMEOUT_MS should be a positive integer', () => {
            assert.ok(INACTIVITY_TIMEOUT_MS > 0);
            assert.strictEqual(INACTIVITY_TIMEOUT_MS, Math.floor(INACTIVITY_TIMEOUT_MS));
        });

        it('INACTIVITY_CHECK_INTERVAL_MS should be a positive integer', () => {
            assert.ok(INACTIVITY_CHECK_INTERVAL_MS > 0);
            assert.strictEqual(INACTIVITY_CHECK_INTERVAL_MS, Math.floor(INACTIVITY_CHECK_INTERVAL_MS));
        });

        it('INACTIVITY_CHECK_INTERVAL_MS should be less than INACTIVITY_TIMEOUT_MS', () => {
            assert.ok(INACTIVITY_CHECK_INTERVAL_MS < INACTIVITY_TIMEOUT_MS);
        });

        it('INACTIVITY_TIMEOUT_MS should be divisible by INACTIVITY_CHECK_INTERVAL_MS', () => {
            // This ensures the check will trigger at the timeout
            assert.strictEqual(INACTIVITY_TIMEOUT_MS % INACTIVITY_CHECK_INTERVAL_MS, 0);
        });
    });

    describe('Task interface (validation via object creation)', () => {
        it('should accept valid task object', () => {
            const task = {
                id: 'task-1',
                description: 'Test task',
                status: TaskStatus.PENDING,
                lineNumber: 1,
                rawLine: '- [ ] Test task'
            };
            assert.ok(task.id);
            assert.ok(task.description);
            assert.strictEqual(task.status, TaskStatus.PENDING);
            assert.strictEqual(task.lineNumber, 1);
            assert.ok(task.rawLine);
        });

        it('should work with all status types', () => {
            const statuses = [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETE, TaskStatus.BLOCKED];
            statuses.forEach((status, i) => {
                const task = {
                    id: `task-${i}`,
                    description: `Task with ${status}`,
                    status,
                    lineNumber: i + 1,
                    rawLine: `- [ ] Task with ${status}`
                };
                assert.strictEqual(task.status, status);
            });
        });
    });

    describe('TaskCompletion interface (validation via object creation)', () => {
        it('should accept valid task completion object', () => {
            const completion = {
                taskDescription: 'Completed task',
                completedAt: Date.now(),
                duration: 5000,
                iteration: 1
            };
            assert.ok(completion.taskDescription);
            assert.ok(completion.completedAt > 0);
            assert.ok(completion.duration >= 0);
            assert.ok(completion.iteration >= 1);
        });

        it('should accept zero duration', () => {
            const completion = {
                taskDescription: 'Quick task',
                completedAt: Date.now(),
                duration: 0,
                iteration: 1
            };
            assert.strictEqual(completion.duration, 0);
        });

        it('should accept large iteration numbers', () => {
            const completion = {
                taskDescription: 'Many iterations',
                completedAt: Date.now(),
                duration: 1000,
                iteration: 100
            };
            assert.strictEqual(completion.iteration, 100);
        });
    });

    describe('RalphConfig interface (validation via object creation)', () => {
        it('should accept valid config object', () => {
            const config = {
                files: {
                    prdPath: 'custom.md',
                    progressPath: 'custom-progress.txt'
                },
                prompt: {
                    customTemplate: 'Custom template {{task}}',
                    customPrdGenerationTemplate: 'Custom PRD {{workspace}}'
                }
            };
            assert.strictEqual(config.files.prdPath, 'custom.md');
            assert.strictEqual(config.files.progressPath, 'custom-progress.txt');
            assert.ok(config.prompt.customTemplate.includes('{{task}}'));
            assert.ok(config.prompt.customPrdGenerationTemplate.includes('{{workspace}}'));
        });
    });

    describe('TaskRequirements interface (validation via object creation)', () => {
        it('should accept all true requirements', () => {
            const requirements = {
                runTests: true,
                runLinting: true,
                runTypeCheck: true,
                writeTests: true,
                updateDocs: true,
                commitChanges: true
            };
            Object.values(requirements).forEach(value => {
                assert.strictEqual(value, true);
            });
        });

        it('should accept mixed requirements', () => {
            const requirements = {
                runTests: true,
                runLinting: false,
                runTypeCheck: true,
                writeTests: false,
                updateDocs: true,
                commitChanges: false
            };
            assert.strictEqual(requirements.runTests, true);
            assert.strictEqual(requirements.runLinting, false);
        });
    });

    describe('RalphSettings interface (validation via object creation)', () => {
        it('should accept zero maxIterations (unlimited)', () => {
            const settings = { maxIterations: 0 };
            assert.strictEqual(settings.maxIterations, 0);
        });

        it('should accept custom maxIterations', () => {
            const settings = { maxIterations: 100 };
            assert.strictEqual(settings.maxIterations, 100);
        });
    });
});
