"""DarkSwap mark geometry and the purple-to-gold gradient.

Paths are repo-relative. The ring measurements match darkswap.app/brand/icon.png.
"""

import math
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source"
OUT = ROOT / "out"

PURPLE = np.array([0xA4, 0x63, 0xFC], float)
GOLD = np.array([0xF0, 0xB9, 0x0B], float)
BG = np.array([0x07, 0x06, 0x0B], float)


def srgb2lin(c):
    c = c / 255
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin2srgb(c):
    c = np.clip(c, 0, 1)
    return 255 * np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


M1 = np.array(
    [
        [0.4122214708, 0.5363325363, 0.0514459929],
        [0.2119034982, 0.6806995451, 0.1073969566],
        [0.0883024619, 0.2817188376, 0.6299787005],
    ]
)
M2 = np.array(
    [
        [0.2104542553, 0.7936177850, -0.0040720468],
        [1.9779984951, -2.4285922050, 0.4505937099],
        [0.0259040371, 0.7827717662, -0.8086757660],
    ]
)


def to_ok(rgb):
    return np.cbrt(srgb2lin(rgb) @ M1.T) @ M2.T


def from_ok(lab):
    return lin2srgb(((lab @ np.linalg.inv(M2).T) ** 3) @ np.linalg.inv(M1).T)


P_OK, G_OK = to_ok(PURPLE), to_ok(GOLD)


def _lch(lab):
    return np.array([lab[0], math.hypot(lab[1], lab[2]), math.atan2(lab[2], lab[1])])


P_L, G_L = _lch(P_OK), _lch(G_OK)
_DH = (G_L[2] - P_L[2] + math.pi) % (2 * math.pi) - math.pi


def grad(t):
    """t array 0..1 -> rgb. Halfway between OKLab and OKLCh so the middle stays vivid."""
    t = np.clip(t, 0, 1)
    lightness = P_L[0] + (G_L[0] - P_L[0]) * t
    chroma = P_L[1] + (G_L[1] - P_L[1]) * t
    hue = P_L[2] + _DH * t
    lch = np.stack([lightness, chroma * np.cos(hue), chroma * np.sin(hue)], -1)
    lab = P_OK * (1 - t[..., None]) + G_OK * t[..., None]
    return from_ok(0.5 * lch + 0.5 * lab)


BNB = [
    [(38.73, 53.2), (63.32, 28.62), (87.92, 53.22), (102.22, 38.91), (63.32, 0), (24.42, 38.9)],
    [(0, 63.31), (14.3, 49), (28.61, 63.31), (14.3, 77.61)],
    [(38.73, 73.42), (63.32, 98.01), (87.92, 73.41), (102.23, 87.70), (63.33, 126.61), (24.42, 87.73)],
    [(97.91, 63.31), (112.21, 49), (126.52, 63.31), (112.21, 77.61)],
    [(77.83, 63.3), (63.32, 48.78), (48.81, 63.28), (63.32, 77.78)],
]
