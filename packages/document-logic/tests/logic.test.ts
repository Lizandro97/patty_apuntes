import { describe, expect, test } from "bun:test";
import { calcProgress, rangeYears } from "../src/index";

describe("calcProgress", () => {
  test("0/0 es 0, mitad es 50, todo es 100", () => {
    expect(calcProgress(0, 0)).toBe(0);
    expect(calcProgress(1, 2)).toBe(50);
    expect(calcProgress(3, 3)).toBe(100);
  });
});

describe("rangeYears", () => {
  test("rango simple y maximo 20", () => {
    expect(rangeYears(2024, 2025)).toEqual([2024, 2025]);
    expect(rangeYears(2000, 2020)).toHaveLength(21);
  });
});
