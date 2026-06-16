import { z } from "zod";

// Single source of truth for the AAC card model and backup format.
// This module is intentionally free of any Node/Drizzle imports so it can be
// safely shared with the offline client bundle.

export const cardTypeSchema = z.enum(["speak", "folder"]);
export type CardType = z.infer<typeof cardTypeSchema>;

/**
 * The record as stored in IndexedDB. `image`/`audio` are live Blobs, so this
 * is a plain TS type rather than a Zod schema (Zod cannot validate Blobs).
 */
export type CardRecord = {
  id: string;
  parentId: string | null;
  type: CardType;
  label: string;
  image: Blob | null;
  audio: Blob | null;
  order: number;
};

// --- Backup (JSON-serialisable) format ---

export const backupMediaSchema = z.object({
  base64: z.string(),
  type: z.string(),
});
export type BackupMedia = z.infer<typeof backupMediaSchema>;

export const backupCardSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().nullable().optional(),
  type: cardTypeSchema,
  label: z.string(),
  order: z.number().finite(),
  image: backupMediaSchema.nullable().optional(),
  audio: backupMediaSchema.nullable().optional(),
});
export type BackupCard = z.infer<typeof backupCardSchema>;

export const backupFileSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  cards: z.array(backupCardSchema),
});
export type BackupFile = z.infer<typeof backupFileSchema>;
