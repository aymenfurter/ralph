import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(__dirname, '..', '..', '..', '.env');

function backupEnv(): string | undefined {
    try {
        if (fs.existsSync(envPath)) {
            const data = fs.readFileSync(envPath, 'utf8');
            fs.unlinkSync(envPath);
            return data;
        }
    } catch (e) {
        // ignore
    }
    return undefined;
}

function restoreEnv(content?: string) {
    if (content === undefined) {
        try { if (fs.existsSync(envPath)) fs.unlinkSync(envPath); } catch (e) { }
    } else {
        fs.writeFileSync(envPath, content, 'utf8');
    }
}

describe('telegramConfig.getTelegramBotToken', () => {
    let orig: string | undefined;

    before(() => {
        orig = backupEnv();
    });

    after(() => {
        restoreEnv(orig);
    });

    it('returns undefined when .env is missing', () => {
        // Ensure .env does not exist
        try { if (fs.existsSync(envPath)) fs.unlinkSync(envPath); } catch (e) { }

        // Require module fresh
        delete require.cache[require.resolve('../../telegramConfig')];
        const { getTelegramBotToken } = require('../../telegramConfig');

        const token = getTelegramBotToken();
        assert.strictEqual(token, undefined);
    });

    it('parses token from .env', () => {
        const sample = 'RALPH_TELEGRAM_BOT_TOKEN=abc123\nOTHER=foo\n';
        fs.writeFileSync(envPath, sample, 'utf8');

        delete require.cache[require.resolve('../../telegramConfig')];
        const { getTelegramBotToken } = require('../../telegramConfig');

        const token = getTelegramBotToken();
        assert.strictEqual(token, 'abc123');
    });
});
