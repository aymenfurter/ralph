import * as assert from 'assert';
import {
    getTelegramBotToken,
    getTelegramChatId,
    getTelegramAllowedUsers,
    getTelegramStatusUpdateInterval,
    getOpenAIKey
} from '../../../telegram/telegramConfig';

describe('telegramConfig', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('getTelegramBotToken', () => {
        it('returns undefined when RALPH_TELEGRAM_BOT_TOKEN is not set', () => {
            delete process.env.RALPH_TELEGRAM_BOT_TOKEN;
            assert.strictEqual(getTelegramBotToken(), undefined);
        });

        it('returns token when RALPH_TELEGRAM_BOT_TOKEN is set', () => {
            process.env.RALPH_TELEGRAM_BOT_TOKEN = 'test-token';
            assert.strictEqual(getTelegramBotToken(), 'test-token');
        });
    });

    describe('getTelegramChatId', () => {
        it('returns undefined when RALPH_TELEGRAM_CHAT_ID is not set', () => {
            delete process.env.RALPH_TELEGRAM_CHAT_ID;
            assert.strictEqual(getTelegramChatId(), undefined);
        });

        it('returns chat ID when RALPH_TELEGRAM_CHAT_ID is set', () => {
            process.env.RALPH_TELEGRAM_CHAT_ID = '123456';
            assert.strictEqual(getTelegramChatId(), '123456');
        });
    });

    describe('getTelegramAllowedUsers', () => {
        it('returns empty array when RALPH_TELEGRAM_ALLOWED_USERS is not set', () => {
            delete process.env.RALPH_TELEGRAM_ALLOWED_USERS;
            assert.deepStrictEqual(getTelegramAllowedUsers(), []);
        });

        it('returns array of users when RALPH_TELEGRAM_ALLOWED_USERS is set', () => {
            process.env.RALPH_TELEGRAM_ALLOWED_USERS = 'user1,user2,user3';
            assert.deepStrictEqual(getTelegramAllowedUsers(), ['user1', 'user2', 'user3']);
        });

        it('trims whitespace from users', () => {
            process.env.RALPH_TELEGRAM_ALLOWED_USERS = ' user1 , user2 ';
            assert.deepStrictEqual(getTelegramAllowedUsers(), ['user1', 'user2']);
        });

        it('filters empty strings', () => {
            process.env.RALPH_TELEGRAM_ALLOWED_USERS = 'user1,,user2';
            assert.deepStrictEqual(getTelegramAllowedUsers(), ['user1', 'user2']);
        });
    });

    describe('getTelegramStatusUpdateInterval', () => {
        it('returns 0 when RALPH_TELEGRAM_STATUS_INTERVAL is not set', () => {
            delete process.env.RALPH_TELEGRAM_STATUS_INTERVAL;
            assert.strictEqual(getTelegramStatusUpdateInterval(), 0);
        });

        it('returns interval when RALPH_TELEGRAM_STATUS_INTERVAL is set', () => {
            process.env.RALPH_TELEGRAM_STATUS_INTERVAL = '60000';
            assert.strictEqual(getTelegramStatusUpdateInterval(), 60000);
        });

        it('returns 0 when RALPH_TELEGRAM_STATUS_INTERVAL is invalid', () => {
            process.env.RALPH_TELEGRAM_STATUS_INTERVAL = 'invalid';
            assert.strictEqual(getTelegramStatusUpdateInterval(), 0);
        });
    });

    describe('getOpenAIKey', () => {
        it('returns undefined when no key is set', () => {
            delete process.env.RALPH_OPENAI_API_KEY;
            delete process.env.OPENAI_API_KEY;
            assert.strictEqual(getOpenAIKey(), undefined);
        });

        it('returns RALPH_OPENAI_API_KEY when set', () => {
            process.env.RALPH_OPENAI_API_KEY = 'ralph-key';
            delete process.env.OPENAI_API_KEY;
            assert.strictEqual(getOpenAIKey(), 'ralph-key');
        });

        it('returns OPENAI_API_KEY when RALPH_OPENAI_API_KEY is not set', () => {
            delete process.env.RALPH_OPENAI_API_KEY;
            process.env.OPENAI_API_KEY = 'openai-key';
            assert.strictEqual(getOpenAIKey(), 'openai-key');
        });

        it('prefers RALPH_OPENAI_API_KEY over OPENAI_API_KEY', () => {
            process.env.RALPH_OPENAI_API_KEY = 'ralph-key';
            process.env.OPENAI_API_KEY = 'openai-key';
            assert.strictEqual(getOpenAIKey(), 'ralph-key');
        });
    });
});

