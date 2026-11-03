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
});