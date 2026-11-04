import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './msw/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' as any }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());