export interface ElectricityOptions {
  night?: boolean;
}

const BASE_LIMIT = 100;
const BASE_RATE = 1.68;
const OVER_RATE = 2.64;
const FIXED_FEE = 30;

export function calcElectricityFee(
  kwh: number,
  options: ElectricityOptions = {},
): number {
  void options;
  if (!Number.isInteger(kwh) || kwh < 0) {
    throw new Error('INVALID_CONSUMPTION');
  }

  if (kwh <= BASE_LIMIT) {
    return FIXED_FEE + kwh * BASE_RATE;
  }

  const baseCost = BASE_LIMIT * BASE_RATE;
  const overCost = (kwh - BASE_LIMIT) * OVER_RATE;
  return FIXED_FEE + baseCost + overCost;
}