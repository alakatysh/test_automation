import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const RATE_URL = 'https://api.example.com/rate';
export const PUBLISH_URL = 'https://api.example.com/publish';

export const handlers = [
  http.get(RATE_URL, () => HttpResponse.json({ rate: 41.25 })),
  http.post(PUBLISH_URL, () => HttpResponse.json({ url: 'https://site.com/p/1' })),
];

export const server = setupServer(...handlers);