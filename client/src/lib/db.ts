import Dexie, { type Table } from "dexie";
import { v4 as uuidv4 } from "uuid";
import {
  backupFileSchema,
  type BackupCard,
  type BackupFile,
  type CardRecord,
  type CardType,
} from "@shared/aac";
import { ORDER_STEP, arrayMove, orderBetween } from "@/lib/ordering";

class AACDexie extends Dexie {
  cards!: Table<CardRecord, string>;

  constructor() {
    super("aac-db");
    this.version(1).stores({
      cards: "id, parentId, type, order",
    });
  }
}

export const db = new AACDexie();

/** Raised when an edit/delete would orphan a non-empty folder's children. */
export class FolderNotEmptyError extends Error {
  constructor() {
    super("FOLDER_NOT_EMPTY");
    this.name = "FolderNotEmptyError";
  }
}

// --- Queries ---

export function listChildren(parentId: string | null) {
  // IndexedDB cannot index `null`, so root cards are filtered in memory.
  if (parentId === null) {
    return db.cards.filter((c) => c.parentId === null).sortBy("order");
  }
  return db.cards.where("parentId").equals(parentId).sortBy("order");
}

export function getCard(id: string) {
  return db.cards.get(id);
}

export function countChildren(id: string) {
  return db.cards.where("parentId").equals(id).count();
}

export async function countDescendants(id: string): Promise<number> {
  const children = await db.cards.where("parentId").equals(id).toArray();
  let total = children.length;
  for (const child of children) {
    if (child.type === "folder") total += await countDescendants(child.id);
  }
  return total;
}

async function nextOrder(parentId: string | null): Promise<number> {
  const siblings = await listChildren(parentId);
  const last = siblings[siblings.length - 1];
  return last ? last.order + ORDER_STEP : ORDER_STEP;
}

// --- Mutations ---

export type NewCard = {
  parentId: string | null;
  type: CardType;
  label: string;
  image: Blob | null;
  audio: Blob | null;
};

export async function addCard(input: NewCard): Promise<string> {
  const id = uuidv4();
  await db.cards.add({ ...input, id, order: await nextOrder(input.parentId) });
  return id;
}

export type CardUpdate = {
  type: CardType;
  label: string;
  image: Blob | null;
  audio: Blob | null;
};

export async function updateCard(id: string, patch: CardUpdate): Promise<void> {
  // Block turning a non-empty folder into a speak card (would orphan children).
  if (patch.type !== "folder") {
    const existing = await db.cards.get(id);
    if (existing?.type === "folder" && (await countChildren(id)) > 0) {
      throw new FolderNotEmptyError();
    }
  }
  await db.cards.update(id, patch);
}

/** Delete a card and (for folders) every descendant. */
export async function deleteCardCascade(id: string): Promise<void> {
  await db.transaction("rw", db.cards, async () => {
    const stack = [id];
    const toDelete: string[] = [];
    while (stack.length) {
      const current = stack.pop()!;
      toDelete.push(current);
      const children = await db.cards.where("parentId").equals(current).primaryKeys();
      stack.push(...children);
    }
    await db.cards.bulkDelete(toDelete);
  });
}

/**
 * Move `fromId` to `toId`'s position within an ordered list. Only the moved
 * card is rewritten (set between its new neighbours); if there is no numeric
 * gap left the affected list is rebalanced.
 */
export async function moveCard(
  items: readonly CardRecord[],
  fromId: string,
  toId: string,
): Promise<void> {
  const oldIndex = items.findIndex((i) => i.id === fromId);
  const newIndex = items.findIndex((i) => i.id === toId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

  const moved = arrayMove(items, oldIndex, newIndex);
  const pos = moved.findIndex((i) => i.id === fromId);
  const before = moved[pos - 1]?.order;
  const after = moved[pos + 1]?.order;

  const between = orderBetween(before, after);
  if (between !== null) {
    await db.cards.update(fromId, { order: between });
    return;
  }

  // No gap left — renumber the whole list with fresh spacing.
  await db.cards.bulkUpdate(
    moved.map((item, index) => ({
      key: item.id,
      changes: { order: (index + 1) * ORDER_STEP },
    })),
  );
}

// --- Seeding ---

let seedAttempted = false;

export async function seedIfEmpty(): Promise<void> {
  if (seedAttempted) return;
  seedAttempted = true;
  const count = await db.cards.count();
  if (count > 0) return;
  const labels = ["Hi", "More", "Help", "Food"];
  const seed: CardRecord[] = labels.map((label, i) => ({
    id: uuidv4(),
    parentId: null,
    type: label === "Food" ? "folder" : "speak",
    label,
    image: null,
    audio: null,
    order: (i + 1) * ORDER_STEP,
  }));
  await db.cards.bulkAdd(seed);
}

// --- Backup / restore ---

async function blobToBase64(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => {
      const res = String(reader.result || "");
      resolve(res.includes(",") ? res.split(",")[1] : res);
    };
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mime = "application/octet-stream"): Blob {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

export async function exportData(): Promise<BackupFile> {
  const all = await db.cards.toArray();
  const cards: BackupCard[] = [];
  for (const c of all) {
    cards.push({
      id: c.id,
      parentId: c.parentId,
      type: c.type,
      label: c.label,
      order: c.order,
      image: c.image
        ? { base64: await blobToBase64(c.image), type: c.image.type || "application/octet-stream" }
        : null,
      audio: c.audio
        ? { base64: await blobToBase64(c.audio), type: c.audio.type || "application/octet-stream" }
        : null,
    });
  }
  return { version: 1, exportedAt: new Date().toISOString(), cards };
}

/** Validate + restore a parsed backup. Returns false if the file is invalid. */
export async function importData(raw: unknown): Promise<boolean> {
  const result = backupFileSchema.safeParse(raw);
  if (!result.success) return false;

  const nextCards: CardRecord[] = result.data.cards.map((c) => ({
    id: c.id,
    parentId: c.parentId ?? null,
    type: c.type,
    label: c.label,
    order: c.order,
    image: c.image ? safeDecode(c.image.base64, c.image.type) : null,
    audio: c.audio ? safeDecode(c.audio.base64, c.audio.type) : null,
  }));

  await db.transaction("rw", db.cards, async () => {
    await db.cards.clear();
    await db.cards.bulkAdd(nextCards);
  });
  return true;
}

// One malformed media payload should not abort the whole restore.
function safeDecode(base64: string, type: string): Blob | null {
  try {
    return base64ToBlob(base64, type);
  } catch {
    return null;
  }
}
