export interface ElectricityOptions {
  night?: boolean;
}

export function calcElectricityFee(
  kwh: number,
  options: ElectricityOptions = {},
): number {
  void options;
  if (!Number.isInteger(kwh) || kwh < 0) {
    throw new Error('INVALID_CONSUMPTION');
  }

  if (kwh <= 100) {
    return 30 + kwh * 1.68;
  }

  const baseCost = 100 * 1.68;
  const overCost = (kwh - 100) * 2.64;
  return 30 + baseCost + overCost;
}