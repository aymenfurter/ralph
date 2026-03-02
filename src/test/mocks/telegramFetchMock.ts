export function createTelegramFetchMock(overrides?: any) {
    const calls: string[] = [];

    const mockFetch = async (url: string) => {
        calls.push(url);

        // Provide a safe default JSON payload
        return {
            json: async () => ({ ok: true, result: [] }),
        };
    };

    return { mockFetch, calls };
}
