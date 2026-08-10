import { describe, it, expect } from "vitest";
import { cn, catColor, toMonthKey, toDateKey, fmt, fmtMonth } from "./utils.js";
import { SECTION_COLORS } from "./tokens.js";

describe("cn", () => {
  it("merges conflicting tailwind classes, last one wins", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("drops falsy inputs and keeps the rest", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});

describe("catColor", () => {
  it("is stable for the same id", () => {
    expect(catColor("cat-1")).toBe(catColor("cat-1"));
  });

  it("always returns a member of SECTION_COLORS", () => {
    for (const id of ["", "a", "cat-1", "cat-2", 42, null, undefined, "long-category-id"]) {
      expect(SECTION_COLORS).toContain(catColor(id));
    }
  });
});

describe("toMonthKey", () => {
  it("zero-pads single-digit months", () => {
    expect(toMonthKey(new Date(2026, 0, 15))).toBe("2026-01");
  });

  it("leaves two-digit months alone", () => {
    expect(toMonthKey(new Date(2026, 10, 1))).toBe("2026-11");
  });
});

describe("toDateKey", () => {
  // The whole point of toDateKey: a local date late in the day must not roll
  // forward the way toISOString would in a positive-offset timezone.
  it("does not shift a late-evening local date to the next day", () => {
    expect(toDateKey(new Date(2026, 7, 9, 23, 30))).toBe("2026-08-09");
  });

  it("zero-pads month and day", () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("fmt", () => {
  // minimumFractionDigits: 0 only drops the trailing ",00" on whole amounts;
  // it does not round fractional input away.
  it("formats a whole COP amount with no decimals by default", () => {
    const out = fmt(1234);
    expect(out).toContain("1.234");
    expect(out).not.toMatch(/[.,]\d\d$/);
  });

  it("formats USD under en-US", () => {
    expect(fmt(1234, "en-US", "USD")).toBe("$1,234");
  });

  it("coerces null and undefined to zero", () => {
    expect(fmt(null, "en-US", "USD")).toBe("$0");
    expect(fmt(undefined, "en-US", "USD")).toBe("$0");
  });
});

describe("fmtMonth", () => {
  it("uppercases the long month and appends the year", () => {
    expect(fmtMonth(new Date(2026, 7, 9), "en-US")).toBe("AUGUST 2026");
  });
});
