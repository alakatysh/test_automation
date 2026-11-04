import express from 'express';
import { randomUUID } from 'node:crypto';

export type Tier = 'basic' | 'silver' | 'gold';

export interface Item {
  sku: string;
  price: number;
  qty: number;
}

export interface Order {
  id: string;
  ownerId: string;
  tier: Tier;
  items: Item[];
  subtotal: number;
  total: number;
  createdAt: string;
}

const USERS = [
  { id: 'u1', email: 'alice@example.com', password: 'Secret123', tier: 'gold' as Tier },
  { id: 'u2', email: 'bob@example.com', password: 'Secret123', tier: 'basic' as Tier },
];

const DISCOUNT: Record<Tier, number> = { basic: 0, silver: 0.05, gold: 0.1 };
const round2 = (n: number) => Math.round(n * 100) / 100;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function toPublic(order: Order) {
  return {
    id: order.id,
    tier: order.tier,
    items: order.items,
    subtotal: order.subtotal,
    total: order.total,
    createdAt: order.createdAt,
  };
}

export function createApp() {
  const app = express();
  app.use(express.json());
  const tokens = new Map<string, string>();
  const orders = new Map<string, Order>();

  // POST /auth/login
  app.post('/auth/login', (req, res) => {
    const user = USERS.find(
      (u) => u.email === req.body?.email && u.password === req.body?.password,
    );
    if (!user) return res.status(401).json({ code: 'INVALID_CREDENTIALS' });
    const token = randomUUID();
    tokens.set(token, user.id);
    res.json({ accessToken: token });
  });

  // Middleware автентифікації для /orders
  app.use('/orders', (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const userId = token ? tokens.get(token) : undefined;
    if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED' });
    res.locals.user = USERS.find((u) => u.id === userId);
    next();
  });

  // GET /orders/stats — ВАРІАНТ 11
  app.get('/orders/stats', (_req, res) => {
    const userOrders = [...orders.values()].filter(
      (o) => o.ownerId === res.locals.user.id,
    );
    const count = userOrders.length;
    const totalAmount = round2(
      userOrders.reduce((sum, order) => sum + order.total, 0),
    );
    res.json({ count, totalAmount });
  });

  // POST /orders
  app.post('/orders', (req, res) => {
    const items: Item[] = req.body?.items;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ code: 'EMPTY_ORDER' });
    }
    for (const i of items) {
      if (typeof i.price !== 'number' || i.price < 0)
        return res.status(400).json({ code: 'INVALID_PRICE' });
      if (!Number.isInteger(i.qty) || i.qty <= 0)
        return res.status(400).json({ code: 'INVALID_QTY' });
    }
    const user = res.locals.user;
    const subtotal = round2(items.reduce((s, i) => s + i.price * i.qty, 0));
    let rate = DISCOUNT[user.tier as Tier];
    if (subtotal >= 2000) rate += 0.05;
    const afterDiscount = round2(subtotal * (1 - Math.min(rate, 0.25)));
    const total = round2(afterDiscount + (afterDiscount >= 1000 ? 0 : 60));

    const order: Order = {
      id: randomUUID(),
      ownerId: user.id,
      tier: user.tier,
      items,
      subtotal,
      total,
      createdAt: new Date().toISOString(),
    };
    orders.set(order.id, order);
    res.status(201).location(`/orders/${order.id}`).json(toPublic(order));
  });

  // GET /orders
  app.get('/orders', (_req, res) => {
    const mine = [...orders.values()].filter(
      (o) => o.ownerId === res.locals.user.id,
    );
    res.json(mine.map(toPublic));
  });

  // GET /orders/:id
  app.get('/orders/:id', (req, res) => {
    const order = orders.get(req.params.id);
    if (!order || order.ownerId !== res.locals.user.id) {
      return res.status(404).json({ code: 'NOT_FOUND' });
    }
    res.json(toPublic(order));
  });

  // DELETE /orders/:id
  app.delete('/orders/:id', (req, res) => {
    const order = orders.get(req.params.id);
    if (!order || order.ownerId !== res.locals.user.id) {
      return res.status(404).json({ code: 'NOT_FOUND' });
    }
    orders.delete(order.id);
    res.status(204).end();
  });

  return app;
}