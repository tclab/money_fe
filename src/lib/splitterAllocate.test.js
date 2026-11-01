import { describe, it, expect } from "vitest";
import { splitterAllocate } from "./splitterAllocate.js";

const item = (type, value, extra = {}) => ({ type, value, ...extra });

describe("splitterAllocate", () => {
  it("totals each type and pools income minus expenses", () => {
    const r = splitterAllocate(
      [item("income", 1000), item("income", 500), item("expense", 300), item("discount", 100)],
      []
    );
    expect(r).toMatchObject({ totalEntradas: 1500, totalSalidas: 300, totalDesc: 100, pool: 1200 });
  });

  it("splits the pool by share", () => {
    const { perPerson } = splitterAllocate(
      [item("income", 1500), item("expense", 300)],
      [{ id: "a", share: 60 }, { id: "b", share: 40 }]
    );
    expect(perPerson).toEqual([
      { id: "a", share: 60, pct: 0.6, amount: 720, discounts: 0 },
      { id: "b", share: 40, pct: 0.4, amount: 480, discounts: 0 },
    ]);
  });

  it("takes each person's discounts off their amount only, not the pool", () => {
    const { pool, perPerson } = splitterAllocate(
      [
        item("income", 1500), item("expense", 300),
        item("discount", 100, { person_id: "a" }), item("discount", 50, { person_id: "a" }),
      ],
      [{ id: "a", share: 60 }, { id: "b", share: 40 }]
    );
    expect(pool).toBe(1200);
    expect(perPerson.map((p) => [p.amount, p.discounts])).toEqual([[570, 150], [480, 0]]);
  });

  it("gives everyone 0% when no one has a share", () => {
    const { perPerson } = splitterAllocate(
      [item("income", 1000)],
      [{ id: "a", share: 0 }, { id: "b", share: 0 }]
    );
    expect(perPerson.map((p) => [p.pct, p.amount])).toEqual([[0, 0], [0, 0]]);
  });

  it("treats a missing share as 0 instead of producing NaN", () => {
    const { perPerson } = splitterAllocate(
      [item("income", 1000), item("discount", 50, { person_id: "b" })],
      [{ id: "a", share: 100 }, { id: "b" }]
    );
    expect(perPerson.map((p) => [p.pct, p.amount])).toEqual([[1, 1000], [0, -50]]);
  });
});
