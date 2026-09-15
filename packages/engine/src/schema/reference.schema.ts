import { z } from 'zod';
import { badgeSchema, sourceRefSchema } from './provenance.schema.js';

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

export const presetSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string().min(1),
  description: z.string().min(1),
  leverValues: z.record(z.string(), z.number()),
  badge: badgeSchema,
  sources: z.array(sourceRefSchema).min(1),
});

export const presetsFileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  presets: z.array(presetSchema).min(1),
});
