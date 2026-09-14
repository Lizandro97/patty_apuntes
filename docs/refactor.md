# Refactor arquitectónico — dashboard (2026-09)

Investigación base: híbrido Clean Architecture + Feature-Sliced Design
(feature-sliced.design), Bulletproof React (alan2207, 36k stars),
Robin Wieruch feature-architecture, Vercel microfrontends verticales
(descartado: innecesario a este tamaño), FastAPI best practices
(zhanymkanov, Auth0 2026), Clean Architecture FastAPI (4 capas).

## Decisiones estables

- Backend: routers thin + `app/services/` (records/export/sync). Sin ORM
  en routers nuevos; `touch_record` conserva timestamp del escritor (LWW).
- Frontend: `src/shared/` (api, queryKeys, format) + `src/features/editor/`
  (componentes extraídos de Editor.tsx). Pages no tocan `axios` directo
  (salvo Editor en migración) ni literales de queryKey.
- Contratos TS↔Python: `calc_progress` half-up (= Math.round),
  `remap_layout_rows` descarta ids obsoletos y conserva `header`,
  `sanitize_staff_names` solo conserva strings. Vectores en
  `packages/validation/vectors.json` + tests espejo.
- Auth web: `refresh_token` vive en `stores/auth` (setAuth lo persiste);
  el interceptor 401 emite `auth:logout`, App navega sin hard-reload.
- Settings: la página solo vuelca claves del store; `table_header_bg`
  sí se persiste al servidor (antes se omitía). `date_format`,
  `layout_mode`, `autosave` son solo-locales (sin columna backend).
- Devices multitenant: `devices.user_id` (ALTER ligero en `init_db`
  para DBs existentes); claim público por diseño ata el device al dueño
  del pairing_token; list/revoke filtran por usuario.
- Export: `MAX_EXPORT_YEARS=20` (422 `SCALE_TOO_LARGE` si excede);
  builders en `services/export_service.py`.
- Seguridad: sin SECRET_KEY default público (clave efímera + warning si
  falta env); uploads con lectura acotada + sniff magic bytes; `get_db`
  con rollback; ratelimit con evicción; `init_db` en lifespan (no en import);
  handlers globales 422/DB.
- Ruta celdas canónica: `PUT /records/cells/{id}`; `/records/../cells/{id}`
  queda como alias legacy oculto.
- CI (`.github/workflows/ci.yml`): backend ruff+pytest, packages bun test,
  web oxlint+bun test+build.

## Deuda conocida (no bloqueante)

- `GET rows/cells/stats/export` materializan defaults vía `ensure_live`
  (escribe solo si faltan filas/celdas, con touch para no perder sync).
  Ideal futuro: backfill en writes, GETs read-only.
- Editor.tsx: slice de datos aplicado (4 cortes commiteados: api,
  useEditorData, useEditorMutations, draft). La página quedó en ~1100L
  (era 1558): conserva JSX + estado visual + persistDraft/saveAll/export.
  Futuro: extraer saveAll/persistDraft/export a un hook useEditorSave.
- `validate_staff_names` TS no hace trim antes de `length > 24`
  (igual que Python: valida en crudo; el trim ocurre en sanitize).
