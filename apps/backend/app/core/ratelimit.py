"""Rate-limit en memoria (ventana deslizante por clave). Suficiente para LAN
de un hogar; con un solo proceso no necesita store externo."""

import time

_MAX_KEYS = 10_000

_attempts: dict[str, list[float]] = {}


def _evict_if_needed() -> None:
    if len(_attempts) >= _MAX_KEYS:
        # Eviccion simple: descarta la mitad mas antigua por ultimo intento.
        ordered = sorted(_attempts.items(), key=lambda kv: kv[1][-1] if kv[1] else 0)
        for key, _ in ordered[: _MAX_KEYS // 2]:
            _attempts.pop(key, None)


def check(key: str, max_attempts: int, window_seconds: int) -> bool:
    """True si puede pasar (y registra el intento). False si excede."""
    now = time.monotonic()
    recent = [t for t in _attempts.get(key, []) if now - t < window_seconds]
    if len(recent) >= max_attempts:
        _attempts[key] = recent
        return False
    recent.append(now)
    _evict_if_needed()
    _attempts[key] = recent
    return True


def reset() -> None:
    _attempts.clear()
