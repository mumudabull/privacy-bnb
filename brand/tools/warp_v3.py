"""3.6s warp: original purple bowtie morphs into final-v3."""

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))

from logo import GOLD, OUT, PURPLE
from vec import BOW_C, CX, CY, V, over

SIZE = 640
FPS = 30
DURATION = 3.6
FRAMES = int(DURATION * FPS)
WARP_START = 0.5
WARP_END = 2.6


def smoothstep(start, end, value):
    blend = np.clip((value - start) / (end - start), 0, 1)
    return blend * blend * (3 - 2 * blend)


def ease(value):
    value = min(max(value, 0), 1)
    return value * value * value * (value * (6 * value - 15) + 10)


def main() -> None:
    frames = OUT / "warp-frames-v3"
    frames.mkdir(parents=True, exist_ok=True)
    field = V(SIZE)
    purple = np.array(PURPLE)
    for index in range(FRAMES):
        seconds = index / FPS
        progress = ease((seconds - WARP_START) / (WARP_END - WARP_START))
        rotation = 2 * math.pi * progress
        front = -0.3 + 1.6 * progress
        sweep = smoothstep(front - 0.3, front, field.g)[..., None]
        color = field.orig_col * (1 - (1 - sweep)) + field.new_col * (1 - sweep)
        # The expression above matches the supplied script: m = 1 - ss(front).
        mix = (1 - smoothstep(front - 0.3, front, field.g))[..., None]
        color = field.orig_col * (1 - mix) + field.new_col * mix
        layers = [(color, field.ring(rotation))]
        bow_progress = float(smoothstep(0.0, 0.55, progress))
        mark_progress = float(smoothstep(0.4, 1.0, progress))
        if bow_progress < 1:
            center = (
                BOW_C[0] + (CX - BOW_C[0]) * bow_progress,
                BOW_C[1] + (CY - BOW_C[1]) * bow_progress,
            )
            bow_color = np.broadcast_to(purple, (SIZE, SIZE, 3)) * (1 - bow_progress) + field.new_col * bow_progress
            layers.append(
                (
                    bow_color,
                    field.bow(scale=1 - bow_progress, rot=math.pi * 0.75 * bow_progress, center=center),
                )
            )
        if mark_progress > 0:
            scale = mark_progress * (1 + 0.08 * math.sin(math.pi * mark_progress))
            layers.append((field.new_col, field.bnb(scale=scale, rot=-math.pi * 0.75 * (1 - mark_progress))))
        Image.fromarray(over(layers, SIZE)).save(frames / f"f{index:03d}.png")
        if index % 15 == 0:
            print("frame", index, flush=True)
    print("frames", FRAMES)


if __name__ == "__main__":
    main()
