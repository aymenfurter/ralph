import * as fs from 'fs';
import * as path from 'path';
import { getWorkspaceRoot } from '../fileUtils';

let cachedEnvFile: Record<string, string> | null = null;

function parseDotEnv(content: string): Record<string, string> {
    const env: Record<string, string> = {};
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }

        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) {
            continue;
        }

        const key = trimmed.substring(0, eqIndex).trim();
        let value = trimmed.substring(eqIndex + 1).trim();

        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.substring(1, value.length - 1);
        }

        if (key) {
            env[key] = value;
        }
    }

    return env;
}

function getEnvFileValue(key: string): string | undefined {
    if (cachedEnvFile === null) {
        const root = getWorkspaceRoot();
        if (!root) {
            cachedEnvFile = {};
        } else {
            const envPath = path.join(root, '.env');
            try {
                if (fs.existsSync(envPath)) {
                    const content = fs.readFileSync(envPath, 'utf-8');
                    cachedEnvFile = parseDotEnv(content);
                } else {
                    cachedEnvFile = {};
                }
            } catch {
                cachedEnvFile = {};
            }
        }
    }

    return cachedEnvFile[key];
}

function getEnvValue(key: string): string | undefined {
    return process.env[key] || getEnvFileValue(key);
}

export function getTelegramBotToken(): string | undefined {
    return getEnvValue('RALPH_TELEGRAM_BOT_TOKEN');
}

export function getTelegramChatId(): string | undefined {
    return getEnvValue('RALPH_TELEGRAM_CHAT_ID');
}

export function getTelegramAllowedUsers(): string[] {
    const val = getEnvValue('RALPH_TELEGRAM_ALLOWED_USERS');
    if (!val) return [];

    return val.split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
}

export function getTelegramStatusUpdateInterval(): number {
    const val = getEnvValue('RALPH_TELEGRAM_STATUS_INTERVAL');
    if (!val) return 0;
    const interval = parseInt(val, 10);
    return isNaN(interval) ? 0 : interval;
}

export function getOpenAIKey(): string | undefined {
    return getEnvValue('RALPH_OPENAI_API_KEY') || getEnvValue('OPENAI_API_KEY');
}
