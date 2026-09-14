# Fase 4 — Servidor LAN + web coherente (cerrada)

## Servidor local
- `scripts/install-service.sh` (servicio de **usuario**, sin sudo): genera
  `~/.config/systemd/user/foliora.service` con rutas reales (sin placeholders),
  `enable --now --user` + `linger` (arranque al boot sin login), `uninstall` y
  `status` incluidos; verifica `/api/health` e imprime la IP LAN.
  `scripts/run_lan.sh` (migrate + uvicorn `0.0.0.0:8000`) sin cambios de conducta.
  La plantilla `foliora.service` de sistema se eliminó (reemplazada).

## Seguridad LAN (§13 checklist)
- JWT corto (15 min) + refresh (7 días, rotado): `POST /api/auth/refresh`;
  `type: access|refresh` (refresh no sirve como access; access viejos sin
  `type` siguen válidos). Web reintenta una vez con refresh antes de salir;
  móvil igual (`onUnauthorized → boolean`).
- Rate-limit login en memoria 10/min por IP+email → 429 `RATE_LIMITED`.
- Pairing 1 uso (QR/deep-link `foliora://pair?host=&token=`):
  `POST /sync/devices/pairing` (auth, expira 10 min) →
  `POST /sync/devices/claim` (público, 1 uso) → `device_id`;
  `GET /sync/devices` + `POST /sync/devices/{id}/revoke`.
- Autorización `user_id` en toda query (existente, intacta);
  `MAX_UPLOAD_MB`/`ATTACH_DIR` en config (se aplica en Fase 5);
  filenames sanitizados `app/export/filenames.py` (port de web/móvil,
  `Content-Disposition: {slug}-{fecha}.pdf/xlsx`, sin traversal ni ids).
- Migración `d25ccdd1cb93` (`pairing_tokens`). `patty.db` en head.

## Web coherente
- `Inicio`: badge sync real desde `GET /sync/status` (`Sincronizado · rev N`,
  con retry; antes siempre verde por defecto).
- Login/Register guardan `refresh_token`; `api.ts` renueva sesión sin fricción.
- Panel Editor: ya era `lg:` + drawer `mPanel` (verificado, sin cambios).
- Filenames descarga web ya eran `{slug}-{fecha}` (Fase 1).

## Móvil
- Login guarda refresh + campo token de pareo + deep-link; contexto renueva
  sesión solo; `syncNow` sin cambios (usa Api con retry).

## Verificación
- `pytest 28/28`, `ruff` limpio, `bun test apps/mobile 21/21`,
  `tsc` web+móvil + `vite build` + `oxlint` verdes.
