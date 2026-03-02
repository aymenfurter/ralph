import * as http from 'http';
import * as https from 'https';

interface FetchOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
}

export default function fetchShim(url: string, options: FetchOptions = {}): Promise<any> {
    return new Promise((resolve, reject) => {
        try {
            const parsed = new URL(url);
            const isHttps = parsed.protocol === 'https:';
            const lib = isHttps ? https : http;

            const opts: any = {
                method: options.method || 'GET',
                headers: options.headers || {}
            };

            const req = lib.request(parsed, opts, (res: any) => {
                const chunks: Buffer[] = [];
                res.on('data', (chunk: Buffer) => chunks.push(chunk));
                res.on('end', () => {
                    const raw = Buffer.concat(chunks).toString('utf8');
                    const result = {
                        status: res.statusCode,
                        ok: res.statusCode && res.statusCode >= 200 && res.statusCode < 300,
                        text: async () => raw,
                        json: async () => {
                            try { return JSON.parse(raw); } catch (e) { return Promise.reject(e); }
                        }
                    };
                    resolve(result);
                });
            });

            req.on('error', (err: any) => reject(err));

            if (options.timeout) {
                req.setTimeout(options.timeout, () => {
                    req.abort();
                    reject(new Error('Request timed out'));
                });
            }

            if (options.body) {
                if (typeof options.body === 'string' || Buffer.isBuffer(options.body)) {
                    req.write(options.body);
                } else {
                    req.write(JSON.stringify(options.body));
                }
            }

            req.end();
        } catch (err) {
            reject(err);
        }
    });
}
