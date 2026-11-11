"""Generate PWA icons (PNG) with the Python standard library only.

Usage (from frontend/):  python scripts/make_icons.py
Design: plum background, orange circle, white "Z" (Z-Math, matches favicon.svg).
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

PLUM = (0x3B, 0x2D, 0x4F)
ORANGE = (0xF2, 0x6B, 0x3A)
WHITE = (0xFF, 0xFF, 0xFF)
OUT = Path(__file__).resolve().parents[1] / "public" / "icons"
SAMPLES = 3  # anti-aliasing: 3x3 sub-samples per pixel


def in_round_rect(x: float, y: float, x0: float, y0: float, x1: float, y1: float, r: float) -> bool:
    if not (x0 <= x <= x1 and y0 <= y <= y1):
        return False
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def color_at(x: float, y: float, size: int, rounded: bool, scale: float) -> tuple[int, int, int, int]:
    s = size
    c = s / 2
    if rounded and not in_round_rect(x, y, 0, 0, s, s, s * 0.22):
        return (0, 0, 0, 0)
    radius = s * 0.30 * scale
    if (x - c) ** 2 + (y - c) ** 2 > radius**2:
        return (*PLUM, 255)
    # white "Z": top bar, bottom bar and a diagonal band joining them
    half_w, bar_h = radius * 0.5, radius * 0.24
    top, bottom = c - radius * 0.55, c + radius * 0.55
    top_bar = c - half_w <= x <= c + half_w and top <= y <= top + bar_h
    bottom_bar = c - half_w <= x <= c + half_w and bottom - bar_h <= y <= bottom
    # diagonal band (parallelogram) from the top-right to the bottom-left corner
    width = bar_h * 1.35
    y0, y1 = top + bar_h / 2, bottom - bar_h / 2
    progress = (y - y0) / (y1 - y0)
    x_mid = (c + half_w - width / 2) + progress * ((c - half_w + width / 2) - (c + half_w - width / 2))
    diagonal = top <= y <= bottom and abs(x - x_mid) <= width / 2
    return (*WHITE, 255) if (top_bar or bottom_bar or diagonal) else (*ORANGE, 255)


def render(size: int, rounded: bool, scale: float = 1.0) -> bytes:
    rows = bytearray()
    step = 1 / SAMPLES
    for py in range(size):
        rows.append(0)  # PNG filter type 0
        for px in range(size):
            acc = [0, 0, 0, 0]
            for sy in range(SAMPLES):
                for sx in range(SAMPLES):
                    r, g, b, a = color_at(px + (sx + 0.5) * step, py + (sy + 0.5) * step, size, rounded, scale)
                    acc[0] += r * a
                    acc[1] += g * a
                    acc[2] += b * a
                    acc[3] += a
            alpha = acc[3]
            if alpha:
                rows += bytes((acc[0] // alpha, acc[1] // alpha, acc[2] // alpha, alpha // SAMPLES**2))
            else:
                rows += b"\x00\x00\x00\x00"
    return bytes(rows)


def png(size: int, raw: bytes) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data))

    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    targets = {
        "icon-192.png": (192, True, 1.0),
        "icon-512.png": (512, True, 1.0),
        "icon-maskable-512.png": (512, False, 0.85),  # full-bleed, content inside safe zone
        "apple-touch-icon.png": (180, False, 1.0),  # iOS applies its own rounding
    }
    for name, (size, rounded, scale) in targets.items():
        (OUT / name).write_bytes(png(size, render(size, rounded, scale)))
        print("wrote", OUT / name)


if __name__ == "__main__":
    main()
