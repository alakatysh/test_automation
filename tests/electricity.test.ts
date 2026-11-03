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
  });

  it.each([
    { kwh: 50, expected: 114 },
    { kwh: 100, expected: 198 },
  ])(
    'базовий тариф до 100 кВт/год: $kwh кВт/год → $expected грн',
    ({ kwh, expected }) => {
      expect(calcElectricityFee(kwh)).toBe(expected);
    },
  );

  it.each([
    { kwh: 101, expected: 200.64 }, // 100 * 1.68 + 1 * 2.64 + 30 = 200.64
    { kwh: 150, expected: 330 },    // 100 * 1.68 + 50 * 2.64 + 30 = 330
  ])(
    'понаднормовий тариф понад 100 кВт/год: $kwh кВт/год → $expected грн',
    ({ kwh, expected }) => {
      expect(calcElectricityFee(kwh)).toBeCloseTo(expected, 2);
    },
  );

  it.each([
    { kwh: 100, expected: 114 }, // 100 * 1.68 * 0.5 + 30 = 84 + 30 = 114
    { kwh: 150, expected: 180 }, // (100 * 1.68 + 50 * 2.64) * 0.5 + 30 = 150 + 30 = 180
  ])(
    'нічний тариф (50% знижки на кВт/год): $kwh кВт/год → $expected грн',
    ({ kwh, expected }) => {
      expect(
        calcElectricityFee(kwh, { night: true }),
      ).toBeCloseTo(expected, 2);
    },
  );

  it('заокруглює підсумкову суму до копійок (усуває артефакти float)', () => {
    expect(calcElectricityFee(57, { night: true })).toBe(77.88);
  });
});