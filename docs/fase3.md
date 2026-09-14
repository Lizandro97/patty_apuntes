# Fase 3 — Mobile offline paridad total (cerrada)

## 3A — Datos offline
- `apps/mobile` (Expo SDK 57 + RN 0.82 + React 19.1, `expo-router`,
  `expo-sqlite`, `secure-store`). `app.json` Android `com.foliora.app`,
  `usesCleartextTraffic` (LAN http).
- `src/db/adapters.ts` (memoria + `sqlite.ts` expo-sqlite) con
  `documents/outbox/meta/companies_cache/attachments`; `store.ts`
  (`saveLocal` inmediato+outbox, `markClean`, `applyPulled` con tombstones y
  respeto a sucio local).
- `src/sync/worker.ts`: push FIFO → pull → clean, backoff implícito por
  reintento, outbox intacta ante corte. `src/lib/api.ts` + descubrimiento
  `foliora.local → última IP → manual` + `probeBase`.
- `src/auth/session.ts`: token/device/base en SecureStore (memoria en tests).
- Pantallas: login (pair+login), Inicio (stats+estado+sync), Archivos
  (search/sort/crear/duplicate/delete/export), Empresas (CRUD+validación,
  online con fallback cache), Ajustes (13 prefs portadas, 3 temas, idioma).
- `src/i18n`: es/en copiados de web + test anti-drift (claves idénticas).
- Tests: `bun test apps/mobile 19/19` (store, worker, discovery, i18n,
  attachments, export, **e2e-sync real contra uvicorn**: A offline → sync →
  B recibe por pull).

## 3B — Editor paridad
- `app/editor/[id].tsx`: título, review_type, escala (validateScale), staff
  1-10 (validateStaff), filas CRUD + reorder + CompanyPicker con search +
  bottom-sheet (marcar/desmarcar fila, subir/bajar, borrar), celdas Año×Meses
  toggle/recolor P1..Pn Tol + undo/redo 50 con etiqueta + preview + modal
  validación `missingCompany` + progreso + panel Tabla/Diseño + meses 3 letras
  + targets ≥44px. Todo cambio persiste local + outbox al instante.
- `tsc` móvil limpio, `oxlint` limpio.

## 3C — Export on-device
- `src/export/builders.ts` (Excel `xlsx` + PDF HTML + puerta 422 local
  idéntica al servidor), `filenames.ts` (port exacto, paridad probada
  caso por caso), `share.ts` (`expo-print`/`expo-sharing`, FS legacy SDK 57),
  `attachments.ts` (foto/firma + SHA256 + tabla local; subida Fase 5).
- Límite verificado aquí: build APK y prueba en dispositivo físico
  (sin Android SDK en este entorno) — queda para el usuario.

## Verificación
- `bun test apps/mobile/ 19/19`, `tsc -p apps/mobile` limpio,
  `oxlint` limpio, e2e-sync real verde.
