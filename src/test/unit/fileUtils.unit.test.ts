import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { Task, TaskStatus } from '../../types';

// Helper to load fixture files
const fixturesDir = path.join(__dirname, '..', '..', '..', 'src', 'test', 'fixtures', 'prd');

function loadFixture(filename: string): string {
    return fs.readFileSync(path.join(fixturesDir, filename), 'utf-8');
}

interface FixtureMetadata {
    name: string;
    expectedTasks: number;
    expectedPending: number;
    expectedComplete: number;
    expectedInProgress: number;
    expectedBlocked: number;
}

function loadMetadata(): FixtureMetadata[] {
    return JSON.parse(fs.readFileSync(path.join(fixturesDir, 'fixtures-metadata.json'), 'utf-8'));
}

// Since fileUtils imports vscode modules, we test the pure parsing logic
// by re-implementing the parseTasksFromContent function here for unit testing purposes.
// This approach is consistent with other unit tests in this project (see promptBuilder.unit.test.ts)
// and allows us to test the regex logic without requiring the full VS Code environment.
// The actual integration testing happens in the VS Code test environment.

function parseTasksFromContent(content: string): Task[] {
    const tasks: Task[] = [];
    // Normalize line endings: handle CRLF (Windows), LF (Unix), and CR (old Mac)
    const lines = content.split(/\r?\n|\r/);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = /^[-*]\s*\[([ x~!])\]\s*(.+)$/im.exec(line);

        if (match) {
            const marker = match[1].toLowerCase();
            const description = match[2].trim();

            let status: TaskStatus;
            switch (marker) {
                case 'x':
                    status = TaskStatus.COMPLETE;
                    break;
                case '~':
                    status = TaskStatus.IN_PROGRESS;
                    break;
                case '!':
                    status = TaskStatus.BLOCKED;
                    break;
                default:
                    status = TaskStatus.PENDING;
            }

            tasks.push({
                id: `task-${i + 1}`,
                description,
                status,
                lineNumber: i + 1,
                rawLine: line
            });
        }
    }

    return tasks;
}

function countByStatus(tasks: Task[], status: TaskStatus): number {
    return tasks.filter(t => t.status === status).length;
}

describe('FileUtils - Task Parsing Regex', () => {
    let metadata: FixtureMetadata[];

    before(() => {
        metadata = loadMetadata();
    });

    describe('LF fixtures - task count validation', () => {
        it('should parse correct number of tasks from all LF fixtures', () => {
            metadata.forEach(fixture => {
                const content = loadFixture(`${fixture.name}-lf.md`);
                const tasks = parseTasksFromContent(content);

                assert.strictEqual(
                    tasks.length,
                    fixture.expectedTasks,
                    `${fixture.name}-lf.md: Expected ${fixture.expectedTasks} tasks, got ${tasks.length}`
                );
            });
        });

        it('should parse correct status counts from all LF fixtures', () => {
            metadata.forEach(fixture => {
                const content = loadFixture(`${fixture.name}-lf.md`);
                const tasks = parseTasksFromContent(content);

                const pending = countByStatus(tasks, TaskStatus.PENDING);
                const complete = countByStatus(tasks, TaskStatus.COMPLETE);
                const inProgress = countByStatus(tasks, TaskStatus.IN_PROGRESS);
                const blocked = countByStatus(tasks, TaskStatus.BLOCKED);

                if (fixture.expectedPending > 0) {
                    assert.strictEqual(pending, fixture.expectedPending,
                        `${fixture.name}-lf.md: Expected ${fixture.expectedPending} pending, got ${pending}`);
                }
                if (fixture.expectedComplete > 0) {
                    assert.strictEqual(complete, fixture.expectedComplete,
                        `${fixture.name}-lf.md: Expected ${fixture.expectedComplete} complete, got ${complete}`);
                }
                if (fixture.expectedInProgress > 0) {
                    assert.strictEqual(inProgress, fixture.expectedInProgress,
                        `${fixture.name}-lf.md: Expected ${fixture.expectedInProgress} in-progress, got ${inProgress}`);
                }
                if (fixture.expectedBlocked > 0) {
                    assert.strictEqual(blocked, fixture.expectedBlocked,
                        `${fixture.name}-lf.md: Expected ${fixture.expectedBlocked} blocked, got ${blocked}`);
                }
            });
        });
    });

    describe('CRLF fixtures - task count validation', () => {
        it('should parse correct number of tasks from all CRLF fixtures', () => {
            metadata.forEach(fixture => {
                const content = loadFixture(`${fixture.name}-crlf.md`);
                const tasks = parseTasksFromContent(content);

                assert.strictEqual(
                    tasks.length,
                    fixture.expectedTasks,
                    `${fixture.name}-crlf.md: Expected ${fixture.expectedTasks} tasks, got ${tasks.length}`
                );
            });
        });

        it('should parse correct status counts from all CRLF fixtures', () => {
            metadata.forEach(fixture => {
                const content = loadFixture(`${fixture.name}-crlf.md`);
                const tasks = parseTasksFromContent(content);

                const pending = countByStatus(tasks, TaskStatus.PENDING);
                const complete = countByStatus(tasks, TaskStatus.COMPLETE);
                const inProgress = countByStatus(tasks, TaskStatus.IN_PROGRESS);
                const blocked = countByStatus(tasks, TaskStatus.BLOCKED);

                if (fixture.expectedPending > 0) {
                    assert.strictEqual(pending, fixture.expectedPending,
                        `${fixture.name}-crlf.md: Expected ${fixture.expectedPending} pending, got ${pending}`);
                }
                if (fixture.expectedComplete > 0) {
                    assert.strictEqual(complete, fixture.expectedComplete,
                        `${fixture.name}-crlf.md: Expected ${fixture.expectedComplete} complete, got ${complete}`);
                }
                if (fixture.expectedInProgress > 0) {
                    assert.strictEqual(inProgress, fixture.expectedInProgress,
                        `${fixture.name}-crlf.md: Expected ${fixture.expectedInProgress} in-progress, got ${inProgress}`);
                }
                if (fixture.expectedBlocked > 0) {
                    assert.strictEqual(blocked, fixture.expectedBlocked,
                        `${fixture.name}-crlf.md: Expected ${fixture.expectedBlocked} blocked, got ${blocked}`);
                }
            });
        });
    });

    describe('LF vs CRLF consistency', () => {
        it('should parse identical task counts for LF and CRLF versions', () => {
            metadata.forEach(fixture => {
                const lfContent = loadFixture(`${fixture.name}-lf.md`);
                const crlfContent = loadFixture(`${fixture.name}-crlf.md`);

                const lfTasks = parseTasksFromContent(lfContent);
                const crlfTasks = parseTasksFromContent(crlfContent);

                assert.strictEqual(
                    lfTasks.length,
                    crlfTasks.length,
                    `${fixture.name}: LF (${lfTasks.length}) and CRLF (${crlfTasks.length}) should have same task count`
                );
            });
        });

        it('should parse identical descriptions for LF and CRLF versions', () => {
            metadata.forEach(fixture => {
                const lfContent = loadFixture(`${fixture.name}-lf.md`);
                const crlfContent = loadFixture(`${fixture.name}-crlf.md`);

                const lfTasks = parseTasksFromContent(lfContent);
                const crlfTasks = parseTasksFromContent(crlfContent);

                for (let i = 0; i < lfTasks.length; i++) {
                    assert.strictEqual(
                        crlfTasks[i].description,
                        lfTasks[i].description,
                        `${fixture.name}: Task ${i + 1} description mismatch. ` +
                        `LF: ${JSON.stringify(lfTasks[i].description)}, ` +
                        `CRLF: ${JSON.stringify(crlfTasks[i].description)}`
                    );
                }
            });
        });

        it('should parse identical statuses for LF and CRLF versions', () => {
            metadata.forEach(fixture => {
                const lfContent = loadFixture(`${fixture.name}-lf.md`);
                const crlfContent = loadFixture(`${fixture.name}-crlf.md`);

                const lfTasks = parseTasksFromContent(lfContent);
                const crlfTasks = parseTasksFromContent(crlfContent);

                for (let i = 0; i < lfTasks.length; i++) {
                    assert.strictEqual(
                        crlfTasks[i].status,
                        lfTasks[i].status,
                        `${fixture.name}: Task ${i + 1} status mismatch`
                    );
                }
            });
        });
    });

    describe('CRLF files should not have CR in parsed data', () => {
        it('should NOT have carriage return in descriptions from any CRLF file', () => {
            metadata.forEach(fixture => {
                const content = loadFixture(`${fixture.name}-crlf.md`);
                const tasks = parseTasksFromContent(content);

                tasks.forEach((task, index) => {
                    assert.strictEqual(
                        task.description.includes('\r'),
                        false,
                        `${fixture.name}-crlf.md: Task ${index + 1} description contains \\r: ${JSON.stringify(task.description)}`
                    );
                });
            });
        });

        it('should NOT have carriage return in rawLine from any CRLF file', () => {
            metadata.forEach(fixture => {
                const content = loadFixture(`${fixture.name}-crlf.md`);
                const tasks = parseTasksFromContent(content);

                tasks.forEach((task, index) => {
                    assert.strictEqual(
                        task.rawLine.includes('\r'),
                        false,
                        `${fixture.name}-crlf.md: Task ${index + 1} rawLine contains \\r: ${JSON.stringify(task.rawLine)}`
                    );
                });
            });
        });

        it('should have byte-for-byte identical descriptions between LF and CRLF', () => {
            metadata.forEach(fixture => {
                const lfContent = loadFixture(`${fixture.name}-lf.md`);
                const crlfContent = loadFixture(`${fixture.name}-crlf.md`);

                const lfTasks = parseTasksFromContent(lfContent);
                const crlfTasks = parseTasksFromContent(crlfContent);

                for (let i = 0; i < lfTasks.length; i++) {
                    const lfChars = [...lfTasks[i].description];
                    const crlfChars = [...crlfTasks[i].description];

                    assert.strictEqual(
                        lfChars.length,
                        crlfChars.length,
                        `${fixture.name}: Task ${i + 1} description length mismatch`
                    );

                    for (let j = 0; j < lfChars.length; j++) {
                        assert.strictEqual(
                            crlfChars[j].charCodeAt(0),
                            lfChars[j].charCodeAt(0),
                            `${fixture.name}: Task ${i + 1} char ${j} mismatch ` +
                            `(CRLF: ${crlfChars[j].charCodeAt(0)}, LF: ${lfChars[j].charCodeAt(0)})`
                        );
                    }
                }
            });
        });
    });

    describe('Special line ending files', () => {
        it('should parse CR-only file (old Mac style)', () => {
            const content = loadFixture('21-cr-only.md');
            const tasks = parseTasksFromContent(content);

            // Should match first fixture which has 5 tasks
            assert.strictEqual(tasks.length, 5, 'CR-only file should parse 5 tasks');
            tasks.forEach((task, index) => {
                assert.strictEqual(
                    task.description.includes('\r'),
                    false,
                    `CR-only: Task ${index + 1} description should not contain \\r`
                );
            });
        });

        it('should parse mixed line endings file', () => {
            const content = loadFixture('22-mixed-line-endings.md');
            const tasks = parseTasksFromContent(content);

            assert.strictEqual(tasks.length, 5, 'Mixed line endings file should parse 5 tasks');
            tasks.forEach((task, index) => {
                assert.strictEqual(
                    task.description.includes('\r'),
                    false,
                    `Mixed endings: Task ${index + 1} description should not contain \\r`
                );
                assert.strictEqual(
                    task.rawLine.includes('\r'),
                    false,
                    `Mixed endings: Task ${index + 1} rawLine should not contain \\r`
                );
            });
        });
    });

    describe('Specific fixture validation', () => {
        it('should parse 01-simple correctly', () => {
            const lfTasks = parseTasksFromContent(loadFixture('01-simple-lf.md'));
            const crlfTasks = parseTasksFromContent(loadFixture('01-simple-crlf.md'));

            assert.strictEqual(lfTasks.length, 5);
            assert.strictEqual(crlfTasks.length, 5);
            assert.strictEqual(lfTasks[0].status, TaskStatus.PENDING);
            assert.strictEqual(crlfTasks[0].status, TaskStatus.PENDING);
        });

        it('should parse 03-mixed-status correctly', () => {
            const tasks = parseTasksFromContent(loadFixture('03-mixed-status-crlf.md'));

            assert.strictEqual(tasks.length, 7);
            assert.strictEqual(countByStatus(tasks, TaskStatus.COMPLETE), 3);
            assert.strictEqual(countByStatus(tasks, TaskStatus.IN_PROGRESS), 1);
            assert.strictEqual(countByStatus(tasks, TaskStatus.PENDING), 3);
        });

        it('should parse 04-multi-section correctly', () => {
            const tasks = parseTasksFromContent(loadFixture('04-multi-section-crlf.md'));

            assert.strictEqual(tasks.length, 9);
            assert.strictEqual(countByStatus(tasks, TaskStatus.COMPLETE), 2);
            assert.strictEqual(countByStatus(tasks, TaskStatus.PENDING), 5);
            assert.strictEqual(countByStatus(tasks, TaskStatus.IN_PROGRESS), 1);
            assert.strictEqual(countByStatus(tasks, TaskStatus.BLOCKED), 1);
        });

        it('should parse 06-asterisk-markers correctly', () => {
            const tasks = parseTasksFromContent(loadFixture('06-asterisk-markers-crlf.md'));

            assert.strictEqual(tasks.length, 5);
            // Verify asterisk markers work the same as dash
            tasks.forEach(task => {
                assert.ok(task.rawLine.startsWith('*'), 'All tasks should use asterisk marker');
            });
        });

        it('should parse 10-all-statuses correctly', () => {
            const tasks = parseTasksFromContent(loadFixture('10-all-statuses-crlf.md'));

            assert.strictEqual(tasks.length, 5);
            assert.strictEqual(tasks[0].status, TaskStatus.PENDING);
            assert.strictEqual(tasks[1].status, TaskStatus.COMPLETE);
            assert.strictEqual(tasks[2].status, TaskStatus.COMPLETE); // uppercase X
            assert.strictEqual(tasks[3].status, TaskStatus.IN_PROGRESS);
            assert.strictEqual(tasks[4].status, TaskStatus.BLOCKED);
        });

        it('should parse 11-meal-tracker-github-issue correctly (the original bug report)', () => {
            const lfTasks = parseTasksFromContent(loadFixture('11-meal-tracker-github-issue-lf.md'));
            const crlfTasks = parseTasksFromContent(loadFixture('11-meal-tracker-github-issue-crlf.md'));

            assert.strictEqual(lfTasks.length, 6, 'LF version should have 6 tasks');
            assert.strictEqual(crlfTasks.length, 6, 'CRLF version should have 6 tasks');

            // All should be pending in this PRD
            lfTasks.forEach((task, i) => {
                assert.strictEqual(task.status, TaskStatus.PENDING, `LF Task ${i + 1} should be pending`);
            });
            crlfTasks.forEach((task, i) => {
                assert.strictEqual(task.status, TaskStatus.PENDING, `CRLF Task ${i + 1} should be pending`);
            });
        });

        it('should parse 12-unicode-content correctly', () => {
            const tasks = parseTasksFromContent(loadFixture('12-unicode-content-crlf.md'));

            assert.strictEqual(tasks.length, 5);
            // Verify unicode characters are preserved
            assert.ok(tasks.some(t => t.description.includes('🚀')), 'Should contain emoji');
            assert.ok(tasks.some(t => t.description.includes('日本語')), 'Should contain Japanese');
            assert.ok(tasks.some(t => t.description.includes('中文')), 'Should contain Chinese');
        });

        it('should parse 13-windows-paths correctly', () => {
            const tasks = parseTasksFromContent(loadFixture('13-windows-paths-crlf.md'));

            assert.strictEqual(tasks.length, 5);
            assert.ok(tasks.some(t => t.description.includes('C:\\')), 'Should contain Windows path');
            assert.ok(tasks.some(t => t.description.includes('Program Files')), 'Should contain Program Files');
        });

        it('should parse 16-very-long-task correctly', () => {
            const tasks = parseTasksFromContent(loadFixture('16-very-long-task-crlf.md'));

            assert.strictEqual(tasks.length, 2);
            assert.ok(tasks[0].description.length > 600, 'First task should have long description');
        });

        it('should parse 18-no-trailing-newline correctly', () => {
            const tasks = parseTasksFromContent(loadFixture('18-no-trailing-newline-crlf.md'));

            assert.strictEqual(tasks.length, 2);
            assert.strictEqual(tasks[1].description.includes('\r'), false);
        });

        it('should parse 19-bom-file correctly', () => {
            const tasks = parseTasksFromContent(loadFixture('19-bom-file-crlf.md'));

            assert.strictEqual(tasks.length, 3);
            tasks.forEach((task, i) => {
                assert.strictEqual(
                    task.description.includes('\uFEFF'),
                    false,
                    `Task ${i + 1} should not contain BOM character`
                );
            });
        });
    });

    describe('Line number tracking', () => {
        it('should track correct line numbers with LF', () => {
            const tasks = parseTasksFromContent(loadFixture('01-simple-lf.md'));

            // Tasks start at line 7 in the simple fixture (after header, blank, overview header, desc, blank, tasks header)
            assert.ok(tasks[0].lineNumber > 0, 'First task should have positive line number');

            // Line numbers should be sequential for consecutive tasks
            for (let i = 1; i < tasks.length; i++) {
                assert.ok(
                    tasks[i].lineNumber > tasks[i - 1].lineNumber,
                    `Task ${i + 1} line number should be greater than task ${i}`
                );
            }
        });

        it('should track correct line numbers with CRLF', () => {
            const lfTasks = parseTasksFromContent(loadFixture('01-simple-lf.md'));
            const crlfTasks = parseTasksFromContent(loadFixture('01-simple-crlf.md'));

            // Line numbers should match between LF and CRLF
            for (let i = 0; i < lfTasks.length; i++) {
                assert.strictEqual(
                    crlfTasks[i].lineNumber,
                    lfTasks[i].lineNumber,
                    `Task ${i + 1} line number should match between LF and CRLF`
                );
            }
        });
    });

    describe('File encoding verification', () => {
        it('should verify CRLF files actually have CRLF line endings', () => {
            metadata.forEach(fixture => {
                const content = loadFixture(`${fixture.name}-crlf.md`);

                // File should contain at least one \r\n sequence
                assert.ok(
                    content.includes('\r\n'),
                    `${fixture.name}-crlf.md should contain CRLF line endings`
                );
            });
        });

        it('should verify LF files do NOT have CRLF line endings', () => {
            metadata.forEach(fixture => {
                const content = loadFixture(`${fixture.name}-lf.md`);

                // File should not contain \r\n sequence
                assert.strictEqual(
                    content.includes('\r\n'),
                    false,
                    `${fixture.name}-lf.md should not contain CRLF line endings`
                );
            });
        });

        it('should verify CR-only file has only CR line endings', () => {
            const content = loadFixture('21-cr-only.md');

            assert.strictEqual(content.includes('\r\n'), false, 'Should not have CRLF');
            assert.strictEqual(content.includes('\n'), false, 'Should not have LF');
            assert.ok(content.includes('\r'), 'Should have CR');
        });
    });

    describe('Edge cases in task parsing', () => {
        it('should parse empty content as no tasks', () => {
            const tasks = parseTasksFromContent('');
            assert.strictEqual(tasks.length, 0);
        });

        it('should parse content with no task markers as no tasks', () => {
            const content = '# Header\n\nJust some text without tasks\n\nMore text.';
            const tasks = parseTasksFromContent(content);
            assert.strictEqual(tasks.length, 0);
        });

        it('should parse single task correctly', () => {
            const content = '- [ ] Single task';
            const tasks = parseTasksFromContent(content);
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, 'Single task');
            assert.strictEqual(tasks[0].status, TaskStatus.PENDING);
        });

        it('should parse task with leading spaces in description', () => {
            const content = '- [ ]    Task with leading spaces';
            const tasks = parseTasksFromContent(content);
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, 'Task with leading spaces');
        });

        it('should parse task with trailing spaces in description', () => {
            const content = '- [ ] Task with trailing spaces   ';
            const tasks = parseTasksFromContent(content);
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, 'Task with trailing spaces');
        });

        it('should parse task with numbers in description', () => {
            const content = '- [ ] Task 123 with numbers 456';
            const tasks = parseTasksFromContent(content);
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, 'Task 123 with numbers 456');
        });

        it('should parse task with special characters', () => {
            const content = '- [ ] Task with special: @#$%^&*()';
            const tasks = parseTasksFromContent(content);
            assert.strictEqual(tasks.length, 1);
            assert.ok(tasks[0].description.includes('@#$%^&*()'));
        });

        it('should parse task with colon in description', () => {
            const content = '- [ ] Task: this has a colon';
            const tasks = parseTasksFromContent(content);
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, 'Task: this has a colon');
        });

        it('should parse task with markdown links in description', () => {
            const content = '- [ ] Add [link](https://example.com) to page';
            const tasks = parseTasksFromContent(content);
            assert.strictEqual(tasks.length, 1);
            assert.ok(tasks[0].description.includes('[link](https://example.com)'));
        });

        it('should parse task with inline code in description', () => {
            const content = '- [ ] Fix bug in `function_name()` method';
            const tasks = parseTasksFromContent(content);
            assert.strictEqual(tasks.length, 1);
            assert.ok(tasks[0].description.includes('`function_name()`'));
        });

        it('should not parse malformed checkbox (missing space)', () => {
            const content = '- [] This is not a valid task';
            const tasks = parseTasksFromContent(content);
            assert.strictEqual(tasks.length, 0);
        });

        it('should not parse malformed checkbox (missing bracket)', () => {
            const content = '- [ This is not a valid task';
            const tasks = parseTasksFromContent(content);
            assert.strictEqual(tasks.length, 0);
        });

        it('should not parse plain bullet point as task', () => {
            const content = '- This is not a task\n- Neither is this';
            const tasks = parseTasksFromContent(content);
            assert.strictEqual(tasks.length, 0);
        });

        it('should generate unique task IDs', () => {
            const content = '- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3';
            const tasks = parseTasksFromContent(content);
            const ids = tasks.map(t => t.id);
            const uniqueIds = new Set(ids);
            assert.strictEqual(uniqueIds.size, ids.length);
        });

        it('should preserve original raw line', () => {
            const content = '- [ ] Original task text';
            const tasks = parseTasksFromContent(content);
            assert.strictEqual(tasks[0].rawLine, '- [ ] Original task text');
        });

        it('should handle task at very first line', () => {
            const content = '- [ ] First line task';
            const tasks = parseTasksFromContent(content);
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].lineNumber, 1);
        });

        it('should handle very long task description', () => {
            const longDesc = 'A'.repeat(1000);
            const content = `- [ ] ${longDesc}`;
            const tasks = parseTasksFromContent(content);
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, longDesc);
        });

        it('should parse uppercase X as complete', () => {
            const content = '- [X] Completed with uppercase X';
            const tasks = parseTasksFromContent(content);
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].status, TaskStatus.COMPLETE);
        });

        it('should parse lowercase x as complete', () => {
            const content = '- [x] Completed with lowercase x';
            const tasks = parseTasksFromContent(content);
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].status, TaskStatus.COMPLETE);
        });

        it('should handle multiple spaces between checkbox and text', () => {
            const content = '- [ ]     Multiple spaces before text';
            const tasks = parseTasksFromContent(content);
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, 'Multiple spaces before text');
        });

        it('should not parse indented tasks as top-level tasks', () => {
            const content = '  - [ ] Indented task';
            const tasks = parseTasksFromContent(content);
            // Indented tasks should not match the regex
            assert.strictEqual(tasks.length, 0);
        });

        it('should handle tasks mixed with other markdown content', () => {
            const content = `# Header

Some paragraph text.

- [ ] Task 1

More text here.

- [x] Task 2

## Another header

- [ ] Task 3`;
            const tasks = parseTasksFromContent(content);
            assert.strictEqual(tasks.length, 3);
            assert.strictEqual(tasks[0].status, TaskStatus.PENDING);
            assert.strictEqual(tasks[1].status, TaskStatus.COMPLETE);
            assert.strictEqual(tasks[2].status, TaskStatus.PENDING);
        });

        it('should handle content with only whitespace lines between tasks', () => {
            const content = '- [ ] Task 1\n\n\n\n- [ ] Task 2';
            const tasks = parseTasksFromContent(content);
            assert.strictEqual(tasks.length, 2);
        });

        it('should handle content ending without newline', () => {
            const content = '- [ ] Task without trailing newline';
            const tasks = parseTasksFromContent(content);
            assert.strictEqual(tasks.length, 1);
        });

        it('should handle task with emoji in description', () => {
            const content = '- [ ] Add 🚀 emoji support';
            const tasks = parseTasksFromContent(content);
            assert.strictEqual(tasks.length, 1);
            assert.ok(tasks[0].description.includes('🚀'));
        });

        it('should handle task with unicode characters', () => {
            const content = '- [ ] 日本語タスク（Japanese task）';
            const tasks = parseTasksFromContent(content);
            assert.strictEqual(tasks.length, 1);
            assert.ok(tasks[0].description.includes('日本語'));
        });

        it('should not parse nested checkbox syntax', () => {
            const content = '- [ ] Task with nested - [ ] checkbox';
            const tasks = parseTasksFromContent(content);
            // Should only parse the outer task
            assert.strictEqual(tasks.length, 1);
            assert.ok(tasks[0].description.includes('nested - [ ] checkbox'));
        });
    });
});
