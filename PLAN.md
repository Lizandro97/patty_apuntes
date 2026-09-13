# PLAN — Foliora Web + Android + Local-First

Origen: `ARCHITECTURE.md`. Estado base verificado en repo (`backend/app/`, `frontend/src/`).
Restricción madre: **no rewrite**. Web terminada, solo toques UI/UX. Migración incremental, cada fase deja app usable.

## Decisiones cerradas con usuario

1. Descubrimiento LAN: `foliora.local` (mDNS) primario + fallback última IP + input manual.
2. Conflictos: LWW v1 simple ahora (`updated_at`, desempate `device_id`), merge por celda en Fase 5.
3. Export: paridad completa — PDF/Excel se generan en el teléfono sin red desde el `Document` canónico.

## 0. Punto de partida verificado

* Backend: FastAPI + SQLAlchemy + SQLite (`backend/app/main.py`, `db/session.py`, `models/record.py|cell.py|record_row.py|record_layout.py`, `routers/records.py`, `schemas/record.py`). Solo API JSON + export PDF/Excel por `StreamingResponse` (`routers/records.py:699-898`). No hace SSR React — bien.
* Web: React+Vite+TS (`frontend/src/App.tsx`, `pages/Editor.tsx`, `lib/api.ts:1-24` baseURL `/api` + JWT en localStorage, proxy Vite `vite.config.ts:13-18` a `localhost:8000`).
* Deuda bloqueante para LAN/sync:
  1. `main.py:8-28` hace `DROP TABLE` + `DELETE FROM users` en arranque.
  2. `main.py:32-38` CORS solo `localhost:5173`.
  3. Sin campos sync: `Record/Cell/Row` sin `revision/device_id/sync_status/deleted_at`; `Cell` sin `updated_at`.
  4. Validación partida: `_missing_fields()` en `records.py:688-696` + checks en `Editor.tsx` + `schemas/record.py`.
  5. Sin `packages/`, sin `apps/mobile`, sin `docs/`.

## 1. Arquitectura objetivo (sin implementar literal si hay menor impacto)

```text
foliora/
├── apps/web/          <- frontend/ actual movido tal cual
├── apps/mobile/       <- Expo + SQLite local (nuevo)
├── apps/backend/      <- backend/ actual movido tal cual
├── packages/
│   ├── document-model/  # tipos canónicos + mapeo Record<->Document
│   ├── document-logic/  # reglas de negocio: progreso, ensure rows/cells, escala, staff
│   ├── validation/      # reglas save/export compartidas
│   └── sync/            # protocolo pull/push, LWW, cola outbox (tipos + cliente)
└── docs/                # evaluacion.md + una página por fase
```

Modelo canónico (`ARCHITECTURE.md §2` — `id/type/title/metadata/sections/content/theme/settings/created_at/updated_at/revision`):

```text
Document { client_uuid (=document_id), type="review", title, metadata{review_type},
  sections==rows[], content==cells[], layout{sheet,table}, theme?, settings?,
  created_at, updated_at, revision, deleted_at?, device_id,
  sync_status(clean|dirty|pending|conflict), last_synced_revision }
```

Regla: Web y Mobile nunca hablan SQL entre sí; solo `Document` JSON contra `FastAPI`. Visual (HTML/CSS vs RN) no se comparte; modelo+validación sí.

---

## Fase 0 — Higiene LAN + baseline (bloqueante, 1-2 días)

Objetivo: backend arrancable en LAN sin perder datos.

* [ ] Quitar bloque destructivo `main.py:8-28`. Sustituir por Alembic (`alembic init`, una revisión baseline `create_all` actual). Añadir test: arrancar dos veces no borra `users/records`.
* [ ] Config red por env (`app/core/config.py`): `HOST=0.0.0.0`, `PORT=8000`, `CORS_ORIGINS` (coma-separada, default `http://localhost:5173`), `FOLIORA_HOSTNAME`. Documentar firewall ufw + `uvicorn --host 0.0.0.0`.
* [ ] Congelar contrato: `GET /api/health`, auth, `/api/records` CRUD, export PDF/Excel. Tests backend (pytest+httpx) que fallen si cambia forma sin versión.
* [ ] Frontend: `lib/api.ts` lee `VITE_API_URL` con fallback `/api`; `vite.config.ts` proxy usa env.
* [ ] Entregable `docs/evaluacion.md` (Instrucción final, 7 puntos, sin código): cómo renderiza hoy (`Editor.tsx` hoja/toolbars/panel + `StreamingResponse` PDF/Excel en `records.py:699-898`); qué backend depende de UI (CORS `main.py:32-38`, validación `records.py:688-696`, filenames `revision-{id}.pdf`); qué desacoplar (config red, validación, filenames, `syncSnapshotToServer` recreate en `Editor.tsx:557-647`); cómo introducir modelo compartido / persistencia móvil / sync; cómo mantener compat web. Más `docs/INDEX.md`.
* Criterio salida: `curl http://<IP-LAN>:8000/api/health` OK desde otro equipo; web local sigue igual; `ruff check backend/app` verde; `docs/evaluacion.md` existe.

## Fase 1 — Modelo + validación compartidos (sin mover DB)

Objetivo: una sola verdad de dominio, cero cambio visual.

* [ ] `packages/document-model/`: `document.ts` (tipos `Document/Row/Cell/Layout`), `map.ts` (`Record+Rows+Cells+Layouts -> Document` y vuelta, incluye remapeo `layout.payload.rows` por `position`), `index.ts`. Test: roundtrip con fixture de 2 filas x 1 año.
* [ ] `packages/document-logic/`: extraer de `routers/records.py:33-155` (`_recalc_progress`, `_ensure_rows/_cells`, `_sync_scale`) a funciones puras reutilizables por backend y móvil. Test: mismo progreso/escala en ambos lados.
* [ ] `packages/validation/`: portar `_missing_fields()` + reglas `STAFF_RANGE/INVALID_SCALE/SCALE_TOO_WIDE/EMPTY_NAME` a funciones puras `validateForSave/validateForExport` con códigos `{row,field,message}` ES/EN. Test: fila sin empresa → error save/export idéntico backend/web.
* [ ] Backend: `routers/records.py` delega en `validation` (import local, sin monorepo tooling aún). Frontend: `Editor.tsx` usa mismo paquete para validación temprana al crear fila (placeholder "Elegir empresa ▾" en vez de modal tardío).
* [ ] `oxlint` verde en packages.
* Criterio salida: mismo error save/export en web y API; `Editor` sin `alert()` nativo (sustituir por toast/modal, ver REPORT.md P1).

## Fase 2 — Sync-ready en servidor (LWW v1)

Objetivo: API capaz de push/pull idempotente y tolerante a cortes.

* [ ] Migración Alembic (`ARCHITECTURE.md §7` completo, no decorativo):
  `records.client_uuid TEXT UNIQUE NOT NULL (=document_id, generado en cliente)`, `records.revision INT default 0`, `records.device_id`, `records.sync_status default 'clean'`, `records.last_synced_revision INT`, `records.deleted_at NULL` (tombstone), `record_rows.updated_at`, `cells.updated_at`, nueva tabla `devices{id,name,paired_at,token_hash,revoked}` y `attachments{id,record_id,hash,mime,size,created_by_device}` (vacía, prepara §12 imágenes/firmas). Backfill: `client_uuid=id` en filas existentes. Detección: nuevos=`client_uuid` desconocido, pendientes=`sync_status!=clean`/outbox, eliminados=tombstone, concurrentes=mismo `client_uuid` distinto `updated_at`, conflictos=LWW perdedor.
* [ ] Endpoints nuevos (todo bajo `/api`, auth requerida):
  * `GET /sync/pull?since_revision=N&limit=200` → `{changes:[Document], current_revision, has_more}` (incluye tombstones `deleted_at`).
  * `POST /sync/push` `{changes:[Document con client_uuid+updated_at+device_id]}` → `{accepted:[{id,revision}], conflicts:[{id,server_doc,reason}]}`. Upsert idempotente por `client_uuid`; `revision` global autoincremental por commit.
  * `GET /sync/status` → `{current_revision, pending?}` para badge web honesto (quita "Sincronizado" falso de `Inicio.tsx:45`).
* [ ] Regla conflicto v1: last-write-wins por `updated_at` (empate → `device_id` lexicográfico mayor). Todo conflicto se devuelve, nunca se pierde dato. Diseño permite `merge` por celda en Fase 5.
* [ ] Tests (TDD, `ARCHITECTURE.md §14`): crear offline→push→pull en otro cliente; push duplicado idempotente; corte simulado (push parcial → reintento sin duplicar); delete → tombstone; `updated_at` concurrente → LWW determinista. `ruff` + `pytest` verdes.
* Criterio salida: dos navegadores/usuarios simulados convergen vía pull/push sin usar UI móvil.

## Fase 3A — Mobile datos offline (Companies/Records/Inicio/Settings/Auth)

Objetivo: paridad total de pantallas no-editoras, 100% offline.

* [ ] Scaffold `apps/mobile` (Expo Router + TS + `expo-sqlite` + `expo-secure-store` para token/device_id). Reutiliza `packages/document-model|document-logic|validation|sync-client`.
* [ ] Esquema SQLite local: `documents(doc_uuid PK=client_uuid, payload JSON Document, sync_status: clean|dirty|pending|conflict, last_synced_revision, updated_at)`, `outbox(seq, op, doc_uuid, payload, attempts)`, `meta(k,v: last_pull_rev, device_id)`, `companies_cache` espejo para picker instantáneo. Solo subset: docs abiertos + cola, nunca full DB servidor (`§4`).
* [ ] Flujo: toda escritura → SQLite local → marca `dirty` + encola → UI inmediata sin HTTP (`§5`). Worker sync: detecta `health` → `push outbox FIFO` → `pull since` → marca `clean`, reintenta con backoff, sobrevive a corte.
* [ ] Paridad: Auth (register/login/me, JWT persistente, mismos códigos `EMAIL_TAKEN/INVALID_CREDENTIALS`, ES/EN); Inicio (stats, badge sync derivado de outbox, actividad 50, progreso); Companies (CRUD+search+Enter-crear+dedup+edit modal+delete `alertdialog`); Records (crear con `newRecordPayload`, search/sort/paginado 50/rename/duplicate con remapeo layout/delete/download); Settings 13 prefs + `applyTheme()` RN + idioma mismo JSON.
* [ ] Auth LAN: pairing por QR (`http://foliora.local:8000 + token corto 1 uso`) → guarda URL efectiva + JWT + `device_id`. Descubrimiento: `foliora.local` → última IP → input manual.
* [ ] Tests (jest): CRUD avión ON visible; 3 docs offline push ordenado; corte a mitad → reanudar sin pérdida ni duplicados; recibir cambio servidor.
* Criterio salida: modo avión ON → todo 3A funciona; avión OFF en LAN → docs aparecen en Web.

## Fase 3B — Paridad Editor touch (sin recortes)

Objetivo: todo `Editor.tsx:1-1439` en móvil, distinta ergonomía, misma capacidad.

* [ ] Filas: CRUD + reorder (botones subir/bajar + handle ≥44px, sin drag 9px) + `CompanyPicker` con search local + `RowMenu`→bottom-sheet (marcar/desmarcar fila, marcar año `markYear/unmarkYear`, mover, eliminar con `deleteTitle/deleteDesc`).
* [ ] Celdas Año×Meses: toggle/recolor P1..Pn Tol, `assignee/note` por fila y celda, `style{bold,italic}`, meses 3 letras `ENE..DIC`, bulk-mark fila/año, paginado por año si 20 años (240 checks/fila).
* [ ] Panel Tabla/Diseño → bottom-sheet con tabs: review_type, escala (máx 20, `INVALID_SCALE/SCALE_TOO_WIDE`), staff 1-10 con `staffShrunk`, personas, paleta, totalMeta, columnas visibles, primary Auto/Custom+6, density, show_summary, header_bg.
* [ ] Historial: undo/redo 50 con etiqueta + coalescencia 2s (port de `stores/history.ts`), botones siempre visibles (no solo Ctrl+Z), preview solo-hoja, validación temprana `missingCompany`, stats/progress, draft `dr-/dc-` con `client_uuid` reales, dirty persistido.
* [ ] Sin `zoom` CSS Chromium-only ni hover `opacity-0`; targets ≥44px.
* [ ] Tests: paridad fila/celda/layout/historial contra fixtures web; undo tras corte no pierde.
* Criterio salida: checklist Editor Web marcado 1:1 en Android offline.

## Fase 3C — Export on-device (paridad completa sin red)

Objetivo: PDF/Excel en el teléfono en avión, idénticos a servidor.

* [ ] Generadores locales desde `Document` canónico: Excel vía `xlsx`, PDF vía `expo-print`/`expo-sharing`. Mismo header (`N.º/Empresa/Responsable/Observaciones`), meses ES/EN, colores Tol, estructura+contenido+config+tema.
* [ ] Filename `exportFilename()` portado `{slug}-{yyyy-mm-dd}.pdf/xlsx`; misma 422 local con `Fila N — nombre sin empresa`.
* [ ] Attachments (§12): foto/firma offline → tabla local → subida diferida (metadata primero, bytes bajo demanda/WiFi, hash SHA256 dedup 10MB) → PDF incluye miniatura.
* [ ] Tests golden: mismo doc creado en Web vs Android exporta igual (tabla + PDF).
* Criterio salida: avión ON → exportar PDF/Excel y ver miniaturas; avión OFF → servidor acepta attachments y re-exporta igual.

## Fase 4 — Servidor local productivo + Web coherente

Objetivo: "encender PC → Foliora disponible en LAN", web muestra lo de Android.

* [ ] Servicio: `systemd foliora.service` (Linux) + script `run_lan.sh` + doc Windows/macOS (autostart). mDNS (`avahi foliora.local`, primario por decisión 1) + fallback última IP + input manual; IP:puerto mostrado en Web/Settings.
* [ ] Seguridad LAN (`§8,§13` checklist, LAN≠segura): autenticación JWT corto (15 min) + refresh (7 días) + `devices` con revoke; autorización por `user_id` en toda query (records/companies/cells/layouts/settings); identificación dispositivo `device_id` + `token_hash`; protección API rate-limit login + `payload layout<=500` + `MAX_UPLOAD_MB=10`; firewall ufw solo LAN (`ufw allow from 192.168.0.0/16 to any port 8000`); validación solicitudes Pydantic + trim + MIME allowlist (`application/pdf,image/*`); manejo seguro archivos: filename sanitizado `exportFilename()` (sin path traversal), hash SHA256 dedup, dir fuera de webroot. Nunca exponer a Internet (bind LAN + doc + `CORS_ORIGINS` cerrado).
* [ ] Web: badge sync real (`GET /sync/status`), filename `{titulo}-{fecha}.pdf/.xlsx`, skeletons + `isError/retry` en `Inicio/Records/Editor` (REPORT.md P0-P1), panel `xl→lg` + drawer. Sin rediseño.
* Criterio salida: PC reinicia → móvil encuentra servidor por hostname; doc Android visible en `Browser→React→FastAPI→SQLite`.

## Fase 5 — Endurecer: conflictos, binarios, PDF, a11y/perf

* [ ] Conflictos v2: merge por celda (conserva ambos `reviewed` true) + UI "tu versión / servidor" solo cuando LWW no basta. Test: edición concurrente misma celda.
* [ ] Attachments: `POST /records/{id}/attachments` (hash SHA256, dedup, límite 10MB, MIME allowlist), sync diferido (metadata primero, bytes bajo demanda/WiFi), PDF incluye miniaturas. Test: foto offline → sube al sincronizar → exporta igual Web/Android.
* [ ] Export coherente servidor + móvil desde `Document` canónico (mismos meses ES/EN, colores Tol, estructura+contenido+configuración+tema `layout{sheet,table}+theme+settings` preservados §12), test golden PDF/Excel para doc creado en Web vs Android (incluye attachments).
* [ ] Deuda REPORT.md que toca sync: `saveAll` honesto ("Revisar y cerrar"), undo agrupado, virtualizar listas, `transform:scale` en vez de `zoom` CSS.
* Criterio salida: matriz `ARCHITECTURE.md §14` en verde: crear/guardar/editar/recuperar/sincronizar/corte/reconectar/recibir/conflicto/exportar.

## Reglas transversales

* TDD: test primero, implementar, `pytest` + `bunx oxlint` + `ruff check` + `jest` (mobile), corregir, re-verificar.
* No mover `frontend/→apps/web` ni `backend/→apps/backend` hasta Fase 3A (evita churn). Cuando se mueva, solo `git mv` + ajuste imports/proxy.
* `docs/INDEX.md` + una página por fase al cerrar cada fase.

## Riesgos

* CORS/firewall LAN → mitigado Fase 0 con env + doc.
* Divergencia IDs undo (`syncSnapshotToServer` recreate) → prohibido recreate en push; solo upsert.
* Rango 20 años x filas crea explosión `cells` → `pull` paginado + `limit`, móvil pagina por año.
* Expectativa iOS → solo Android en v1, modelo lo permite después.
