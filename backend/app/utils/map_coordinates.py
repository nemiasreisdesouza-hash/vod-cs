"""Map metadata: playable bounds per map + game->map coordinate helpers.

CS2 demo coordinates are world units. Each map overview defines an affine
transform (pos_x/pos_y/scale, like the official radar config) to convert
world (x, y) into 0..1024 overview space for heatmaps.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class MapConfig:
    name: str
    game: str  # cs2 | crossfire
    pos_x: float
    pos_y: float
    scale: float


MAPS: dict[str, MapConfig] = {
    # Official-ish CS2 radar values (overview space 1024px)
    "mirage": MapConfig("mirage", "cs2", -3230.0, 1713.0, 5.0),
    "inferno": MapConfig("inferno", "cs2", -2087.0, 3870.0, 4.9),
    "dust2": MapConfig("dust2", "cs2", -2476.0, 3239.0, 4.4),
    "nuke": MapConfig("nuke", "cs2", -3453.0, 2887.0, 7.0),
    "overpass": MapConfig("overpass", "cs2", -4831.0, 1781.0, 5.2),
    "ancient": MapConfig("ancient", "cs2", -2953.0, 2164.0, 5.0),
    "anubis": MapConfig("anubis", "cs2", -2796.0, 3328.0, 5.2),
    "vertigo": MapConfig("vertigo", "cs2", -3168.0, 1762.0, 4.0),
    # CrossFire maps use normalized 0..1 VOD-minimap space (scale=1)
    "black widow": MapConfig("black widow", "crossfire", 0.0, 1.0, 1.0),
    "port": MapConfig("port", "crossfire", 0.0, 1.0, 1.0),
    "sub base": MapConfig("sub base", "crossfire", 0.0, 1.0, 1.0),
    "eagle eye": MapConfig("eagle eye", "crossfire", 0.0, 1.0, 1.0),
    "mexico": MapConfig("mexico", "crossfire", 0.0, 1.0, 1.0),
}

CS2_MAPS = [m for m in MAPS.values() if m.game == "cs2"]
CROSSFIRE_MAPS = [m for m in MAPS.values() if m.game == "crossfire"]


def world_to_overview(map_name: str, x: float, y: float, size: int = 1024) -> tuple[float, float]:
    """Convert CS2 world coords to 0..size overview pixels."""
    cfg = MAPS.get(map_name.lower(), MapConfig(map_name, "cs2", -3000.0, 3000.0, 5.0))
    if cfg.game == "crossfire":
        return (x * size, y * size)
    ox = (x - cfg.pos_x) / cfg.scale
    oy = (cfg.pos_y - y) / cfg.scale
    # Overview space is 1024-based; scale to requested size
    return (ox / 1024 * size, oy / 1024 * size)


def overview_to_normalized(map_name: str, x: float, y: float, size: int = 1024) -> tuple[float, float]:
    ox, oy = world_to_overview(map_name, x, y, size)
    return (min(max(ox / size, 0.0), 1.0), min(max(oy / size, 0.0), 1.0))
