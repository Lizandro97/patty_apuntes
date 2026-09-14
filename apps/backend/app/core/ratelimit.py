"""Rate-limit en memoria (ventana deslizante por clave). Suficiente para LAN
de un hogar; con un solo proceso no necesita store externo."""

import time

_attempts: dict[str, list[float]] = {}


def check(key: str, max_attempts: int, window_seconds: int) -> bool:
    """True si puede pasar (y registra el intento). False si excede."""
    now = time.monotonic()
    recent = [t for t in _attempts.get(key, []) if now - t < window_seconds]
    if len(recent) >= max_attempts:
        _attempts[key] = recent
        return False
    recent.append(now)
    _attempts[key] = recent
    return True


def reset() -> None:
    _attempts.clear()
