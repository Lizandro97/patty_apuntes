# Fase 0 — Higiene LAN + baseline (cerrada)

- Arranque no destructivo: `backend/app/db/init.py:init_db()` + Alembic
  baseline `fc9e482fe794` (stamp, no-op). `patty.db` marcada, tablas legacy
  `board_*` intactas.
- Red por env: `HOST/PORT/CORS_ORIGINS/FOLIORA_HOSTNAME/ATTACH_DIR/MAX_UPLOAD_MB`
  en `app/core/config.py`. Frontend `VITE_API_URL` + `VITE_API_PROXY`.
- Contrato congelado: `backend/tests/test_fase0_baseline.py` (9 tests).
- `pytest` + `httpx` añadidos al grupo dev.
- Verificación: `pytest 9/9`, `ruff` limpio, `tsc` + `oxlint` + `vite build` verdes.
