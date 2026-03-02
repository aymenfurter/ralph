import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as http from 'http';
import * as https from 'https';
import fetch from 'node-fetch'; // Requires node-fetch ^2.x for CommonJS stream piping if needed, but we can use fs

import { Task, TaskStatus } from './types';
import { getConfig } from './config';
import { logError } from './logger';

export async function downloadFile(url: string, destPath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        const protocol = url.startsWith('https') ? https : http;
        const request = protocol.get(url, (response) => {
            if (response.statusCode !== 200) {
                fs.unlink(destPath, () => { }); // Delete the file async
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(); // close() is async, call resolve after close completes.
                resolve(true);
            });
        });

        request.on('error', (err) => {
            fs.unlink(destPath, () => { }); // Delete the file async
            reject(err);
        });

        file.on('error', (err) => {
            fs.unlink(destPath, () => { }); // Delete the file async
            reject(err);
        });
    });
}

export function ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

export function getWorkspaceRoot(): string | null {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        return workspaceFolders[0].uri.fsPath;
    }
    return null;
}

export async function readPRDAsync(): Promise<string | null> {
    const config = getConfig();
    const root = getWorkspaceRoot();
    if (!root) { return null; }

    const prdPath = path.join(root, config.files.prdPath);
    try {
        await fsPromises.access(prdPath);
        return await fsPromises.readFile(prdPath, 'utf-8');
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            logError('Failed to read PRD.md', error);
        }
        return null;
    }
}

export async function readProgressAsync(): Promise<string> {
    const config = getConfig();
    const root = getWorkspaceRoot();
    if (!root) { return ''; }

    const progressPath = path.join(root, config.files.progressPath);
    try {
        await fsPromises.access(progressPath);
        return await fsPromises.readFile(progressPath, 'utf-8');
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            logError('Failed to read progress.txt', error);
        }
        return '';
    }
}

export async function appendProgressAsync(entry: string): Promise<boolean> {
    const config = getConfig();
    const root = getWorkspaceRoot();
    if (!root) { return false; }

    const progressPath = path.join(root, config.files.progressPath);
    try {
        const timestamp = new Date().toISOString();
        const formattedEntry = `[${timestamp}] ${entry}\n`;
        await fsPromises.appendFile(progressPath, formattedEntry, 'utf-8');
        return true;
    } catch (error) {
        logError('Failed to append to progress.txt', error);
        return false;
    }
}

export async function ensureProgressFileAsync(): Promise<boolean> {
    const config = getConfig();
    const root = getWorkspaceRoot();
    if (!root) { return false; }

    const progressPath = path.join(root, config.files.progressPath);
    try {
        await fsPromises.access(progressPath);
        return true;
    } catch {
        // File doesn't exist, create it
        try {
            await fsPromises.writeFile(progressPath, '# Progress Log\n\n', 'utf-8');
            return true;
        } catch (error) {
            logError('Failed to create progress.txt', error);
            return false;
        }
    }
}

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

export async function parseTasksAsync(): Promise<Task[]> {
    const content = await readPRDAsync();
    if (!content) { return []; }
    return parseTasksFromContent(content);
}

export async function getNextTaskAsync(): Promise<Task | null> {
    const tasks = await parseTasksAsync();
    return tasks.find(t => t.status === TaskStatus.PENDING || t.status === TaskStatus.IN_PROGRESS) || null;
}

export async function getTaskStatsAsync(): Promise<{ total: number; completed: number; pending: number }> {
    const tasks = await parseTasksAsync();
    return {
        total: tasks.length,
        completed: tasks.filter(t => t.status === TaskStatus.COMPLETE).length,
        pending: tasks.filter(t => t.status === TaskStatus.PENDING || t.status === TaskStatus.IN_PROGRESS).length
    };
}

export async function appendTaskToPrdAsync(taskDescription: string): Promise<boolean> {
    const config = getConfig();
    const root = getWorkspaceRoot();
    if (!root) { return false; }

    const prdPath = path.join(root, config.files.prdPath);
    try {
        await fsPromises.access(prdPath);
        let content = await fsPromises.readFile(prdPath, 'utf-8');

        // Look for "## Tasks" section
        const tasksHeaderRegex = /^##\s+Tasks/m;
        const match = tasksHeaderRegex.exec(content);

        if (match) {
            const headerEndIndex = match.index + match[0].length;
            const contentAfterHeader = content.substring(headerEndIndex);

            // Find the start of the next section (line starting with #)
            // ensuring we don't pick up task lists or comments.
            // A section header must be at the start of a line.
            const nextHeaderRegex = /^#+\s+/m;
            const nextHeaderMatch = nextHeaderRegex.exec(contentAfterHeader);

            let insertionIndex: number;

            if (nextHeaderMatch) {
                // Insert before the next header starts
                insertionIndex = headerEndIndex + nextHeaderMatch.index;
            } else {
                // Append to end of file
                insertionIndex = content.length;
            }

            // Construct the new task line
            const newTaskLine = `- [ ] ${taskDescription.trim()}`;

            const precedingContent = content.substring(0, insertionIndex);
            const trailingContent = content.substring(insertionIndex);

            // Ensure we have a newline before the new task if preceding content doesn't end with one
            const needsPreNewline = precedingContent.length > 0 && !precedingContent.endsWith('\n');

            // Ensure we have a newline after the new task if there is subsequent content
            const needsPostNewline = trailingContent.length > 0 && !trailingContent.startsWith('\n');

            let insertionText = '';
            if (needsPreNewline) insertionText += '\n';
            insertionText += newTaskLine;
            // If we are at the end of the file, add a newline
            if (needsPostNewline || (trailingContent.length === 0)) insertionText += '\n';
            else if (trailingContent.length > 0 && !trailingContent.startsWith('\n\n') && nextHeaderMatch) {
                // If inserting before a header, ensure blank line padding?
                // Minimal markdown requires just a newline usually, but nice formatting prefers blank line.
                // But let's stick to minimal valid markdown for now.
                insertionText += '\n';
            }

            const newContent = precedingContent + insertionText + trailingContent;

            await fsPromises.writeFile(prdPath, newContent, 'utf-8');
            return true;
        } else {
            // No Tasks section found
            return false;
        }
    } catch (error) {
        logError('Failed to append task to PRD.md', error);
        return false;
    }
}

export async function readFileAsync(relativePath: string): Promise<string | null> {
    const root = getWorkspaceRoot();
    if (!root) { return null; }

    const filePath = path.resolve(root, relativePath);
    if (!filePath.startsWith(root)) {
        return null;
    }
    try {
        await fsPromises.access(filePath);
        return await fsPromises.readFile(filePath, 'utf-8');
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            logError(`Failed to read file: ${relativePath}`, error);
        }
        return null;
    }
}

export async function listDirectoryContentsAsync(dirPath: string): Promise<{ name: string; isDirectory: boolean }[] | null> {
    const root = getWorkspaceRoot();
    if (!root) { return null; }

    const fullPath = path.join(root, dirPath);
    try {
        await fsPromises.access(fullPath);
        const stats = await fsPromises.stat(fullPath);

        if (!stats.isDirectory()) {
            return null; // Not a directory
        }

        const entries = await fsPromises.readdir(fullPath, { withFileTypes: true });
        return entries.map(entry => ({
            name: entry.name,
            isDirectory: entry.isDirectory()
        })).sort((a, b) => {
            // Directories first, then files
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });
    } catch (error) {
        logError(`Failed to list directory contents for ${dirPath}`, error);
        return null;
    }
}
