# docs/INDEX

Fuente de verdad de decisiones estables del proyecto (ver AGENTS.md).

Nota de rutas (opción A): `frontend/` → `apps/web`, `backend/` → `apps/backend`.
Los docs fase0–fase5 se escribieron con las rutas viejas; leerlos con este mapeo.
Nueva documentación usa siempre `apps/*`.

- `evaluacion.md` — Evaluación arquitectónica Fase 0 (7 puntos Instrucción final).
- `fase0.md` — Cierre Fase 0 (higiene LAN + baseline).
- `fase1.md` — Cierre Fase 1 (modelo + validación compartidos).
- `fase2.md` — Cierre Fase 2 (sync LWW v1 en servidor).
- `fase3.md` — Cierre Fase 3 (mobile offline paridad + export on-device).
- `fase4.md` — Cierre Fase 4 (servidor LAN + seguridad + web coherente).
- `fase5.md` — Cierre Fase 5 (resolve merge/mine/theirs, adjuntos, golden).
- `PLAN.md` (raíz) — Plan maestro Web + Android + Local-First, fases 0–5.
- `ARCHITECTURE.md` (raíz) — Arquitectura objetivo original.
- Decisión móvil (2026-09): app React Native **eliminada** (`archive/mobile-rn/`, `app.json`, `scripts/android-dev.sh`, `packages/sync` y deps `expo/react-native` raíz). Producto = **solo web full responsive** (misma UI, táctil ≥44px, sin hover-only). Capa sync del backend intacta (la usa Inicio vía `GET /sync/status`); sus fixtures golden se mudaron de `packages/sync/` a `apps/backend/tests/fixtures/`. Docs fase0–5 y `REPORT.md`/`ARCHITECTURE.md` se conservan como historia.
- Decisión táctil editor (2026-09): la hoja A4 usa CSS `zoom`, nunca `transform: scale` — el transform desfasa el hit-test táctil tras scroll horizontal en Chromium móvil (solo respondía la columna del borde izquierdo). Menús (`CompanyPicker`, `RowMenu`) como bottom-sheet cuando `hover:none` o ancho <1024px; `touch-action: manipulation` en controles; scroll tabla con `overscroll-behavior-x: contain` (clase `sheet-scroll`). 2.º batch: `thead` static en táctil (`@media (hover:none)` en `index.css`, el sticky anidado rompía el hit-test), hoja con `overflow: clip` en vez de `hidden`, y `pointer-events-none` en drawer/sidebar/FAB cerrados en móvil. Ver `apps/web/src/pages/Editor.tsx`, `apps/web/src/components/Layout.tsx`, `apps/web/src/index.css`.
