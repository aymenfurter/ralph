import FormData from 'form-data';
import * as fs from 'fs';
import { getOpenAIKey } from './telegramConfig';
import fetchShim from '../fetchShim';

export async function transcribeAudio(filePath: string): Promise<string | null> {
    const apiKey = getOpenAIKey();
    if (!apiKey) {
        console.warn('STT: No OPENAI_API_KEY found in environment variables');
        return null;
    }

    try {
        const fileStream = fs.createReadStream(filePath);
        const form = new FormData();
        form.append('file', fileStream);
        form.append('model', 'whisper-1');
        form.append('response_format', 'text');

        const response = await fetchShim('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                ...form.getHeaders()
            },
            body: form
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('STT: API error', response.status, errorText);
            return null;
        }

        const text = await response.text();
        return text.trim();
    } catch (err) {
        console.error('STT: Transcribe failed', err);
        return null;
    }
}
