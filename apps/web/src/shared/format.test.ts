import { describe, expect, test } from "bun:test";
import { fmtDate } from "./format";

describe("fmtDate", () => {
  test("formatea por idioma", () => {
    expect(fmtDate("2024-03-05T12:00:00", "es")).toContain("2024");
    expect(fmtDate("2024-03-05T12:00:00", "en")).toContain("2024");
  });
  test("valores vacios o invalidos no rompen", () => {
    expect(fmtDate(null, "es")).toBe("—");
    expect(fmtDate(undefined, "en")).toBe("—");
    expect(fmtDate("no-fecha", "es")).toBe("—");
  });
});
