import * as assert from 'assert';
import { Task, TaskStatus } from '../../types';

// Since fileUtils imports vscode modules, we test the pure parsing logic
// by re-implementing the parseTasksFromContent function here for unit testing purposes.
// This approach is consistent with other unit tests in this project (see promptBuilder.unit.test.ts)
// and allows us to test the regex logic without requiring the full VS Code environment.
// The actual integration testing happens in the VS Code test environment.

function parseTasksFromContent(content: string): Task[] {
    const tasks: Task[] = [];
    const lines = content.split('\n');

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

describe('FileUtils - Task Parsing Regex', () => {
    describe('Basic checkbox formats', () => {
        it('should parse unchecked task with dash', () => {
            const content = '- [ ] Set up project structure with dependencies';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, 'Set up project structure with dependencies');
            assert.strictEqual(tasks[0].status, TaskStatus.PENDING);
        });

        it('should parse unchecked task with asterisk', () => {
            const content = '* [ ] Create core data models and types';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, 'Create core data models and types');
            assert.strictEqual(tasks[0].status, TaskStatus.PENDING);
        });

        it('should parse checked task with dash', () => {
            const content = '- [x] Implement main application logic';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, 'Implement main application logic');
            assert.strictEqual(tasks[0].status, TaskStatus.COMPLETE);
        });

        it('should parse checked task with asterisk', () => {
            const content = '* [x] Add user interface and styling';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, 'Add user interface and styling');
            assert.strictEqual(tasks[0].status, TaskStatus.COMPLETE);
        });

        it('should parse in-progress task', () => {
            const content = '- [~] Write tests and documentation';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, 'Write tests and documentation');
            assert.strictEqual(tasks[0].status, TaskStatus.IN_PROGRESS);
        });

        it('should parse blocked task', () => {
            const content = '- [!] Fix critical bug in authentication';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, 'Fix critical bug in authentication');
            assert.strictEqual(tasks[0].status, TaskStatus.BLOCKED);
        });
    });

    describe('Whitespace variations', () => {
        it('should parse task with single space after marker', () => {
            const content = '- [ ] Task with single space';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, 'Task with single space');
        });

        it('should parse task with multiple spaces after marker', () => {
            const content = '-    [ ] Task with multiple spaces';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, 'Task with multiple spaces');
        });

        it('should parse task with multiple spaces after checkbox', () => {
            const content = '- [ ]    Task with spaces after checkbox';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, 'Task with spaces after checkbox');
        });

        it('should parse task with tab after marker', () => {
            const content = '-\t[ ] Task with tab';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, 'Task with tab');
        });

        it('should parse task with trailing whitespace in description', () => {
            const content = '- [ ] Task with trailing spaces   ';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, 'Task with trailing spaces');
        });
    });

    describe('Case sensitivity', () => {
        it('should parse uppercase X as complete', () => {
            const content = '- [X] Task with uppercase X';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].status, TaskStatus.COMPLETE);
        });

        it('should parse lowercase x as complete', () => {
            const content = '- [x] Task with lowercase x';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].status, TaskStatus.COMPLETE);
        });
    });

    describe('Multiple tasks in document', () => {
        it('should parse multiple tasks from PRD example', () => {
            const content = `# My Project

## Overview
Brief description of what you're building.

## Tasks
- [x] Set up project structure with dependencies
- [x] Create core data models and types
- [ ] Implement main application logic
- [ ] Add user interface and styling
- [ ] Write tests and documentation`;
            
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 5);
            assert.strictEqual(tasks[0].description, 'Set up project structure with dependencies');
            assert.strictEqual(tasks[0].status, TaskStatus.COMPLETE);
            assert.strictEqual(tasks[1].description, 'Create core data models and types');
            assert.strictEqual(tasks[1].status, TaskStatus.COMPLETE);
            assert.strictEqual(tasks[2].description, 'Implement main application logic');
            assert.strictEqual(tasks[2].status, TaskStatus.PENDING);
            assert.strictEqual(tasks[3].description, 'Add user interface and styling');
            assert.strictEqual(tasks[3].status, TaskStatus.PENDING);
            assert.strictEqual(tasks[4].description, 'Write tests and documentation');
            assert.strictEqual(tasks[4].status, TaskStatus.PENDING);
        });

        it('should parse mixed task markers', () => {
            const content = `- [ ] First task with dash
* [ ] Second task with asterisk
- [x] Third task completed
* [~] Fourth task in progress`;
            
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 4);
            assert.strictEqual(tasks[0].description, 'First task with dash');
            assert.strictEqual(tasks[1].description, 'Second task with asterisk');
            assert.strictEqual(tasks[2].status, TaskStatus.COMPLETE);
            assert.strictEqual(tasks[3].status, TaskStatus.IN_PROGRESS);
        });
    });

    describe('Edge cases and special characters', () => {
        it('should parse task with special characters in description', () => {
            const content = '- [ ] Task with special chars: @#$%^&*()';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, 'Task with special chars: @#$%^&*()');
        });

        it('should parse task with punctuation', () => {
            const content = '- [ ] Add authentication & authorization (OAuth 2.0)';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, 'Add authentication & authorization (OAuth 2.0)');
        });

        it('should parse task with numbers', () => {
            const content = '- [ ] Configure port 3000 for development server';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, 'Configure port 3000 for development server');
        });

        it('should parse task with backticks', () => {
            const content = '- [ ] Update `package.json` with dependencies';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, 'Update `package.json` with dependencies');
        });

        it('should parse task with quotes', () => {
            const content = '- [ ] Add "feature" to the application';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, 'Add "feature" to the application');
        });

        it('should parse task with emojis', () => {
            const content = '- [ ] 🚀 Deploy to production';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, '🚀 Deploy to production');
        });
    });

    describe('Non-matching patterns', () => {
        it('should not match task without checkbox', () => {
            const content = '- Just a regular list item';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 0);
        });

        it('should not match task with indentation', () => {
            const content = '  - [ ] Indented task';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 0);
        });

        it('should not match task with invalid checkbox marker', () => {
            const content = '- [y] Invalid checkbox marker';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 0);
        });

        it('should not match plain text', () => {
            const content = 'This is just plain text';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 0);
        });

        it('should not match task starting with number', () => {
            const content = '1. [ ] Numbered list with checkbox';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 0);
        });
    });

    describe('Line number tracking', () => {
        it('should track correct line numbers', () => {
            const content = `Line 1: heading
Line 2: text
- [ ] Task on line 3
Line 4: more text
- [x] Task on line 5`;
            
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 2);
            assert.strictEqual(tasks[0].lineNumber, 3);
            assert.strictEqual(tasks[1].lineNumber, 5);
        });
    });

    describe('Task description content', () => {
        it('should parse task with long description', () => {
            const content = '- [ ] This is a very long task description that contains multiple words and explains in detail what needs to be done';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, 'This is a very long task description that contains multiple words and explains in detail what needs to be done');
        });

        it('should parse task with URL', () => {
            const content = '- [ ] Check documentation at https://example.com/docs';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, 'Check documentation at https://example.com/docs');
        });

        it('should parse task with file path', () => {
            const content = '- [ ] Update src/components/Header.tsx';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 1);
            assert.strictEqual(tasks[0].description, 'Update src/components/Header.tsx');
        });
    });

    describe('Empty and malformed input', () => {
        it('should handle empty string', () => {
            const content = '';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 0);
        });

        it('should handle string with only newlines', () => {
            const content = '\n\n\n';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 0);
        });

        it('should handle malformed checkbox (missing closing bracket)', () => {
            const content = '- [ Task without closing bracket';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 0);
        });

        it('should handle malformed checkbox (missing opening bracket)', () => {
            const content = '- ] Task without opening bracket';
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 0);
        });
    });

    describe('Real-world PRD examples', () => {
        it('should parse realistic PRD from README example', () => {
            const content = `# My Project

## Overview
Brief description of what you're building.

## Tasks
- [ ] Set up project structure with dependencies
- [ ] Create core data models and types
- [ ] Implement main application logic
- [ ] Add user interface and styling
- [ ] Write tests and documentation

## Technical Details
Using React, TypeScript, and Tailwind CSS`;
            
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 5);
            tasks.forEach(task => {
                assert.strictEqual(task.status, TaskStatus.PENDING);
            });
        });

        it('should parse PRD with completed and pending tasks', () => {
            const content = `# Todo App

## Tasks
- [x] Set up React project with TypeScript
- [x] Install Tailwind CSS
- [x] Create basic component structure
- [~] Implement add todo functionality
- [ ] Implement delete functionality
- [ ] Implement mark as complete
- [ ] Add styling and animations`;
            
            const tasks = parseTasksFromContent(content);
            
            assert.strictEqual(tasks.length, 7);
            assert.strictEqual(tasks[0].status, TaskStatus.COMPLETE);
            assert.strictEqual(tasks[1].status, TaskStatus.COMPLETE);
            assert.strictEqual(tasks[2].status, TaskStatus.COMPLETE);
            assert.strictEqual(tasks[3].status, TaskStatus.IN_PROGRESS);
            assert.strictEqual(tasks[4].status, TaskStatus.PENDING);
            assert.strictEqual(tasks[5].status, TaskStatus.PENDING);
            assert.strictEqual(tasks[6].status, TaskStatus.PENDING);
        });
    });
});
