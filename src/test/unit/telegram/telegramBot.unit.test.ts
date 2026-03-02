import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(__dirname, '..', '..', '..', '..', '.env');

function backupEnv(): string | undefined {
    try {
        if (fs.existsSync(envPath)) {
            const data = fs.readFileSync(envPath, 'utf8');
            fs.unlinkSync(envPath);
            return data;
        }
    } catch (e) { }
    return undefined;
}

function restoreEnv(content?: string) {
    if (content === undefined) {
        try { if (fs.existsSync(envPath)) fs.unlinkSync(envPath); } catch (e) { }
    } else {
        fs.writeFileSync(envPath, content, 'utf8');
    }
}

describe('TelegramBot', () => {
    let orig: string | undefined;

    before(() => { orig = backupEnv(); });
    after(() => { restoreEnv(orig); });

    it('is disabled when no token', () => {
        try { if (fs.existsSync(envPath)) fs.unlinkSync(envPath); } catch (e) { }
        delete require.cache[require.resolve('../../../telegram/telegramBot')];
        const { TelegramBot } = require('../../../telegram/telegramBot');
        const bot = new TelegramBot();
        assert.strictEqual(bot.isEnabled(), false);
        assert.strictEqual(bot.getApiUrl(), '');
    });

    it('is enabled when token present and getMe returns data', async () => {
        fs.writeFileSync(envPath, 'RALPH_TELEGRAM_BOT_TOKEN=tok-xyz\n', 'utf8');

        // Prepare a mock fetch and ensure telegramBot imports it fresh
        delete require.cache[require.resolve('../../../fetchShim')];
        delete require.cache[require.resolve('../../../telegram/telegramBot')];

        let lastUrl = '';

        const mockFetch = async (url: string) => {
            lastUrl = url;
            return {
                json: async () => ({ ok: true, result: { id: 123, is_bot: true } }),
            };
        };

        // Inject mock
        const fetchShim = require('../../../fetchShim');
        fetchShim.default = mockFetch;

        const { TelegramBot } = require('../../../telegram/telegramBot');
        const bot = new TelegramBot();

        assert.strictEqual(bot.isEnabled(), true);
        assert.ok(bot.getApiUrl().includes('tok-xyz'));

        const me = await bot.getMe();
        assert.deepStrictEqual(me, { ok: true, result: { id: 123, is_bot: true } });
        assert.ok(lastUrl.endsWith('/getMe'));
    });

    it('fetchBotMessages advances offset and returns results', async () => {
        // Token already present from previous test; re-require fresh modules to reset state
        delete require.cache[require.resolve('../../../fetchShim')];
        delete require.cache[require.resolve('../../../telegram/telegramBot')];

        let calls: string[] = [];

        const mockFetch = async (url: string) => {
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

        const fetchShim = require('../../../fetchShim');
        fetchShim.default = mockFetch;

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
        const { TelegramBot } = require('../../../telegram/telegramBot');
        assert.strictEqual(TelegramBot.escapeHtml('<script>alert("x")</script>'), '&lt;script&gt;alert("x")&lt;/script&gt;');
        assert.strictEqual(TelegramBot.escapeHtml('User & Company'), 'User &amp; Company');
        assert.strictEqual(TelegramBot.escapeHtml('Normal text'), 'Normal text');
        assert.strictEqual(TelegramBot.escapeHtml(''), '');
    });

    it('sends messages with parse_mode=HTML by default', async () => {
        // Reuse similar setup
        delete require.cache[require.resolve('../../../fetchShim')];
        delete require.cache[require.resolve('../../../telegram/telegramBot')];

        let lastBody: any;

        const mockFetch = async (url: string, opts: any) => {
            if (url.includes('sendMessage')) {
                lastBody = JSON.parse(opts.body);
                return { json: async () => ({ ok: true }) };
            }
            return { json: async () => ({ ok: false }) };
        };

        const fetchShim = require('../../../fetchShim');
        fetchShim.default = mockFetch;

        const { TelegramBot } = require('../../../telegram/telegramBot');
        const bot = new TelegramBot();

        // Mock token so it's enabled
        bot.token = 'dummy';
        bot.apiUrl = 'https://api.telegram.org/botdummy';
        bot.defaultChatId = '123';

        await bot.sendMessage('<b>bold</b>');
        assert.strictEqual(lastBody.parse_mode, 'HTML');
        assert.strictEqual(lastBody.text, '<b>bold</b>');
    });
});
