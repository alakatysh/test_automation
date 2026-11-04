import type { PublisherHttpClient } from './publication-planner';

export class HttpPublisherClient implements PublisherHttpClient {
  constructor(private baseUrl: string) {}

  async publish(id: string, content: string): Promise<{ success: boolean; url: string }> {
    const response = await fetch(`${this.baseUrl}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, content }),
    });

    if (!response.ok) throw new Error('PUBLISH_FAILED');

    const data = await response.json();
    if (typeof data.url !== 'string') throw new Error('INVALID_RESPONSE_FORMAT');

    return { success: true, url: data.url };
  }
}