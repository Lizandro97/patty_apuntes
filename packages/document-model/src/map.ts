import type { DocCell, DocLayout, DocRow, Document } from "./document";

interface ServerRecord {
  id: string;
  title: string;
  review_type?: string;
  period_start: number;
  period_end: number;
  staff_count?: number;
  staff_names?: string[];
  created_at: string;
  updated_at: string;
  revision?: number;
  deleted_at?: string | null;
  device_id?: string;
}

interface ServerRow {
  id: string;
  company_id: string | null;
  name_snapshot: string;
  position: number;
  assignee?: string | null;
  note?: string | null;
  updated_at?: string;
}

interface ServerCell {
  id?: string;
  row_id: string;
  year: number;
  month: number;
  reviewed: boolean;
  color?: string | null;
  assignee?: string | null;
  note?: string | null;
  style?: Record<string, unknown> | null;
  updated_at?: string;
}

interface ServerLayout {
  section: string;
  payload: Record<string, unknown>;
}

/** Record+Rows+Cells+Layouts (API) -> Document canonico. */
export function fromServerParts(parts: {
  record: ServerRecord;
  rows: ServerRow[];
  cells: ServerCell[];
  layouts: ServerLayout[];
  theme?: string;
  settings?: Record<string, unknown>;
}): Document {
  const { record, rows, cells, layouts } = parts;
  const bySection = new Map(layouts.map((l) => [l.section, l.payload ?? {}]));
  const sections: DocRow[] = rows.map((r) => ({
    client_uuid: r.id,
    company_id: r.company_id,
    name_snapshot: r.name_snapshot,
    position: r.position,
    assignee: r.assignee ?? null,
    note: r.note ?? null,
    updated_at: r.updated_at ?? record.updated_at,
  }));
  const content: DocCell[] = cells.map((c) => ({
    client_uuid: c.id,
    row_uuid: c.row_id,
    year: c.year,
    month: c.month,
    reviewed: c.reviewed,
    color: c.color ?? null,
    assignee: c.assignee ?? null,
    note: c.note ?? null,
    style: c.style ?? null,
    updated_at: c.updated_at ?? record.updated_at,
  }));
  const layout: DocLayout = {
    sheet: { ...bySection.get("sheet") },
    table: { ...bySection.get("table") },
  };
  return {
    client_uuid: record.id,
    type: "review",
    title: record.title,
    metadata: { review_type: record.review_type ?? "" },
    period_start: record.period_start,
    period_end: record.period_end,
    staff_count: record.staff_count ?? 2,
    staff_names: Array.isArray(record.staff_names) ? record.staff_names : [],
    sections,
    content,
    layout,
    theme: parts.theme,
    settings: parts.settings,
    created_at: record.created_at,
    updated_at: record.updated_at,
    revision: record.revision ?? 0,
    deleted_at: record.deleted_at ?? null,
    device_id: record.device_id,
    sync_status: "clean",
    last_synced_revision: record.revision ?? 0,
  };
}

/** Reasigna `payload.rows` por posicion (duplicar archivo, backend records.py).
 * Claves que no son filas (p. ej. "header") se conservan tal cual. */
export function remapLayoutRows(
  payload: { rows?: Record<string, unknown> } & Record<string, unknown>,
  oldRows: { id: string; position: number }[],
  newRows: { id: string; position: number }[],
): Record<string, unknown> {
  const rowPayload = payload.rows ?? {};
  const newByPos = new Map(newRows.map((r) => [r.position, r.id]));
  const remapped: Record<string, unknown> = {};
  for (const f of oldRows) {
    const v = (rowPayload as Record<string, unknown>)[f.id];
    const nid = newByPos.get(f.position);
    if (v !== undefined && nid !== undefined) remapped[nid] = v;
  }
  return { ...payload, rows: remapped };
}
