# Evaluación arquitectónica — Foliora (Fase 0)

Origen: `ARCHITECTURE.md` Instrucción final. Verificado contra código real.
Fecha: 2026-09-12. Estado: pre-plan, sin móvil, sin sync.

## 1. Cómo funciona actualmente el renderizado

- Web (`frontend/src/`): React 19 + Vite + TS + Router 7 + Zustand + TanStack Query.
  `pages/Editor.tsx` (~1439 líneas) renderiza hoja contable Año×Meses, toolbar
  ~13 controles, panel Tabla/Diseño (`hidden xl:flex`), `style={{zoom}}`
  (Chromium-only). Estado visual en `stores/` (settings, history, ui, theme,
  editorHeader, auth); datos vía `lib/api.ts` (axios `/api` + JWT localStorage).
- Backend (`backend/app/`): FastAPI solo API JSON + exportación
  (`routers/records.py:699-898` genera PDF con reportlab y Excel con openpyxl
  vía `StreamingResponse`). No hay SSR ni plantillas: el backend ya NO
  renderiza la UI React. Bien.

## 2. Qué partes del backend dependen de la UI web

1. `app/main.py:32-38` (pre-Fase 0): CORS clavado a `localhost:5173` — impide LAN.
2. `routers/records.py:688-696` `_missing_fields()`: regla "toda fila necesita
   empresa" solo existe en servidor; el Editor la descubre tarde (modal al
   guardar/exportar).
3. Filenames de exportación (`revision-{id}.pdf`, `archivo-{id}.xlsx`) y meses
   de 1 letra: presentación web duplicada en backend, sin fuente única.
4. `main.py:8-28` (pre-Fase 0, eliminado): `DROP TABLE` + `DELETE FROM users`
   en cada arranque — incompatible con sync y con cualquier dato persistente.

## 3. Qué debe desacoplarse (keep / mover / desacoplar)

| Parte actual | Decisión |
|---|---|
| `DROP/DELETE` en arranque | ELIMINADO en Fase 0 → `app/db/init.py:init_db()` (create_all idempotente) + Alembic baseline `fc9e482fe794` (stamp, no-op) |
| CORS/host/puerto | MOVIDO a `app/core/config.py` (`HOST/PORT/CORS_ORIGINS/FOLIORA_HOSTNAME`) por env |
| Validación save/export (`_missing_fields`, `STAFF_RANGE`, escalas) | MOVER a `packages/validation` (Fase 1), backend y web la importan |
| Reglas negocio (`_recalc_progress`, `_ensure_rows/cells`, `_sync_scale`) | MOVER a `packages/document-logic` (Fase 1) |
| Filenames `revision-{id}` / meses 1 letra | MOVER a `packages/validation` + `lib/filenames.ts` (`{slug}-{fecha}`), backend los adopta en Fase 4 |
| `syncSnapshotToServer` recreate+PUT por celda (`Editor.tsx:557-647`) | JUBILAR en Fase 2: diverge IDs; el push es solo upsert por `client_uuid` |
| Generación PDF/Excel servidor | KEEP (backend la conserva siempre); móvil añade generadores locales solo para offline (Fase 3C) desde el mismo `Document` |

## 4. Cómo introducir el modelo de documento compartido

`packages/document-model`: tipos `Document/Row/Cell/Layout` + `map.ts`
(`Record+RecordRow+Cell+RecordLayout+Settings ↔ Document`, con remapeo
`layout.payload.rows` por `position` hoy acoplado en `records.py:360-371`).
Canónico: `client_uuid(=document_id), type, title, metadata, sections=rows,
content=cells, layout, theme, settings, created_at, updated_at, revision,
deleted_at?, device_id, sync_status, last_synced_revision`.
Sin mover la DB en Fase 1 (mapeo en memoria, roundtrip testeado).

## 5. Cómo introducir persistencia local móvil

`apps/mobile` (Expo Router + `expo-sqlite` + `secure-store`):
tablas `documents(doc_uuid PK, payload JSON, sync_status, last_synced_revision,
updated_at)`, `outbox(seq, op, doc_uuid, payload, attempts)`,
`meta(last_pull_rev, device_id)`, `companies_cache`.
Toda escritura → SQLite → `dirty` + outbox → UI inmediata, cero HTTP
(`ARCHITECTURE.md §5`). Solo subset (docs abiertos + cola), nunca full DB (§4).

## 6. Cómo implementar sincronización

Fase 2 servidor: `GET /sync/pull?since_revision&limit` (con tombstones),
`POST /sync/push` idempotente por `client_uuid`, `GET /sync/status`;
LWW v1 por `updated_at` (empate `device_id`), conflictos devueltos sin pérdida,
merge por celda en Fase 5. Worker móvil push FIFO → pull → `clean` con backoff,
tolera corte a mitad (§6). Migración con backfill `client_uuid=id`.

## 7. Cómo mantener compatibilidad con la web existente

- Contrato congelado en `backend/tests/test_fase0_baseline.py` (9 tests):
  health, auth, records/companies/settings CRUD, 422 export, PDF/Excel 200.
- Web no se rediseña: Fase 4 solo badge sync real, filenames, skeletons y
  drawer `lg`. API REST existente intacta; `/sync/*` es aditivo.
- Estrategia: Fases 0→5 incrementales, cada una deja la app usable, sin rewrite.

## Acoplamientos residuales conocidos (no bloquean Fase 0)

- Deprecations Pydantic `class Config` en schemas (warnings, migrar a
  `ConfigDict` cuando se toquen esos archivos).
- `SECRET_KEY` default en código (rotar por env en despliegue LAN, Fase 4).
