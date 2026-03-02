import * as fs from 'fs';
import * as path from 'path';

export function getTelegramBotToken(): string | undefined {
    // Try to load .env from workspace root
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) return undefined;
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/^RALPH_TELEGRAM_BOT_TOKEN=(.+)$/m);
    return match ? match[1].trim() : undefined;
}

export function getTelegramChatId(): string | undefined {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) return undefined;
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/^RALPH_TELEGRAM_CHAT_ID=(.+)$/m);
    return match ? match[1].trim() : undefined;
}

export function getTelegramAllowedUsers(): string[] {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) return [];
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/^RALPH_TELEGRAM_ALLOWED_USERS=(.+)$/m);
    if (!match) return [];
    return match[1].split(',').map(s => s.trim());
}

export function getTelegramStatusUpdateInterval(): number {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) return 0;
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/^RALPH_TELEGRAM_STATUS_INTERVAL=(.+)$/m);
    if (!match) return 0;
    const interval = parseInt(match[1].trim(), 10);
    return isNaN(interval) ? 0 : interval;
}

export function getOpenAIKey(): string | undefined {
    // Try to load .env from workspace root
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) return undefined;
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/^(?:RALPH_)?OPENAI_API_KEY=(.+)$/m);
    return match ? match[1].trim() : undefined;
}
