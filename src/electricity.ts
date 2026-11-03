export interface ElectricityOptions {
  night?: boolean;
}

const BASE_LIMIT = 100;
const BASE_RATE = 1.68;
const OVER_RATE = 2.64;
const FIXED_FEE = 30;
const NIGHT_DISCOUNT_RATE = 0.5;

const round2 = (n: number): number => Math.round(n * 100) / 100;

function assertValidConsumption(kwh: number): void {
  if (!Number.isInteger(kwh) || kwh < 0) {
    throw new Error('INVALID_CONSUMPTION');
  }
}

function calcEnergyCost(kwh: number): number {
  if (kwh <= BASE_LIMIT) {
    return kwh * BASE_RATE;
  }
  return BASE_LIMIT * BASE_RATE + (kwh - BASE_LIMIT) * OVER_RATE;
}

export function calcElectricityFee(
  kwh: number,
  options: ElectricityOptions = {},
): number {
  assertValidConsumption(kwh);

  const baseCost = calcEnergyCost(kwh);
  const finalEnergyCost = options.night
    ? baseCost * NIGHT_DISCOUNT_RATE
    : baseCost;

  // return round2(FIXED_FEE + finalEnergyCost);
}