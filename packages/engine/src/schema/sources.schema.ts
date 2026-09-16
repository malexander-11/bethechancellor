import { z } from 'zod';
import { isoDateSchema } from './provenance.schema.js';

export const sourceOrgSchema = z.enum([
  'OBR',
  'Labour',
  'No10',
  'MoD',
  'MoJ',
  'NAO',
  'RF',
  'HMT',
  'HMRC',
  'ONS',
  'BoE',
  'DWP',
  'DfE',
  'MHCLG',
  'Defra',
  'HomeOffice',
  'FCDO',
  'NATO',
  'Parliament',
  'IfG',
  'IFS',
  'Nesta',
  'Other',
]);

export const sourceDocSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'source ids are lower-case kebab-case'),
  org: sourceOrgSchema,
  title: z.string().min(1),
  edition: z.string().optional(),
  url: z.string().url(),
  landingUrl: z.string().url().optional(),
  publishedOn: isoDateSchema.optional(),
  retrievedOn: isoDateSchema,
  sha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  licence: z.enum(['OGL-3.0', 'Open Parliament Licence', 'Other']),
  localPath: z.string().optional(),
  notes: z.string().optional(),
});

export const sourcesFileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  sources: z.array(sourceDocSchema).min(1),
});
