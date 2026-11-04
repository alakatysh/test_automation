import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server, PUBLISH_URL } from './msw/server';
import { PublicationPlanner } from '../src/publication-planner';
import { HttpPublisherClient } from '../src/publisher-client';
import { InMemoryPublicationRepository } from './fakes/in-memory-publication-repository';
import type { PublisherHttpClient, PublisherNotifier } from '../src/publication-planner';

describe('PublicationPlanner — Варіант 11', () => {
  let client: PublisherHttpClient;
  let repo: InMemoryPublicationRepository;
  let notifier: PublisherNotifier;
  let planner: PublicationPlanner;

  beforeEach(() => {
    vi.useFakeTimers();
    client = {
      publish: vi.fn().mockResolvedValue({ success: true, url: 'https://site.com/p/P-1' }),
    };
    repo = new InMemoryPublicationRepository();
    notifier = { notify: vi.fn().mockResolvedValue(undefined) };
    planner = new PublicationPlanner(client, repo, notifier);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('виконує публікацію за розкладом та оновлює стан у сховищі (Fake Repo)', async () => {
    await planner.schedule('P-1', 'Контент публікації 1', 5000);

    let saved = await repo.findById('P-1');
    expect(saved?.status).toBe('scheduled');

    await vi.advanceTimersByTimeAsync(5000);

    saved = await repo.findById('P-1');
    expect(saved?.status).toBe('published');
    expect(saved?.publishedUrl).toBe('https://site.com/p/P-1');
    expect(repo.count).toBe(1);
  });

  it('скасовує заплановану публікацію до настання таймера', async () => {
    await planner.schedule('P-2', 'Контент 2', 5000);

    const cancelled = await planner.cancel('P-2');
    expect(cancelled).toBe(true);

    await vi.advanceTimersByTimeAsync(5000);

    const saved = await repo.findById('P-2');
    expect(saved?.status).toBe('cancelled');
    expect(client.publish).not.toHaveBeenCalled();
  });

  it('надсилає сповіщення (Spy) після успішної публікації', async () => {
    await planner.schedule('P-3', 'Контент 3', 1000);
    await vi.advanceTimersByTimeAsync(1000);

    expect(notifier.notify).toHaveBeenCalledTimes(1);
    expect(notifier.notify).toHaveBeenCalledWith(
      expect.stringContaining('Публікацію P-3 успішно розміщено'),
    );
  });

  it('обробляє помилку публікації за розкладом та надсилає сповіщення про збій', async () => {
    client.publish = vi.fn().mockRejectedValue(new Error('NETWORK_ERROR'));

    await planner.schedule('P-ERR', 'Контент із помилкою', 1000);
    await vi.advanceTimersByTimeAsync(1000);

    expect(notifier.notify).toHaveBeenCalledWith(
      expect.stringContaining('Помилка публікації P-ERR: NETWORK_ERROR'),
    );
  });

  it('відхиляє скасування неіснуючого завдання', async () => {
    const result = await planner.cancel('NON_EXISTENT');
    expect(result).toBe(false);
  });

  it('відхиляє планування з некоректними параметрами', async () => {
    await expect(planner.schedule('', 'Text', 1000)).rejects.toThrow('INVALID_INPUT');
    await expect(planner.schedule('P-5', '', 1000)).rejects.toThrow('INVALID_INPUT');
    await expect(planner.schedule('P-4', 'Text', -100)).rejects.toThrow('INVALID_DELAY');
  });

  it('обробляє скасування, якщо запис вилучено зі сховища', async () => {
    await planner.schedule('P-6', 'Текст', 1000);
    repo.findById = vi.fn().mockResolvedValue(undefined);

    const cancelled = await planner.cancel('P-6');
    expect(cancelled).toBe(true);
  });
});

describe('HttpPublisherClient — MSW мережеві тести (Варіант 11)', () => {
  const httpClient = new HttpPublisherClient('https://api.example.com');

  it('успішно відправляє публікацію через HTTP (200 OK)', async () => {
    const res = await httpClient.publish('P-10', 'Тестовий контент');
    expect(res.success).toBe(true);
    expect(res.url).toBe('https://site.com/p/1');
  });

  it('обробляє помилку сервера (500 Internal Error)', async () => {
    server.use(
      http.post(PUBLISH_URL, () => new HttpResponse(null, { status: 500 })),
    );

    await expect(httpClient.publish('P-11', 'Тест')).rejects.toThrow('PUBLISH_FAILED');
  });

  it('відхиляє відповідь із некоректним форматом (без поля url)', async () => {
    server.use(
      http.post(PUBLISH_URL, () => HttpResponse.json({ status: 'ok' })),
    );

    await expect(httpClient.publish('P-12', 'Тест')).rejects.toThrow('INVALID_RESPONSE_FORMAT');
  });
});