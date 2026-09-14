import { describe, expect, test } from "bun:test";
import { fromServerParts, remapLayoutRows } from "../src/index";

const record = {
  id: "r1",
  title: "T",
  review_type: "Compras",
  period_start: 2024,
  period_end: 2024,
  staff_count: 2,
  created_at: "2024-01-01T00:00:00",
  updated_at: "2024-01-02T00:00:00",
};
const rows = [
  { id: "f1", company_id: "c1", name_snapshot: "A", position: 0 },
  { id: "f2", company_id: null, name_snapshot: "", position: 1 },
];
const cells = [
  { row_id: "f1", year: 2024, month: 1, reviewed: true, color: "#0072B2" },
  { row_id: "f1", year: 2024, month: 2, reviewed: false },
];
const layouts = [
  { section: "sheet", payload: { orientation: "vertical" } },
  { section: "table", payload: { rows: { f1: { h: 30 } }, header: { h: 44 } } },
];

describe("fromServerParts", () => {
  test("mapea record+rows+cells+layouts a Document", () => {
    const doc = fromServerParts({ record, rows, cells, layouts } as never);
    expect(doc.client_uuid).toBe("r1");
    expect(doc.type).toBe("review");
    expect(doc.metadata).toEqual({ review_type: "Compras" });
    expect(doc.sections).toHaveLength(2);
    expect(doc.content).toHaveLength(2);
    expect(doc.layout.sheet).toEqual({ orientation: "vertical" });
    expect(doc.layout.table.rows).toEqual({ f1: { h: 30 } });
    expect(doc.sync_status).toBe("clean");
    expect(doc.revision).toBe(0);
  });
});

describe("remapLayoutRows (duplicar por posicion)", () => {
  test("reasigna altos por posicion y conserva claves no-fila", () => {
    const out = remapLayoutRows(
      { rows: { f1: { h: 30 }, f9: { h: 9 } }, header: { h: 44 } },
      [
        { id: "f1", position: 0 },
        { id: "f2", position: 1 },
      ],
      [
        { id: "n1", position: 0 },
        { id: "n2", position: 1 },
      ],
    );
    expect(out).toEqual({ rows: { n1: { h: 30 } }, header: { h: 44 } });
  });
});
