export const statsSchema = {
  type: 'object',
  properties: {
    count: { type: 'integer', minimum: 0 },
    totalAmount: { type: 'number', minimum: 0 },
  },
  required: ['count', 'totalAmount'],
  additionalProperties: false,
} as const;