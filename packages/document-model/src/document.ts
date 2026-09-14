// Modelo canonico Foliora (ARCHITECTURE.md §2). Independiente de React/RN.
// sections == filas, content == celdas mensuales, layout == diseno visual.

export type SyncStatus = "clean" | "dirty" | "pending" | "conflict";

export interface DocCell {
  client_uuid?: string;
  row_uuid: string;
  year: number;
  month: number; // 1-12
  reviewed: boolean;
  color?: string | null;
  assignee?: string | null;
  note?: string | null;
  style?: Record<string, unknown> | null;
  updated_at: string;
}

export interface DocRow {
  client_uuid: string;
  company_id: string | null;
  name_snapshot: string;
  position: number;
  assignee?: string | null;
  note?: string | null;
  updated_at: string;
}

export interface DocLayout {
  sheet: Record<string, unknown>;
  table: Record<string, unknown>;
}

export interface Document {
  client_uuid: string; // == document_id (§7)
  type: "review";
  title: string;
  metadata: { review_type: string };
  period_start: number;
  period_end: number;
  staff_count: number;
  staff_names: string[];
  sections: DocRow[];
  content: DocCell[];
  layout: DocLayout;
  theme?: string;
  settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  revision: number;
  deleted_at?: string | null;
  device_id?: string;
  sync_status: SyncStatus;
  last_synced_revision: number;
}
