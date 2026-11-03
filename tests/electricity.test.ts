import { describe, it, expect } from 'vitest';
import { calcElectricityFee } from '../src/electricity';

describe('calcElectricityFee (Варіант 11)', () => {
  it.each([-1, -50, 10.55])(
    'відхиляє від’ємне або дробове споживання %s',
    (kwh) => {
      expect(() => calcElectricityFee(kwh)).toThrow('INVALID_CONSUMPTION');
    },
  );

  it('нараховує абонплату 30 грн при нульовому споживанні', () => {
    expect(calcElectricityFee(0)).toBe(30);
  },
);
it.each([
    { kwh: 50, expected: 114 },   // 50 * 1.68 + 30 = 114
    { kwh: 100, expected: 198 },  // 100 * 1.68 + 30 = 198 (межа)
  ])(
    'базовий тариф до 100 кВт/год: $kwh кВт/год → $expected грн',
    ({ kwh, expected }) => {
      expect(calcElectricityFee(kwh)).toBe(expected);
    },
  );
});