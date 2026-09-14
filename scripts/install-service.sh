#!/usr/bin/env bash
# Foliora LAN — instalador del servicio de USUARIO (sin sudo).
#
# Uso:
#   ./scripts/install-service.sh            instala + activa + verifica
#   ./scripts/install-service.sh status     estado del servicio
#   ./scripts/install-service.sh uninstall  quita todo limpio (conserva datos)
#
# El servicio levanta apps/backend en modo LAN (HOST=0.0.0.0) y arranca
# solo al encender el PC (systemd --user + linger, sin login).
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$REPO_DIR/apps/backend"
UNIT_DIR="$HOME/.config/systemd/user"
UNIT_FILE="$UNIT_DIR/foliora.service"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"

log() { printf 'foliora: %s\n' "$*"; }
die() { printf 'foliora: ERROR: %s\n' "$*" >&2; exit 1; }

need_systemd() {
  command -v systemctl >/dev/null 2>&1 || die "systemctl no encontrado (se requiere systemd)"
}

pre_checks() {
  [ -x "$BACKEND_DIR/.venv/bin/uvicorn" ] || die "falta $BACKEND_DIR/.venv/bin/uvicorn"
  [ -x "$BACKEND_DIR/.venv/bin/alembic" ] || die "falta $BACKEND_DIR/.venv/bin/alembic"
  [ -x "$REPO_DIR/scripts/run_lan.sh" ] || die "falta $REPO_DIR/scripts/run_lan.sh"
}

write_unit() {
  mkdir -p "$UNIT_DIR"
  cat > "$UNIT_FILE" <<EOF
[Unit]
Description=Foliora local API (LAN)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$BACKEND_DIR
Environment=HOST=$HOST
Environment=PORT=$PORT
EnvironmentFile=-$BACKEND_DIR/.env
ExecStart=$REPO_DIR/scripts/run_lan.sh
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
EOF
  log "unit escrita en $UNIT_FILE"
}

enable_linger() {
  if loginctl show-user "$USER" 2>/dev/null | grep -q "Linger=yes"; then
    log "linger ya activo para $USER"
    return 0
  fi
  if loginctl enable-linger "$USER" 2>/dev/null; then
    log "linger activado (arranque sin login)"
  else
    log "AVISO: no se pudo activar linger sin privilegios."
    log "Ejecuta una vez: sudo loginctl enable-linger $USER"
  fi
}

maybe_firewall() {
  if ! command -v ufw >/dev/null 2>&1; then
    return 0
  fi
  local subnet
  subnet="$(lan_subnet || true)"
  [ -n "${subnet:-}" ] || subnet="192.168.0.0/16"
  if sudo ufw status 2>/dev/null | grep -qF "$subnet"; then
    log "firewall ya permite $subnet (puerto $PORT)"
  else
    printf 'foliora: permitir %s -> puerto %s en el firewall (ufw, pide sudo)? [y/N] ' "$subnet" "$PORT"
    read -r ans || ans=""
    if [ "$ans" = "y" ] || [ "$ans" = "Y" ]; then
      sudo ufw allow from "$subnet" to any port "$PORT"
      sudo ufw status 2>/dev/null | grep -qF "$subnet" \
        || die "la regla ufw no quedo aplicada; revisa: sudo ufw status"
    else
      log "firewall sin cambios (el puerto $PORT debe ser alcanzable en LAN)"
    fi
  fi
  if ! systemctl is-active --quiet avahi-daemon 2>/dev/null; then
    log "AVISO: avahi-daemon inactivo; http://foliora.local:8000 puede no resolver."
    log "Usa la IP LAN o instala: sudo apt install avahi-daemon"
  fi
}

# Detecta la IP LAN y su subred, excluyendo loopback, docker y VPN/tuneles.
# Imprime "IP SUBRED", ej: "192.168.101.2 192.168.101.0/24".
lan_net() {
  local cidr ip prefix net
  cidr="$(ip -o -f inet addr show scope global 2>/dev/null \
    | awk '$2 !~ /^(lo|docker[0-9]*|br-[0-9a-f]+|proton[0-9]*|wg[0-9]*|tun[0-9]*)$/ {print $4}' \
    | grep -E '^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)' \
    | head -n 1)"
  [ -n "${cidr:-}" ] || return 1
  ip="${cidr%%/*}"
  prefix="${cidr##*/}"
  case "$prefix" in
    8)  net="$(echo "$ip" | cut -d. -f1).0.0.0/8" ;;
    16) net="$(echo "$ip" | cut -d. -f1-2).0.0/16" ;;
    24) net="$(echo "$ip" | cut -d. -f1-3).0/24" ;;
    *)  return 1 ;;
  esac
  printf '%s %s\n' "$ip" "$net"
}

lan_ip() {
  lan_net 2>/dev/null | awk '{print $1}'
}

lan_subnet() {
  lan_net 2>/dev/null | awk '{print $2}'
}

wait_health() {
  local i
  for i in $(seq 1 30); do
    if curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

do_install() {
  need_systemd
  pre_checks
  write_unit
  systemctl --user daemon-reload
  systemctl --user enable --now foliora.service
  enable_linger
  maybe_firewall
  if wait_health; then
    log "OK: http://127.0.0.1:$PORT/api/health"
    log "En el celular (navegador) usa: http://$(lan_ip):$PORT  o  http://foliora.local:$PORT"
  else
    die "el servicio no respondio; revisa: systemctl --user status foliora.service"
  fi
}

do_status() {
  need_systemd
  if [ ! -f "$UNIT_FILE" ]; then
    log "no instalado ($UNIT_FILE no existe)"
    return 1
  fi
  systemctl --user status foliora.service --no-pager || true
}

do_uninstall() {
  need_systemd
  if [ -f "$UNIT_FILE" ]; then
    systemctl --user disable --now foliora.service 2>/dev/null || true
    rm -f "$UNIT_FILE"
    systemctl --user daemon-reload
    log "servicio eliminado (datos intactos)"
  else
    log "nada que quitar (no instalado)"
  fi
}

case "${1:-install}" in
  install) do_install ;;
  status) do_status ;;
  uninstall) do_uninstall ;;
  *) die "uso: $0 [install|status|uninstall]" ;;
esac
