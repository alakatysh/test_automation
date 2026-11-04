export interface PublisherHttpClient {
  publish(id: string, content: string): Promise<{ success: boolean; url: string }>;
}

export interface PublicationRepository {
  save(record: PublicationRecord): Promise<void>;
  findById(id: string): Promise<PublicationRecord | undefined>;
}

export interface PublisherNotifier {
  notify(message: string): Promise<void>;
}

export interface PublicationRecord {
  id: string;
  content: string;
  scheduledTime: string;
  status: 'scheduled' | 'published' | 'cancelled';
  publishedUrl?: string;
}

export class PublicationPlanner {
  private timers = new Map<string, NodeJS.Timeout>();

  constructor(
    private client: PublisherHttpClient,
    private repo: PublicationRepository,
    private notifier: PublisherNotifier,
  ) {}

  async schedule(id: string, content: string, delayMs: number): Promise<PublicationRecord> {
    if (!id || !content) throw new Error('INVALID_INPUT');
    if (delayMs <= 0) throw new Error('INVALID_DELAY');

    const scheduledTime = new Date(Date.now() + delayMs).toISOString();
    const record: PublicationRecord = {
      id,
      content,
      scheduledTime,
      status: 'scheduled',
    };

    await this.repo.save(record);

    const timer = setTimeout(async () => {
      try {
        const response = await this.client.publish(id, content);
        record.status = 'published';
        record.publishedUrl = response.url;
        await this.repo.save(record);
        await this.notifier.notify(`Публікацію ${id} успішно розміщено: ${response.url}`);
      } catch (error) {
        await this.notifier.notify(`Помилка публікації ${id}: ${(error as Error).message}`);
      } finally {
        this.timers.delete(id);
      }
    }, delayMs);

    this.timers.set(id, timer);
    return record;
  }

  async cancel(id: string): Promise<boolean> {
    const timer = this.timers.get(id);
    if (!timer) return false;

    clearTimeout(timer);
    this.timers.delete(id);

    const record = await this.repo.findById(id);
    if (record) {
      record.status = 'cancelled';
      await this.repo.save(record);
    }

    await this.notifier.notify(`Публікацію ${id} скасовано`);
    return true;
  }
}