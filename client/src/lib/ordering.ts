// Fractional ordering helpers. Cards carry a numeric `order`; on reorder we
// only need to rewrite the moved card (set it to a value between its new
// neighbours) instead of renumbering the whole folder. When there is no room
// left between two neighbours we signal a rebalance.

export const ORDER_STEP = 1000;

/** Pure array move (avoids coupling this module to @dnd-kit). */
export function arrayMove<T>(arr: readonly T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Compute an order value strictly between `before` and `after`.
 * `null`/`undefined` means "no neighbour on that side".
 * Returns `null` when there is no representable gap (caller should rebalance).
 */
export function orderBetween(
  before: number | null | undefined,
  after: number | null | undefined,
): number | null {
  if (before == null && after == null) return ORDER_STEP;
  if (before == null) return (after as number) - ORDER_STEP;
  if (after == null) return before + ORDER_STEP;
  const mid = (before + after) / 2;
  if (mid <= before || mid >= after) return null; // no gap left
  return mid;
}
