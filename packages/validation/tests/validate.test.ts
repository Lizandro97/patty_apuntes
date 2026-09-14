import { describe, expect, test } from "bun:test";
import vectors from "../vectors.json";
import {
  findRowsMissingCompany,
  validateCompanyName,
  validateScale,
  validateStaff,
  validateStaffNames,
} from "../src/index";

describe("vectores compartidos con backend", () => {
  test("missingCompany", () => {
    for (const v of vectors.missingCompany) {
      expect(findRowsMissingCompany(v.rows as never)).toEqual(v.expected);
    }
  });
  test("staff", () => {
    for (const v of vectors.staff) {
      expect(validateStaff(v.input)?.code ?? null).toBe(v.expected);
    }
  });
  test("staffNames", () => {
    for (const v of vectors.staffNames) {
      expect(validateStaffNames(v.input)?.code ?? null).toBe(v.expected);
    }
  });
  test("scale", () => {
    for (const v of vectors.scale) {
      expect(validateScale(v.start, v.end)?.code ?? null).toBe(v.expected);
    }
  });
  test("companyName", () => {
    for (const v of vectors.companyName) {
      expect(validateCompanyName(v.name, v.existing)?.code ?? null).toBe(
        v.expected,
      );
    }
  });
});
