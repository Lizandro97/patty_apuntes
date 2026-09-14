# Fase 5 — Endurecer (cerrada)

## Conflictos v2
- `POST /api/sync/resolve {client_uuid, strategy, doc?}`:
  `merge` (union filas + OR celdas + metadata del más nuevo),
  `mine` (doc cliente reestampado a ahora), `theirs` (servidor intacto).
- LWW v1 intacto: el conflicto se detecta igual; resolve es el camino
  explícito. `merge_docs` en `app/sync/engine.py` + espejo TS
  `mergeDocuments` en `packages/sync` (tests ambos lados).
- Migración `e5de9009668a`: `client_uuid` UNIQUE global →
  UNIQUE(`user_id`, `client_uuid`) — hallazgo real: dos usuarios
  sincronizando el mismo uuid generado colisionaban (batch mode SQLite).
- Móvil: conflictos del último sync en Inicio con Mío/Fusionar/Servidor
  (`resolveConflict` adopta limpio + tira outbox vieja + re-sync; converge).

## Binarios (§12)
- `POST /records/{id}/attachments` (multipart `file`, allowlist
  jpg/png/webp/pdf, `MAX_UPLOAD_MB`, SHA256, dedup por `(record,hash)`),
  `GET .../attachments`, `GET /attachments/{id}/content` (ownership check,
  fuera de webroot). Servidor incluye miniaturas verificadas con PIL
  (aspecto preservado, rotas se omiten) en el PDF.
- Móvil: `uploadPendingAttachments` (inyectable para tests) + foto/firma
  (image-picker + SHA256) + tabla local + marca synced (dedup también vale).
- PDF móvil acepta adjuntos como data-URI.

## Golden cross-platform
- `packages/sync/golden-doc.json` + `golden-grid.json` (plano PDF) +
  `golden-excel.json` (2 filas: años fusionados + meses, idéntico al servidor).
- Backend: el xlsx exportado == golden (normalizando vacías None↔"").
- Móvil: `buildExcel`/`sheetHeader`/`flatRows` == golden + PDF con data-URI.

## Deuda web (verificada, sin cambios)
- Undo agrupado: ya existe coalescencia 2 s (`pushHistory`).
- Listas: Inicio top-50 + Records paginado 50 (ya virtualizado en la práctica).
- `zoom` CSS: se mantiene (propiedad estándar Baseline; Firefox ≥126 la
  soporta). Si un dispositivo real la rompe, fallback a `transform: scale`.
- Copy `saveAll`: no se renombra sin decisión UX; el badge real de Fase 4 ya
  eliminó la reassurance falsa del estado.

## Verificación
- `pytest 34/34`, `ruff` limpio, `bun test` mobile+packages 37/37,
  `tsc` web+móvil + `vite build` + `oxlint` verdes, e2e-sync real verde.

## Límites conocidos (no bloquean)
- Build APK y prueba en dispositivo físico: sin Android SDK aquí.
- Companies/settings se sincronizan por lectura online (no por protocolo).
- Push reemplaza el documento completo (merge fino por celda solo vía resolve).
