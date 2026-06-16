import { describe, it, expect } from "vitest";
import { arrayMove, orderBetween, ORDER_STEP } from "./ordering";

describe("arrayMove", () => {
  it("moves an item forward", () => {
    expect(arrayMove([1, 2, 3, 4], 0, 2)).toEqual([2, 3, 1, 4]);
  });
  it("moves an item backward", () => {
    expect(arrayMove([1, 2, 3, 4], 3, 1)).toEqual([1, 4, 2, 3]);
  });
  it("does not mutate the input", () => {
    const input = [1, 2, 3];
    arrayMove(input, 0, 2);
    expect(input).toEqual([1, 2, 3]);
  });
});

describe("orderBetween", () => {
  it("returns the step when there are no neighbours", () => {
    expect(orderBetween(null, null)).toBe(ORDER_STEP);
  });
  it("returns below the first item when inserting at the start", () => {
    expect(orderBetween(null, 1000)).toBe(1000 - ORDER_STEP);
  });
  it("returns above the last item when inserting at the end", () => {
    expect(orderBetween(2000, null)).toBe(2000 + ORDER_STEP);
  });
  it("returns the midpoint between two neighbours", () => {
    expect(orderBetween(1000, 2000)).toBe(1500);
  });
  it("signals a rebalance when there is no gap", () => {
    expect(orderBetween(1000, 1000)).toBeNull();
    expect(orderBetween(1, 1 + Number.EPSILON)).toBeNull();
  });
});
