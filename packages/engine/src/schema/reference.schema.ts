import { z } from 'zod';
import { sourceRefSchema } from './provenance.schema.js';

export const householdsReferenceSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  title: z.string().min(1),
  value: z.number().positive(),
  unit: z.literal('count'),
  year: z.number().int(),
  source: sourceRefSchema,
  note: z.string().optional(),
});
