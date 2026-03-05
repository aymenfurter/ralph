export function getTelegramBotToken(): string | undefined {
    return process.env.RALPH_TELEGRAM_BOT_TOKEN;
}

export function getTelegramChatId(): string | undefined {
    return process.env.RALPH_TELEGRAM_CHAT_ID;
}

export function getTelegramAllowedUsers(): string[] {
    const val = process.env.RALPH_TELEGRAM_ALLOWED_USERS;
    if (!val) return [];

    return val.split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
}

export function getTelegramStatusUpdateInterval(): number {
    const val = process.env.RALPH_TELEGRAM_STATUS_INTERVAL;
    if (!val) return 0;
    const interval = parseInt(val, 10);
    return isNaN(interval) ? 0 : interval;
}

export function getOpenAIKey(): string | undefined {
    return process.env.RALPH_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
}
