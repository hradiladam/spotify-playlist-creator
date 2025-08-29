// TESTS/helpers/http.ts


import { vi } from 'vitest';

// Build a fake fetch Response object.
// - ok, status, statusText, json(), text().
// - Lets tests simulate both happy and error HTTP cases without real network.

export const makeFetchResponse = (opts: {
    ok: boolean;
    status?: number;
    statusText?: string;
    json?: any;
    text?: string;
    }) => {
    const {
        ok,
        status = ok ? 200 : 500,
        statusText = ok ? 'OK' : 'Internal Server Error',
        json,
        text,
    } = opts;

    return {
        ok,
        status,
        statusText,
        json: vi.fn().mockResolvedValue(json),
        text: vi.fn().mockResolvedValue(
        text ?? (json ? JSON.stringify(json) : '')
        ),
    } as unknown as Response;
};