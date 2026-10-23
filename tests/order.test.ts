import { describe, it, expect } from 'vitest';
import {
  calcSubtotal,
  calcDiscountRate,
  calcShipping,
  calcOrderTotal,
  convertCurrency,
  type OrderItem,
} from '../src/order';

const item = (price: number, qty = 1): OrderItem => ({
  sku: 'SKU-1',
  price,
  qty,
});

describe('calcSubtotal', () => {
  it('підсумовує вартість позицій з урахуванням кількості', () => {
    const items = [item(100, 2), { sku: 'SKU-2', price: 50, qty: 3 }];
    expect(calcSubtotal(items)).toBe(350);
  });

  it('відхиляє порожнє замовлення', () => {
    expect(() => calcSubtotal([])).toThrow('EMPTY_ORDER');
  });

  it('відхиляє від’ємну ціну', () => {
    expect(() => calcSubtotal([item(-1)])).toThrow('NEGATIVE_PRICE');
  });

  it.each([0, -1, 1.5])('відхиляє кількість %s', (qty) => {
    expect(() => calcSubtotal([item(100, qty)])).toThrow('INVALID_QTY');
  });
});

describe('calcDiscountRate', () => {
  it.each([
    { tier: 'basic' as const, subtotal: 500, expected: 0 },
    { tier: 'silver' as const, subtotal: 500, expected: 0.05 },
    { tier: 'gold' as const, subtotal: 500, expected: 0.1 },
    { tier: 'basic' as const, subtotal: 2000, expected: 0.05 },
    { tier: 'gold' as const, subtotal: 2000, expected: 0.15 },
  ])(
    'рівень $tier із сумою $subtotal дає ставку $expected',
    ({ tier, subtotal, expected }) => {
      expect(calcDiscountRate(tier, subtotal)).toBeCloseTo(expected, 4);
    },
  );

  it.each([
    { subtotal: 1999, expected: 0 },
    { subtotal: 2000, expected: 0.05 },
    { subtotal: 2001, expected: 0.05 },
  ])('межа великого замовлення: $subtotal', ({ subtotal, expected }) => {
    expect(calcDiscountRate('basic', subtotal)).toBeCloseTo(expected, 4);
  });

  it('обмежує сумарну знижку максимальним значенням', () => {
    expect(calcDiscountRate('gold', 2000, 0.5)).toBe(0.25);
  });

  it('відхиляє від’ємний промокод', () => {
    expect(() => calcDiscountRate('basic', 500, -0.1)).toThrow('INVALID_PROMO');
  });
});

describe('calcShipping', () => {
  it.each([
    [999, 60],
    [1000, 0],
    [1001, 0],
  ])('сума %i → доставка %i', (amount, expected) => {
    expect(calcShipping(amount)).toBe(expected);
  });
});

describe('calcOrderTotal', () => {
  it('додає доставку до замовлення нижче порога', () => {
    expect(calcOrderTotal([item(500)], 'basic')).toBeCloseTo(560, 2);
  });

  it('не додає доставку, якщо сума після знижки сягає порога', () => {
    expect(calcOrderTotal([item(1200)], 'gold')).toBeCloseTo(1080, 2);
  });

  it('знижка може опустити суму нижче порога доставки', () => {
    expect(calcOrderTotal([item(1050)], 'gold')).toBeCloseTo(1005, 2);
  });

  it('передає виняток із нижнього рівня', () => {
    expect(() => calcOrderTotal([], 'gold')).toThrow('EMPTY_ORDER');
  });
});

describe('convertCurrency (Варіант 11)', () => {
  it.each([
    { amount: 100, rate: 40, fee: 0, expected: 4000 },
    { amount: 100, rate: 41.5, fee: 1, expected: 4108.5 },
    { amount: 250, rate: 0.85, fee: 2, expected: 208.25 },
    { amount: 0, rate: 38, fee: 1.5, expected: 0 },
  ])(
    'конвертує суму $amount за курсом $rate з комісією $fee% у $expected',
    ({ amount, rate, fee, expected }) => {
      expect(convertCurrency(amount, rate, fee)).toBeCloseTo(expected, 2);
    },
  );

  it.each([
    { rate: -0.01, desc: 'від’ємний курс' },
    { rate: 0, desc: 'нульовий курс' },
  ])('відхиляє некоректний курс ($desc)', ({ rate }) => {
    expect(() => convertCurrency(100, rate)).toThrow('INVALID_RATE');
  });

  it('перевірка межових значень курсу біля нуля (-0.01, 0, 0.01)', () => {
    expect(() => convertCurrency(100, -0.01)).toThrow('INVALID_RATE');
    expect(() => convertCurrency(100, 0)).toThrow('INVALID_RATE');
    expect(convertCurrency(100, 0.01, 0)).toBeCloseTo(1, 2);
  });

  it.each([
    { amount: -0.01 },
    { amount: -100 },
  ])('відхиляє від’ємну суму $amount', ({ amount }) => {
    expect(() => convertCurrency(amount, 40)).toThrow('INVALID_AMOUNT');
  });

  it.each([
    { fee: -0.01 },
    { fee: 100 },
    { fee: 105 },
  ])('відхиляє некоректну комісію $fee%', ({ fee }) => {
    expect(() => convertCurrency(100, 40, fee)).toThrow('INVALID_FEE');
  });

  it('заокруглює результат до двох знаків після коми', () => {
    expect(convertCurrency(100.55, 41.123, 0)).toBe(4134.92);
  });
});