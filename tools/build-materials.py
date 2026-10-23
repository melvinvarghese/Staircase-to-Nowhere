#!/usr/bin/env python3
"""Build the locally hosted 1024px four-material cinematic texture atlas.

Downloads only ambientCG's CC0 source archives into a temporary directory;
only the finished color and derived tangent-normal atlases are retained.
Requires Pillow and NumPy. Run from any directory with Python 3:
    python3 tools/build-materials.py
"""
from __future__ import annotations

import io
import tempfile
import urllib.request
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "materials"
SIZE = 512
ATLAS_SIZE = SIZE * 2
SOURCES = {
    "Carpet012_1K-JPG.zip": "https://ambientcg.com/get?file=Carpet012_1K-JPG.zip",
    "Wood051_1K-JPG.zip": "https://ambientcg.com/get?file=Wood051_1K-JPG.zip",
}


def source_map(archive: Path, suffix: str) -> Image.Image:
    with zipfile.ZipFile(archive) as zf:
        name = next((n for n in zf.namelist() if n.endswith(suffix)), None)
        if name is None:
            raise RuntimeError(f"{archive.name} does not contain *{suffix}")
        with zf.open(name) as stream:
            return Image.open(io.BytesIO(stream.read())).convert("RGB")


def tile_noise(size: int, grid: int, rng: np.random.Generator) -> np.ndarray:
    """Smooth periodic value noise (including matching wrap-around edges)."""
    values = rng.normal(0.0, 1.0, (grid, grid)).astype(np.float32)
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    gx, gy = xx * grid / size, yy * grid / size
    x0, y0 = np.floor(gx).astype(np.int32), np.floor(gy).astype(np.int32)
    fx, fy = gx - x0, gy - y0
    fx = fx * fx * (3.0 - 2.0 * fx)
    fy = fy * fy * (3.0 - 2.0 * fy)
    a = values[y0 % grid, x0 % grid]
    b = values[y0 % grid, (x0 + 1) % grid]
    c = values[(y0 + 1) % grid, x0 % grid]
    d = values[(y0 + 1) % grid, (x0 + 1) % grid]
    return ((a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy)


def wrap_delta(a: np.ndarray, period: float) -> np.ndarray:
    return (a + period * 0.5) % period - period * 0.5


def wallpaper(rng: np.random.Generator) -> np.ndarray:
    """Warm antique paper with an original, repeating olive damask scroll motif."""
    y, x = np.mgrid[0:SIZE, 0:SIZE].astype(np.float32)
    paper = (tile_noise(SIZE, 12, rng) * 2.2 + tile_noise(SIZE, 44, rng) * 1.3
             + rng.normal(0, 0.65, (SIZE, SIZE))).astype(np.float32)
    base = np.empty((SIZE, SIZE, 3), np.float32)
    base[:] = (202, 191, 157)
    base += paper[..., None] * np.array([1.0, 1.0, 0.85], np.float32)

    # Each 128px repeat contains a diamond cartouche, an eight-lobed flower,
    # and mirrored curling stems with paired leaves. Equations wrap at the cell.
    lx, ly = (x % 128) - 64, (y % 128) - 64
    u, v = lx / 64.0, ly / 64.0
    l1 = np.abs(u) + np.abs(v)
    theta = np.arctan2(ly, lx)
    radius = np.sqrt(lx * lx + ly * ly) / 64.0
    cartouche = ((np.abs(l1 - .93) < .022) | (np.abs(l1 - .79) < .014)
                 | (np.abs(l1 - .53) < .012))
    rosette_ring = np.abs(radius - (.31 + .065 * np.cos(8 * theta))) < .026
    rosette_inner = np.abs(radius - (.18 + .026 * np.cos(8 * theta))) < .012
    center = radius < .092
    # Curving, mirrored stems are periodic in y and terminate in almond leaves.
    vine_center = 25 + 10 * np.sin(2 * np.pi * (y % 128) / 128)
    vine_dx = np.abs(wrap_delta(x % 128 - vine_center, 128))
    vine = vine_dx < 1.05
    vine2_center = 103 - 10 * np.sin(2 * np.pi * (y % 128) / 128)
    vine2 = np.abs(wrap_delta(x % 128 - vine2_center, 128)) < 1.0
    leaves = np.zeros((SIZE, SIZE), bool)
    for cx, cy, angle in ((34, 28, .70), (18, 62, -.65), (32, 98, .68),
                          (94, 30, -.68), (110, 66, .63), (96, 100, -.7)):
        dx, dy = wrap_delta(x % 128 - cx, 128), wrap_delta(y % 128 - cy, 128)
        along = dx * np.cos(angle) + dy * np.sin(angle)
        across = -dx * np.sin(angle) + dy * np.cos(angle)
        leaves |= ((along / 10.5) ** 2 + (across / 4.0) ** 2 < 1) & (np.abs(along) > 2)
        # Tiny curved vein etched through each leaf.
    ornamental = cartouche | rosette_ring | rosette_inner | center | vine | vine2 | leaves
    gold_etch = (np.abs(radius - (.39 + .025 * np.cos(8 * theta))) < .006)
    colors = np.empty_like(base)
    colors[:] = (112, 117, 79)       # aged olive ink
    colors[cartouche | gold_etch] = (143, 132, 91)  # subdued brass/olive keyline
    colors[rosette_ring | rosette_inner] = (91, 105, 73)
    colors[center] = (154, 135, 91)
    base[ornamental] = base[ornamental] * .22 + colors[ornamental] * .78

    # Hairline engraved veins and fine paper fibers reinforce printed detail.
    vein_dist = np.abs(np.abs(wrap_delta(x % 128 - vine_center, 128)) - 5.3)
    engraved = leaves & (vein_dist < 1.0)
    base[engraved] = base[engraved] * .68 + np.array([171, 157, 111]) * .32
    return np.clip(base, 0, 255).astype(np.uint8)


def carpet(source: Image.Image, rng: np.random.Generator) -> np.ndarray:
    """Oxblood and antique-gold hotel carpet with woven pile and repeat medallions."""
    src = np.asarray(source.resize((SIZE, SIZE), Image.Resampling.LANCZOS), np.float32)
    gray = src @ np.array([.299, .587, .114], np.float32)
    gray = (gray - gray.mean()) / max(float(gray.std()), 1.0)
    y, x = np.mgrid[0:SIZE, 0:SIZE].astype(np.float32)
    lx, ly = (x % 128) - 64, (y % 128) - 64
    u, v = lx / 64.0, ly / 64.0
    diamond = np.abs(u) + np.abs(v)
    theta = np.arctan2(ly, lx)
    radius = np.sqrt(lx * lx + ly * ly) / 64
    # Repeat a small medallion on the underlying CC0 loop-pile texture.
    borders = ((np.abs(diamond - .98) < .032) | (np.abs(diamond - .86) < .014)
               | (np.abs(diamond - .62) < .018) | (np.abs(diamond - .34) < .012))
    flower = np.abs(radius - (.27 + .055 * np.cos(8 * theta))) < .035
    inner_flower = np.abs(radius - (.13 + .025 * np.cos(8 * theta))) < .018
    center = radius < .065
    small_sprigs = np.zeros((SIZE, SIZE), bool)
    for cx, cy in ((64, 17), (111, 64), (64, 111), (17, 64)):
        dx, dy = wrap_delta(x % 128 - cx, 128), wrap_delta(y % 128 - cy, 128)
        rr = np.sqrt(dx * dx + dy * dy)
        ang = np.arctan2(dy, dx)
        small_sprigs |= (np.abs(rr - (8 + 2 * np.cos(4 * ang))) < 1.7)
    gold = borders | flower | inner_flower | center | small_sprigs
    # Staggered fine warp/weft sparkle, modulated by source pile detail.
    weave = (1.0 + .035 * np.sin(2 * np.pi * x * .5) + .025 * np.sin(2 * np.pi * y * .5))
    field = gray * 5.0 + tile_noise(SIZE, 48, rng) * 1.7 + rng.normal(0, .8, (SIZE, SIZE))
    burgundy = np.empty((SIZE, SIZE, 3), np.float32)
    burgundy[:] = (91, 43, 48)
    burgundy += field[..., None] * np.array([3.5, 2.5, 2.7], np.float32)
    burgundy *= weave[..., None]
    antique_gold = np.empty_like(burgundy)
    antique_gold[:] = (148, 125, 76)
    antique_gold += field[..., None] * np.array([1.0, .9, .55], np.float32)
    # Dusty muted red inset distinguishes motif layers from the wine ground.
    inset = ((np.abs(diamond - .73) < .014) | (np.abs(radius - (.21 + .035 * np.cos(8 * theta))) < .012))
    result = burgundy
    result[gold] = antique_gold[gold]
    result[inset & ~gold] = np.array([116, 58, 58], np.float32) + field[inset & ~gold, None] * np.array([1.8, 1.0, 1.0])
    return np.clip(result, 0, 255).astype(np.uint8)


def walnut(source: Image.Image) -> np.ndarray:
    """Retain source wood grain while warming it into dark hotel walnut."""
    img = ImageEnhance.Color(source.resize((SIZE, SIZE), Image.Resampling.LANCZOS)).enhance(.88)
    arr = np.asarray(img, np.float32)
    # Warm lift and controlled contrast preserve the source's long grain waves.
    arr = (arr - np.array([29, 27, 25], np.float32)) * np.array([1.03, 1.02, .97])
    arr += np.array([20, 13, 8], np.float32)
    # Fine, low-amplitude pores/scratches are seeded and periodic at the tile edge.
    rng = np.random.default_rng(51051)
    n = tile_noise(SIZE, 96, rng) * 1.7 + rng.normal(0, .55, (SIZE, SIZE))
    arr += n[..., None] * np.array([1.1, .85, .65], np.float32)
    return np.clip(arr, 0, 255).astype(np.uint8)


def plaster(rng: np.random.Generator) -> np.ndarray:
    """Nicotine-warm lime plaster with cloudy aging, pores and faint scuffs."""
    low = tile_noise(SIZE, 8, rng)
    mid = tile_noise(SIZE, 30, rng)
    fine = tile_noise(SIZE, 112, rng)
    grain = rng.normal(0, 1.25, (SIZE, SIZE)).astype(np.float32)
    # Subtle tide marks / age shadows from several low-frequency fields.
    age = (low * 6.5 + mid * 2.6 + fine * 1.15 + grain * .7)
    yy, xx = np.mgrid[0:SIZE, 0:SIZE]
    # Pitted limewash and sparse tiny darker pores; random field is periodic by design.
    pits = ((fine + grain * .2) < -1.9)
    surface = np.empty((SIZE, SIZE, 3), np.float32)
    surface[:] = (188, 174, 143)
    surface += age[..., None] * np.array([1.1, 1.0, .82], np.float32)
    surface[pits] *= np.array([.89, .87, .81], np.float32)
    # Soft rubbed/scuffed streaks, represented as a coherent tiled low-noise field.
    rub = np.maximum(0, tile_noise(SIZE, 20, rng) - .55) * 2.0
    surface += rub[..., None] * np.array([1.1, 1.0, .7], np.float32)
    return np.clip(surface, 0, 255).astype(np.uint8)


def gaussian_periodic(height: np.ndarray, radius: int = 3) -> np.ndarray:
    """Small separable wrap-filter used to derive stable, tileable normal vectors."""
    sigma = max(radius / 2, .8)
    offsets = np.arange(-radius, radius + 1)
    kernel = np.exp(-(offsets.astype(np.float32) ** 2) / (2 * sigma * sigma))
    kernel /= kernel.sum()
    out = height.astype(np.float32, copy=False)
    tmp = np.zeros_like(out)
    for i, weight in zip(offsets, kernel):
        tmp += np.roll(out, int(i), axis=1) * weight
    result = np.zeros_like(out)
    for i, weight in zip(offsets, kernel):
        result += np.roll(tmp, int(i), axis=0) * weight
    return result


def normal_tile(rgb: np.ndarray, strength: float) -> np.ndarray:
    luminance = rgb.astype(np.float32) @ np.array([.299, .587, .114], np.float32)
    height = gaussian_periodic(luminance / 255.0)
    dx = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) * .5
    dy = (np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)) * .5
    nx, ny = -dx * strength, -dy * strength
    nz = np.ones_like(nx)
    length = np.sqrt(nx * nx + ny * ny + nz * nz)
    normals = np.stack((nx / length, ny / length, nz / length), axis=-1)
    return np.clip((normals * .5 + .5) * 255, 0, 255).astype(np.uint8)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="hotel-materials-") as temp:
        temp_path = Path(temp)
        archives = {}
        for filename, url in SOURCES.items():
            destination = temp_path / filename
            print(f"Fetching {filename} from ambientCG…")
            for attempt in range(1, 4):
                request = urllib.request.Request(url, headers={"User-Agent": "staircase-cinematic-material-builder/1.0"})
                try:
                    with urllib.request.urlopen(request, timeout=120) as response, destination.open("wb") as output:
                        while block := response.read(1024 * 1024):
                            output.write(block)
                    with zipfile.ZipFile(destination) as archive_check:
                        if not any(name.endswith("_Color.jpg") for name in archive_check.namelist()):
                            raise zipfile.BadZipFile("archive is missing its color map")
                    break
                except (OSError, zipfile.BadZipFile):
                    destination.unlink(missing_ok=True)
                    if attempt == 3:
                        raise
                    print(f"  Invalid or interrupted download; retrying ({attempt}/3).")
            archives[filename] = destination
        carpet_src = source_map(archives["Carpet012_1K-JPG.zip"], "_Color.jpg")
        wood_src = source_map(archives["Wood051_1K-JPG.zip"], "_Color.jpg")

    rng = np.random.default_rng(20261023)
    tiles = {
        "wallpaper": wallpaper(rng),
        "carpet": carpet(carpet_src, rng),
        "wood": walnut(wood_src),
        "plaster": plaster(rng),
    }
    # Fixed quadrants: TL wallpaper, TR carpet, BL wood, BR plaster.
    atlas = np.zeros((ATLAS_SIZE, ATLAS_SIZE, 3), dtype=np.uint8)
    atlas[:SIZE, :SIZE] = tiles["wallpaper"]
    atlas[:SIZE, SIZE:] = tiles["carpet"]
    atlas[SIZE:, :SIZE] = tiles["wood"]
    atlas[SIZE:, SIZE:] = tiles["plaster"]
    normals = np.zeros_like(atlas)
    strengths = {"wallpaper": 5.5, "carpet": 5.3, "wood": 4.2, "plaster": 6.0}
    for name, (y, x) in {"wallpaper": (0, 0), "carpet": (0, SIZE),
                         "wood": (SIZE, 0), "plaster": (SIZE, SIZE)}.items():
        normals[y:y + SIZE, x:x + SIZE] = normal_tile(tiles[name], strengths[name])

    Image.fromarray(atlas, "RGB").save(OUT / "atlas.jpg", "JPEG", quality=88, optimize=True, progressive=True, subsampling=0)
    Image.fromarray(normals, "RGB").save(OUT / "atlas-normal.jpg", "JPEG", quality=88, optimize=True, progressive=True, subsampling=0)
    print(f"Wrote {OUT / 'atlas.jpg'} ({(OUT / 'atlas.jpg').stat().st_size:,} bytes)")
    print(f"Wrote {OUT / 'atlas-normal.jpg'} ({(OUT / 'atlas-normal.jpg').stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
