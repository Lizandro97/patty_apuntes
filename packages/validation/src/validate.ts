// Shared save/export rules (web/backend).
// Same codes as backend HTTPExceptions + i18n errors.*.
// Rows arrive in display order; `row` is 1-based in that order.

export type ErrorCode =
  | "STAFF_RANGE"
  | "STAFF_NAMES_INVALID"
  | "INVALID_SCALE"
  | "SCALE_TOO_WIDE"
  | "EMPTY_NAME"
  | "COMPANY_EXISTS";

export interface RuleError {
  code: ErrorCode;
  message: string;
}

export interface MissingField {
  row: number;
  id: string;
  field: "company";
  name: string;
}

export interface RowLike {
  id: string;
  company_id: string | null | undefined;
  name_snapshot?: string | null;
}

/** Rows without a registered company (mirror of missing_fields + Editor). */
export function findRowsMissingCompany<T extends RowLike>(
  rows: T[],
  opts?: { skip?: (row: T) => boolean },
): MissingField[] {
  const out: MissingField[] = [];
  rows.forEach((f, i) => {
    if (opts?.skip?.(f)) return;
    if (!f.company_id) {
      out.push({ row: i + 1, id: f.id, field: "company", name: f.name_snapshot ?? "" });
    }
  });
  return out;
}

/** Semantic alias: export requires the same as save. */
export function validateForExport<T extends RowLike>(rows: T[]): MissingField[] {
  return findRowsMissingCompany(rows);
}

export function validateForSave<T extends RowLike>(rows: T[]): MissingField[] {
  return findRowsMissingCompany(rows);
}

export function validateStaff(n: number): RuleError | null {
  if (!Number.isInteger(n) || n < 1 || n > 10) {
    return { code: "STAFF_RANGE", message: "staff_count must be 1-10" };
  }
  return null;
}

/** Team names, positional: "" = unnamed (P{i+1}). TS mirror. */
export function validateStaffNames(names: unknown): RuleError | null {
  if (!Array.isArray(names) || names.length > 10) {
    return { code: "STAFF_NAMES_INVALID", message: "staff_names must be a list of max 10" };
  }
  for (const n of names) {
    if (typeof n !== "string" || n.length > 24) {
      return { code: "STAFF_NAMES_INVALID", message: "each name must be a string of max 24 chars" };
    }
  }
  return null;
}

/** Sanitize for save/sync: trim, max 24, max 10, keep positions. */
export function sanitizeStaffNames(names: unknown): string[] {
  if (!Array.isArray(names)) return [];
  return names.slice(0, 10).map((n) => (typeof n === "string" ? n : "").trim().slice(0, 24));
}

/** Display name of person i: custom or P{i+1}. */
export function personName(names: readonly string[] | undefined | null, i: number): string {
  const n = names?.[i]?.trim();
  return n || `P${i + 1}`;
}

export function validateScale(start: number, end: number): RuleError | null {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) {
    return { code: "INVALID_SCALE", message: "Invalid year range" };
  }
  if (end - start > 20) {
    return { code: "SCALE_TOO_WIDE", message: "Range too wide (max 20 years)" };
  }
  return null;
}

export function validateCompanyName(
  name: string,
  existingLower: string[],
): RuleError | null {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return { code: "EMPTY_NAME", message: "Empty name" };
  if (existingLower.includes(trimmed.toLowerCase())) {
    return { code: "COMPANY_EXISTS", message: "Company ya existe" };
  }
  return null;
}
