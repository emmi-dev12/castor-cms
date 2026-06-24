import { z } from 'zod';

const MAX_URL_LENGTH = 2048;

const urlSchema = z
  .string()
  .max(MAX_URL_LENGTH)
  .refine(
    (v) => {
      try { new URL(v); return true; } catch { return false; }
    },
    { message: 'Invalid URL' },
  );

export const TextSlotSchema = z.object({
  type: z.literal('text'),
  value: z.string().min(1).max(10_000),
});

export const ImageSlotSchema = z.object({
  type: z.literal('image'),
  src: urlSchema,
  alt: z.string().max(500),
});

export const LinkSlotSchema = z.object({
  type: z.literal('link'),
  href: urlSchema,
  label: z.string().min(1).max(500),
});

export const SlotValueSchema = z.discriminatedUnion('type', [
  TextSlotSchema,
  ImageSlotSchema,
  LinkSlotSchema,
]);

export const ChangesetSchema = z.record(z.string(), SlotValueSchema);
