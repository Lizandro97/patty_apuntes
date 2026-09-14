# Fase 1 — Modelo + validación compartidos (cerrada)

- Workspace bun raíz (`foliora`, `workspaces: frontend, packages/*, apps/*`).
- `packages/document-model`: `Document` canónico + `fromServerParts` +
  `remapLayoutRows` (lógica de duplicar por posición).
- `packages/document-logic`: `calcProgress`, `rangeYears` (+ `MAX_SCALE_YEARS`).
- `packages/validation`: `findRowsMissingCompany`, `validateForSave/Export`,
  `validateStaff/Scale/CompanyName` + `vectors.json` compartidos con backend.
- Espejo Python `backend/app/validation/rules.py`; `routers/records.py`
  delega `_missing_fields`, staff y escala (mismos códigos HTTP).
- `Editor.tsx` usa `findRowsMissingCompany` (save/draft/export); `Records.tsx`
  lee `f.row/f.name` del 422 (antes `f.fila/f.nombre` → undefined).
- Verificación: `bun test packages/ 8/8`, `pytest 13/13`, `ruff` limpio,
  `tsc` + `vite build` verdes.
