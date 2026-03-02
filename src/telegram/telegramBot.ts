import fetch from '../fetchShim';
import { getTelegramBotToken, getTelegramChatId } from './telegramConfig';

export class TelegramBot {
    private token: string | undefined;
    private apiUrl: string;

    private updateOffset: number = 0;
    private defaultChatId: string | undefined;
    private isFetching: boolean = false;
    private fetchPromise: Promise<any[]> | null = null;

    constructor() {
        this.token = getTelegramBotToken();
        this.apiUrl = this.token ? `https://api.telegram.org/bot${this.token}` : '';
        this.updateOffset = 0;

        this.defaultChatId = getTelegramChatId();
    }

    public getApiUrl(): string {
        return this.apiUrl;
    }

    isEnabled(): boolean {
        return !!this.token;
    }

    async getMe(): Promise<any> {
        if (!this.isEnabled()) return null;
        const res = await fetch(`${this.apiUrl}/getMe`);
        return res.json();
    }

    /**
     * Escapes characters for HTML parse_mode
     */
    public static escapeHtml(text: string): string {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    async sendMessage(text: string, chatId?: string | number, replyMarkup?: any): Promise<boolean> {
        if (!this.isEnabled()) return false;
        const targetChatId = chatId || this.defaultChatId;
        if (!targetChatId) {
            console.warn('TelegramBot: No chat_id provided and RALPH_TELEGRAM_CHAT_ID is not set.');
            return false;
        }

        try {
            const bodyPayload: any = {
                chat_id: targetChatId,
                text: text,
                parse_mode: 'HTML' // Optional, but good for formatting. Will fix issue: HTML/Markdown parsing
            };

            if (replyMarkup) {
                bodyPayload.reply_markup = replyMarkup;
            }

            const res = await fetch(`${this.apiUrl}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            });
            const data = await res.json();
            return !!data.ok;
        } catch (err) {
            console.error('TelegramBot: sendMessage failed', err);
            return false;
        }
    }

    async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<boolean> {
        if (!this.isEnabled()) return false;

        try {
            const bodyPayload: any = { callback_query_id: callbackQueryId };
            if (text) bodyPayload.text = text;

            const res = await fetch(`${this.apiUrl}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            });
            const data = await res.json();
            return !!data.ok;
        } catch (err) {
            console.error('TelegramBot: answerCallbackQuery failed', err);
            return false;
        }
    }

    async getFileLink(fileId: string): Promise<string | null> {
        if (!this.isEnabled()) return null;
        try {
            const res = await fetch(`${this.apiUrl}/getFile?file_id=${fileId}`);
            const data = await res.json();
            if (data.ok && data.result) {
                return `https://api.telegram.org/file/bot${this.token}/${data.result.file_path}`;
            }
        } catch (err) {
            console.error('TelegramBot: getFile error', err);
        }
        return null;
    }

    /**
     * Fetch new Telegram messages using long polling (getUpdates)
     * Returns array of updates, and advances offset to prevent duplicates
     */
    async fetchBotMessages(timeoutSec: number = 10): Promise<any[]> {
        if (!this.isEnabled()) return [];

        // If already fetching, return the existing promise to queue up waiters
        if (this.fetchPromise) {
            return this.fetchPromise;
        }

        this.fetchPromise = (async () => {
            try {
                const url = `${this.apiUrl}/getUpdates?timeout=${timeoutSec}${this.updateOffset ? `&offset=${this.updateOffset}` : ''}`;
                const res = await fetch(url);
                const data = await res.json();

                if (data.ok && Array.isArray(data.result)) {
                    // Advance offset to last update_id + 1
                    if (data.result.length > 0) {
                        const lastUpdateId = data.result[data.result.length - 1].update_id;
                        this.updateOffset = lastUpdateId + 1;
                    }
                    return data.result;
                }
                return [];
            } catch (err) {
                console.error('TelegramBot: fetchBotMessages error', err);
                return [];
            } finally {
                this.fetchPromise = null;
                this.isFetching = false;
            }
        })();

        this.isFetching = true;
        return this.fetchPromise;
    }

    async setMyCommands(commands: { command: string; description: string }[]): Promise<boolean> {
        if (!this.isEnabled()) return false;
        try {
            const res = await fetch(`${this.apiUrl}/setMyCommands`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ commands })
            });
            const data = await res.json();
            return !!data.ok;
        } catch (err) {
            console.error('TelegramBot: setMyCommands failed', err);
            return false;
        }
    }
}
