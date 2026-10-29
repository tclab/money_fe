import { moveById } from "./CategorizedPage.jsx";

describe("moveById", () => {
  const xs = [{ id: "a", position: 0 }, { id: "b", position: 1 }, { id: "c", position: 2 }];

  it("moves a row and renumbers, and the inverse move undoes it", () => {
    const moved = moveById(xs, "c", -1);
    expect(moved.map((x) => x.id)).toEqual(["a", "c", "b"]);
    expect(moved.map((x) => x.position)).toEqual([0, 1, 2]);
    expect(moveById(moved, "c", 1)).toEqual(xs);
  });

  it("is a no-op out of bounds or for an unknown id", () => {
    expect(moveById(xs, "a", -1)).toBe(xs);
    expect(moveById(xs, "zz", 1)).toBe(xs);
  });
});
