import { describe, expect, test } from "bun:test";
import { calcProgress, rangeYears } from "../src/index";

describe("calcProgress", () => {
  test("0/0 is 0, half is 50, all is 100", () => {
    expect(calcProgress(0, 0)).toBe(0);
    expect(calcProgress(1, 2)).toBe(50);
    expect(calcProgress(3, 3)).toBe(100);
  });
});

describe("rangeYears", () => {
  test("simple range and 20 max", () => {
    expect(rangeYears(2024, 2025)).toEqual([2024, 2025]);
    expect(rangeYears(2000, 2020)).toHaveLength(21);
  });
});
