import * as assert from 'assert';
import { TelegramBot } from '../../../telegram/telegramBot';

describe('TelegramBot', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
    });

    afterEach(() => {
        process.env = originalEnv;
        // Clean up require cache
        delete require.cache[require.resolve('../../../telegram/telegramBot')];
        delete require.cache[require.resolve('../../../fetchShim')];
    });

    it('is disabled when no token', () => {
        delete process.env.RALPH_TELEGRAM_BOT_TOKEN;

        delete require.cache[require.resolve('../../../telegram/telegramBot')];
        const { TelegramBot } = require('../../../telegram/telegramBot');

        const bot = new TelegramBot();
        assert.strictEqual(bot.isEnabled(), false);
        assert.strictEqual(bot.getApiUrl(), '');
    });

    it('is enabled when token present and getMe returns data', async () => {
        process.env.RALPH_TELEGRAM_BOT_TOKEN = 'tok-xyz';

        // Mock fetch
        delete require.cache[require.resolve('../../../fetchShim')];
        const fetchShim = require('../../../fetchShim');

        let lastUrl = '';
        // Mock the default export of fetchShim
        // Note: fetchShim exports a default function
        require('../../../fetchShim').default = async (url: string) => {
            lastUrl = url;
            return {
                json: async () => ({ ok: true, result: { id: 123, is_bot: true } }),
            };
        };

        // Reload TelegramBot
        delete require.cache[require.resolve('../../../telegram/telegramBot')];
        const { TelegramBot } = require('../../../telegram/telegramBot');

        const bot = new TelegramBot();

        assert.strictEqual(bot.isEnabled(), true);
        assert.ok(bot.getApiUrl().includes('tok-xyz'));

        const me = await bot.getMe();
        assert.deepStrictEqual(me, { ok: true, result: { id: 123, is_bot: true } });
        assert.ok(lastUrl.endsWith('/getMe'));
    });

    it('fetchBotMessages advances offset and returns results', async () => {
        process.env.RALPH_TELEGRAM_BOT_TOKEN = 'tok-xyz';

        let calls: string[] = [];

        delete require.cache[require.resolve('../../../fetchShim')];
        require('../../../fetchShim').default = async (url: string) => {
            calls.push(url);
            if (url.includes('getUpdates')) {
                // First call: return two updates
                if (calls.length === 1) {
                    return { json: async () => ({ ok: true, result: [{ update_id: 10, msg: 'a' }, { update_id: 11, msg: 'b' }] }) };
                }
                // Second call should include offset=12
                return { json: async () => ({ ok: true, result: [{ update_id: 12, msg: 'c' }] }) };
            }
            return { json: async () => ({ ok: false, result: [] }) };
        };

        delete require.cache[require.resolve('../../../telegram/telegramBot')];
        const { TelegramBot } = require('../../../telegram/telegramBot');

        const bot = new TelegramBot();

        const first = await bot.fetchBotMessages(1);
        assert.strictEqual(Array.isArray(first), true);
        assert.strictEqual(first.length, 2);

        // Next call should include offset=12 (last update_id + 1)
        const second = await bot.fetchBotMessages(1);
        assert.strictEqual(Array.isArray(second), true);
        assert.strictEqual(second.length, 1);

        // Verify the urls used (offset behavior)
        const firstUrl = calls[0];
        const secondUrl = calls[1];
        assert.ok(firstUrl.includes('getUpdates'));
        assert.ok(!firstUrl.includes('offset='));
        assert.ok(secondUrl.includes('offset=12'));
    });

    it('escapes HTML special characters correctly', () => {
        // Need to load class if not loaded
        if (!require.cache[require.resolve('../../../telegram/telegramBot')]) {
            delete require.cache[require.resolve('../../../telegram/telegramBot')];
        }
        const { TelegramBot } = require('../../../telegram/telegramBot');

        assert.strictEqual(TelegramBot.escapeHtml('<script>alert("x")</script>'), '&lt;script&gt;alert("x")&lt;/script&gt;');
        assert.strictEqual(TelegramBot.escapeHtml('User & Company'), 'User &amp; Company');
        assert.strictEqual(TelegramBot.escapeHtml('Normal text'), 'Normal text');
        assert.strictEqual(TelegramBot.escapeHtml(''), '');
    });

    it('sends messages with parse_mode=HTML by default', async () => {
        process.env.RALPH_TELEGRAM_BOT_TOKEN = 'tok-xyz';

        let lastBody: any;

        delete require.cache[require.resolve('../../../fetchShim')];
        require('../../../fetchShim').default = async (url: string, opts: any) => {
            if (url.includes('sendMessage')) {
                lastBody = JSON.parse(opts.body);
                return { json: async () => ({ ok: true }) };
            }
            return { json: async () => ({ ok: false }) };
        };

        delete require.cache[require.resolve('../../../telegram/telegramBot')];
        const { TelegramBot } = require('../../../telegram/telegramBot');

        const bot = new TelegramBot();
        // Manually enable just in case, though token sets it
        // bot.token is private but set in constructor via getTelegramBotToken which reads env
        // mock default chat id
        process.env.RALPH_TELEGRAM_CHAT_ID = '123';
        const bot2 = new TelegramBot(); // re-init to pick up chat id

        await bot2.sendMessage('<b>bold</b>');
        assert.strictEqual(lastBody.parse_mode, 'HTML');
        assert.strictEqual(lastBody.text, '<b>bold</b>');
        assert.strictEqual(lastBody.chat_id, '123'); // verify chat id was picked up
    });
});

