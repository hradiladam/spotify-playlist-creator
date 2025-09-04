// TESTS/setup/setupApi.ts
import { setupServer } from 'msw/node';
import { handlers } from '../testServer/handlers';
import { beforeAll, afterAll, afterEach } from 'vitest';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

export { server };
