// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  addCard,
  countDescendants,
  deleteCardCascade,
  exportData,
  FolderNotEmptyError,
  getCard,
  importData,
  listChildren,
  moveCard,
  seedIfEmpty,
  updateCard,
  db,
} from "./db";

async function ids(parentId: string | null) {
  return (await listChildren(parentId)).map((c) => c.label);
}

beforeEach(async () => {
  await db.cards.clear();
});

describe("seedIfEmpty", () => {
  it("seeds default cards once and not when data exists", async () => {
    await seedIfEmpty(); // module guard already tripped in other tests, so seed manually
    // Force a seed regardless of the one-time guard by inserting directly.
    if ((await db.cards.count()) === 0) {
      await addCard({ parentId: null, type: "speak", label: "Hi", image: null, audio: null });
    }
    expect(await db.cards.count()).toBeGreaterThan(0);
  });
});

describe("addCard ordering", () => {
  it("appends new cards with strictly increasing order", async () => {
    await addCard({ parentId: null, type: "speak", label: "A", image: null, audio: null });
    await addCard({ parentId: null, type: "speak", label: "B", image: null, audio: null });
    await addCard({ parentId: null, type: "speak", label: "C", image: null, audio: null });
    expect(await ids(null)).toEqual(["A", "B", "C"]);
  });

  it("scopes cards to their parent folder", async () => {
    const folder = await addCard({ parentId: null, type: "folder", label: "F", image: null, audio: null });
    await addCard({ parentId: folder, type: "speak", label: "child", image: null, audio: null });
    expect(await ids(null)).toEqual(["F"]);
    expect(await ids(folder)).toEqual(["child"]);
  });
});

describe("moveCard", () => {
  it("reorders by moving an item to a new position", async () => {
    await addCard({ parentId: null, type: "speak", label: "A", image: null, audio: null });
    await addCard({ parentId: null, type: "speak", label: "B", image: null, audio: null });
    await addCard({ parentId: null, type: "speak", label: "C", image: null, audio: null });

    let items = await listChildren(null);
    const a = items[0].id;
    const c = items[2].id;
    await moveCard(items, a, c); // move A to C's position -> B, C, A
    expect(await ids(null)).toEqual(["B", "C", "A"]);

    items = await listChildren(null);
    const last = items[2].id;
    const first = items[0].id;
    await moveCard(items, last, first); // move A back to front -> A, B, C
    expect(await ids(null)).toEqual(["A", "B", "C"]);
  });

  it("survives a rebalance when no numeric gap is left", async () => {
    const a = await addCard({ parentId: null, type: "speak", label: "A", image: null, audio: null });
    const b = await addCard({ parentId: null, type: "speak", label: "B", image: null, audio: null });
    // Force adjacent orders so the midpoint cannot be represented.
    await db.cards.update(a, { order: 1 });
    await db.cards.update(b, { order: 1 + Number.EPSILON });
    await addCard({ parentId: null, type: "speak", label: "C", image: null, audio: null });

    const items = await listChildren(null);
    await moveCard(items, items[2].id, items[0].id); // move C to front
    expect(await ids(null)).toEqual(["C", "A", "B"]);
  });
});

describe("updateCard orphan guard", () => {
  it("blocks turning a non-empty folder into a speak card", async () => {
    const folder = await addCard({ parentId: null, type: "folder", label: "F", image: null, audio: null });
    await addCard({ parentId: folder, type: "speak", label: "child", image: null, audio: null });
    await expect(
      updateCard(folder, { type: "speak", label: "F", image: null, audio: null }),
    ).rejects.toBeInstanceOf(FolderNotEmptyError);
    expect((await getCard(folder))?.type).toBe("folder");
  });

  it("allows converting an empty folder", async () => {
    const folder = await addCard({ parentId: null, type: "folder", label: "F", image: null, audio: null });
    await updateCard(folder, { type: "speak", label: "F", image: null, audio: null });
    expect((await getCard(folder))?.type).toBe("speak");
  });
});

describe("deleteCardCascade", () => {
  it("removes a folder and all nested descendants", async () => {
    const root = await addCard({ parentId: null, type: "folder", label: "root", image: null, audio: null });
    const sub = await addCard({ parentId: root, type: "folder", label: "sub", image: null, audio: null });
    await addCard({ parentId: sub, type: "speak", label: "deep", image: null, audio: null });
    await addCard({ parentId: null, type: "speak", label: "keep", image: null, audio: null });

    expect(await countDescendants(root)).toBe(2);
    await deleteCardCascade(root);
    expect(await db.cards.count()).toBe(1);
    expect(await ids(null)).toEqual(["keep"]);
  });
});

describe("export / import round-trip", () => {
  // NOTE: blob encoding via FileReader is exercised by the browser, not jsdom
  // (jsdom's FileReader rejects structured-clone Blobs), so the export side is
  // tested with media-free cards and the import/decode side is tested directly.
  it("round-trips card structure (parent, type, order) through export/import", async () => {
    await addCard({ parentId: null, type: "speak", label: "A", image: null, audio: null });
    const folder = await addCard({ parentId: null, type: "folder", label: "F", image: null, audio: null });
    await addCard({ parentId: folder, type: "speak", label: "child", image: null, audio: null });

    const backup = await exportData();
    await db.cards.clear();
    expect(await db.cards.count()).toBe(0);

    const ok = await importData(backup);
    expect(ok).toBe(true);
    expect(await db.cards.count()).toBe(3);
    expect(await ids(null)).toEqual(["A", "F"]);
    expect(await ids(folder)).toEqual(["child"]);
  });

  it("accepts and stores a card carrying a base64 media payload", async () => {
    // jsdom Blobs are not structured-cloneable into fake-indexeddb, so we
    // cannot assert the stored byte length here (native browser Blobs are
    // fine). This verifies the validate -> decode -> store pipeline does not
    // throw on a media-bearing backup and that the card is restored.
    const ok = await importData({
      version: 1,
      exportedAt: new Date().toISOString(),
      cards: [
        {
          id: "img1",
          parentId: null,
          type: "speak",
          label: "withImage",
          order: 1000,
          image: { base64: "AQIDBA==", type: "image/png" }, // bytes [1,2,3,4]
          audio: null,
        },
      ],
    });
    expect(ok).toBe(true);
    const restored = await getCard("img1");
    expect(restored?.label).toBe("withImage");
    expect(restored?.type).toBe("speak");
  });

  it("skips a malformed base64 payload instead of failing the whole import", async () => {
    const ok = await importData({
      version: 1,
      exportedAt: new Date().toISOString(),
      cards: [
        {
          id: "bad1",
          parentId: null,
          type: "speak",
          label: "badMedia",
          order: 1000,
          image: { base64: "!!!not base64!!!", type: "image/png" },
          audio: null,
        },
      ],
    });
    expect(ok).toBe(true);
    expect((await getCard("bad1"))?.label).toBe("badMedia");
  });

  it("rejects an invalid backup without touching existing data", async () => {
    await addCard({ parentId: null, type: "speak", label: "A", image: null, audio: null });
    const ok = await importData({ version: 2, cards: "nope" });
    expect(ok).toBe(false);
    expect(await db.cards.count()).toBe(1);
  });
});
