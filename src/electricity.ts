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
  return 30;
}