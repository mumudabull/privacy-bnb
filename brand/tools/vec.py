"""Vector reconstruction of the split ring and the BNB mark."""

import math

import numpy as np
from PIL import Image, ImageDraw

from logo import BG, BNB, GOLD, PURPLE, from_ok, grad, to_ok

R2 = math.sqrt(2)
CX, CY = 511.0, 511.5
R_IN, R_OUT = 284.0, 460.5
GAP_TR = (-88.0, -16.0)
GAP_BL = (-8.5, 64.5)
BOW = [[(374, 427), (374, 630), (514.5, 528.5)], [(655, 427), (655, 630), (514.5, 528.5)]]
BOW_C = (514.5, 528.5)
BNB_W = 281.0
ORIG_TL = np.array([0xC6, 0x88, 0xFB], float)
ORIG_BR = np.array([0x8F, 0x52, 0xFD], float)


class V:
    def __init__(self, size):
        self.S = size
        self.k = size / 1024
        yy, xx = np.mgrid[:size, :size].astype(float)
        self.x = (xx + 0.5) / self.k
        self.y = (yy + 0.5) / self.k
        radius = R_OUT
        diagonal = ((self.x - CX) + (self.y - CY)) / R2
        self.g = (diagonal + radius) / (2 * radius)
        blend = np.clip(self.g, 0, 1)[..., None]
        origin_a, origin_b = to_ok(ORIG_TL), to_ok(ORIG_BR)
        self.orig_col = from_ok(origin_a * (1 - blend) + origin_b * blend)
        self.new_col = grad(self.g)

    def ring(self, rot=0.0):
        cosine, sine = math.cos(-rot), math.sin(-rot)
        dx = self.x - CX
        dy = self.y - CY
        x = dx * cosine - dy * sine
        y = dx * sine + dy * cosine
        radius = np.hypot(x, y)
        signed = np.minimum(R_OUT - radius, radius - R_IN)
        perp = (x + y) / R2
        along = (x - y) / R2
        low = np.where(along > 0, GAP_TR[0], GAP_BL[0])
        high = np.where(along > 0, GAP_TR[1], GAP_BL[1])
        gap = np.maximum(low - perp, perp - high)
        signed = np.minimum(signed, gap)
        return np.clip(signed * self.k + 0.5, 0, 1)

    def polys(self, polygons, samples=4):
        size = self.S
        canvas = Image.new("L", (size * samples, size * samples), 0)
        draw = ImageDraw.Draw(canvas)
        for polygon in polygons:
            draw.polygon([(x * self.k * samples, y * self.k * samples) for x, y in polygon], fill=255)
        return np.asarray(canvas.resize((size, size), Image.LANCZOS)).astype(float) / 255

    def bow(self, scale=1.0, rot=0.0, center=BOW_C):
        cosine, sine = math.cos(rot), math.sin(rot)
        transformed = []
        for polygon in BOW:
            points = []
            for x, y in polygon:
                local_x = (x - BOW_C[0]) * scale
                local_y = (y - BOW_C[1]) * scale
                points.append((center[0] + local_x * cosine - local_y * sine, center[1] + local_x * sine + local_y * cosine))
            transformed.append(points)
        return self.polys(transformed)

    def bnb(self, scale=1.0, rot=0.0, center=(CX, CY)):
        mark_scale = BNB_W / 126.52 * scale
        cosine, sine = math.cos(rot), math.sin(rot)
        transformed = []
        for polygon in BNB:
            points = []
            for x, y in polygon:
                local_x = (x - 63.26) * mark_scale
                local_y = (y - 63.3) * mark_scale
                points.append((center[0] + local_x * cosine - local_y * sine, center[1] + local_x * sine + local_y * cosine))
            transformed.append(points)
        return self.polys(transformed)


def over(layers, size, bg=BG):
    color = np.broadcast_to(bg, (size, size, 3)).astype(float).copy()
    for rgb, alpha in layers:
        coverage = np.clip(alpha, 0, 1)[..., None]
        color = rgb * coverage + color * (1 - coverage)
    return np.clip(np.round(color), 0, 255).astype(np.uint8)


def rgba(layers, size):
    color = np.zeros((size, size, 3))
    alpha = np.zeros((size, size))
    for rgb, coverage in layers:
        coverage = np.clip(coverage, 0, 1)
        color = rgb * coverage[..., None] + color * (1 - coverage[..., None])
        alpha = coverage + alpha * (1 - coverage)
    unpremultiplied = np.where(alpha[..., None] > 1e-4, color / np.maximum(alpha[..., None], 1e-4), 0)
    return np.dstack([np.clip(np.round(unpremultiplied), 0, 255), np.round(alpha * 255)]).astype(np.uint8)
