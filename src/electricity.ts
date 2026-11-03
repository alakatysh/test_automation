export interface ElectricityOptions {
  night?: boolean;
}

export function calcElectricityFee(
  kwh: number,
  _options: ElectricityOptions = {},
): number {
  throw new Error('Not implemented');
}