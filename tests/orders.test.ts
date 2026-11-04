import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { login, makeOrderPayload } from './helpers';
import { orderSchema } from './schemas/order.schema';
import { statsSchema } from './schemas/stats.schema';
import { expectSchema } from './schema';

describe('POST /orders', () => {
  let app: ReturnType<typeof createApp>;
  let token: string;

  beforeEach(async () => {
    app = createApp();
    token = await login(app, 'bob@example.com');
  });

  it('створює замовлення: 201, Location, розрахована сума та відповідає схемі', async () => {
    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(makeOrderPayload());

    expect(res.status).toBe(201); // Рівень 1: Код стану
    expectSchema(res.body, orderSchema); // Рівень 2: JSON Schema
    expect(res.body.total).toBeCloseTo(560, 2); // Рівень 3: Значення (500 + 60 доставка)
    expect(res.headers.location).toBe(`/orders/${res.body.id}`); // Рівень 4: Заголовки
  });

  it('створене замовлення доступне за GET (побічний ефект)', async () => {
    const created = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(makeOrderPayload());

    const fetched = await request(app)
      .get(`/orders/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(fetched.status).toBe(200); // Рівень 5: Побічний ефект
    expect(fetched.body).toEqual(created.body);
  });

  it.each([
    { name: 'порожній список', code: 'EMPTY_ORDER', items: [] },
    { name: 'від’ємна ціна', code: 'INVALID_PRICE', items: [{ sku: 'A', price: -1, qty: 1 }] },
    { name: 'нульова кількість', code: 'INVALID_QTY', items: [{ sku: 'A', price: 10, qty: 0 }] },
    { name: 'дробова кількість', code: 'INVALID_QTY', items: [{ sku: 'A', price: 10, qty: 1.5 }] },
  ])('відхиляє некоректні дані: $name → $code', async ({ items, code }) => {
    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(code);
  });
});

describe('GET /orders/stats (Варіант 11)', () => {
  let app: ReturnType<typeof createApp>;
  let token: string;

  beforeEach(async () => {
    app = createApp();
    token = await login(app, 'bob@example.com');
  });

  it('повертає нулеву статистику для нового користувача та відповідає схемі', async () => {
    const res = await request(app)
      .get('/orders/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expectSchema(res.body, statsSchema);
    expect(res.body).toEqual({ count: 0, totalAmount: 0 });
  });

  it('динамiчно оновлює статистику при створенні та видаленні замовлення', async () => {
    // 1. Створюємо перше замовлення (500 + 60 = 560)
    const o1 = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(makeOrderPayload());

    // 2. Створюємо друге замовлення (1000 + 0 = 1000)
    await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ sku: 'SKU-B', price: 1000, qty: 1 }] });

    let stats = await request(app)
      .get('/orders/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(stats.status).toBe(200);
    expect(stats.body.count).toBe(2);
    expect(stats.body.totalAmount).toBeCloseTo(1560, 2);

    // 3. Видаляємо перше замовлення
    await request(app)
      .delete(`/orders/${o1.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    stats = await request(app)
      .get('/orders/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(stats.status).toBe(200);
    expect(stats.body.count).toBe(1);
    expect(stats.body.totalAmount).toBeCloseTo(1000, 2);
  });
});

describe('Доступ та Авторизація', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
  });

  it.each([
    { name: 'без токена', header: undefined },
    { name: 'підроблений токен', header: 'Bearer invalid-token' },
    { name: 'без префікса Bearer', header: 'some-token' },
  ])('GET /orders $name → 401', async ({ header }) => {
    const req = request(app).get('/orders');
    if (header) req.set('Authorization', header);
    const res = await req;
    expect(res.status).toBe(401);
  });

  it('чуже замовлення повертає 404, а не 403', async () => {
    const alice = await login(app, 'alice@example.com');
    const bob = await login(app, 'bob@example.com');

    const created = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${alice}`)
      .send(makeOrderPayload());

    const res = await request(app)
      .get(`/orders/${created.body.id}`)
      .set('Authorization', `Bearer ${bob}`);

    expect(res.status).toBe(404);
  });

  it('список містить лише власні замовлення', async () => {
    const alice = await login(app, 'alice@example.com');
    const bob = await login(app, 'bob@example.com');

    await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${alice}`)
      .send(makeOrderPayload());

    await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${bob}`)
      .send(makeOrderPayload());

    const res = await request(app)
      .get('/orders')
      .set('Authorization', `Bearer ${bob}`);

    expect(res.body).toHaveLength(1);
  });
});

describe('Видалення та ідемпотентність', () => {
  it('DELETE: 204 без тіла, повторний — 404', async () => {
    const app = createApp();
    const token = await login(app, 'bob@example.com');
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app)
      .post('/orders')
      .set(auth)
      .send(makeOrderPayload());
    const url = `/orders/${created.body.id}`;

    const first = await request(app).delete(url).set(auth);
    expect(first.status).toBe(204);
    expect(first.text).toBe(''); // 204 не має тіла

    const second = await request(app).delete(url).set(auth);
    expect(second.status).toBe(404);

    const fetched = await request(app).get(url).set(auth);
    expect(fetched.status).toBe(404);
  });
});