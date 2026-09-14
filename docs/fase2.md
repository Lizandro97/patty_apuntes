# Fase 2 — Sync-ready servidor LWW v1 (cerrada)

- Migración `2befa4471fc7` (no destructiva, tolera `create_all` previo):
  `records.client_uuid/revision/device_id/sync_status/last_synced_revision/deleted_at`,
  `record_rows/cells.updated_at`, tablas `devices/attachments/sync_meta`,
  backfill `client_uuid=id` + `sync_meta(1,0)`. `patty.db` en head.
- `app/sync/engine.py`: `next/current_revision`, `touch_record` (único escritor
  de `updated_at`/`revision`; se quitó el `onupdate` de `Record` porque pisaba
  el timestamp del ganador LWW), `incoming_wins`, `record_to_doc`, `apply_doc`
  (upsert por `client_uuid`, reintento idéntico → accepted, reemplazo wholesale).
- Endpoints `/api/sync/pull|push|status` (auth, scope `user_id`, `limit≤500`).
- `routers/records.py`: filtro `deleted_at` en toda lectura, borrado lógico
  (tombstone), `touch_record` en create/update/duplicate/rows/cells/layout/
  reorder + `_ensure_live` (los GET que materializan defaults también pisan
  revisión, si no el pull los perdería).
- `packages/sync`: tipos de protocolo + `resolveLww` (espejo TS).
- Alcance v1: sync a nivel documento; companies/settings se leen online
  (cache móvil en 3A); `devices`/`attachments` solo tablas (endpoints en 3A/5).
- Verificación: `pytest 20/20`, `bun test packages/ 11/11`, `ruff` limpio.
