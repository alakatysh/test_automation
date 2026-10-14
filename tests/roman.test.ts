import { describe, it, expect } from 'vitest';
import { convertToRoman } from '../src/roman';

describe('convertToRoman', () => {
  it('перетворює число 1994 на "MCMXCIV"', () => {
    const input = 1994;
    const result = convertToRoman(input);
    expect(result).toBe('MCMXCIV');
  });

  it('перетворює число 58 на "LVIII"', () => {
    expect(convertToRoman(58)).toBe('LVIII');
  });

  it('коректно перетворює нижню межу (число 1)', () => {
    expect(convertToRoman(1)).toBe('I');
  });

  it('коректно перетворює верхню межу (число 3999)', () => {
    expect(convertToRoman(3999)).toBe('MMMCMXCIX');
  });

  it('відхиляє значення 0 та від’ємні числа', () => {
    expect(() => convertToRoman(0)).toThrow('INVALID_INPUT');
    expect(() => convertToRoman(-10)).toThrow('INVALID_INPUT');
  });

  it('відхиляє числа, більші за 3999', () => {
    expect(() => convertToRoman(4000)).toThrow('INVALID_INPUT');
  });

  it('відхиляє нецілі числа та NaN', () => {
    expect(() => convertToRoman(3.14)).toThrow('INVALID_INPUT');
    expect(() => convertToRoman(NaN)).toThrow('INVALID_INPUT');
  });
});
