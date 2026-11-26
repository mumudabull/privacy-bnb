"""Render final-v3: split ring plus BNB mark, one purple-to-gold gradient."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from PIL import Image

from logo import OUT
from vec import CY, CX, V, over, rgba

SIZE = 1024


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    field = V(SIZE)
    layers = [(field.new_col, field.ring()), (field.new_col, field.bnb())]
    image = Image.fromarray(over(layers, SIZE))
    image.save(OUT / "final-v3.png")
    Image.fromarray(rgba(layers, SIZE), "RGBA").save(OUT / "final-v3-transparent.png")
    image.resize((512, 512), Image.LANCZOS).save(OUT / "final-v3-512.png")
    image.resize((180, 180), Image.LANCZOS).save(OUT / "apple-touch-icon.png")
    image.resize((64, 64), Image.LANCZOS).save(OUT / "final-v3-64.png")
    image.resize((32, 32), Image.LANCZOS).save(OUT / "final-v3-32.png")
    image.resize((64, 64), Image.LANCZOS).save(
        OUT / "favicon.ico",
        format="ICO",
        sizes=[(32, 32), (64, 64)],
    )
    pixels = image.load()
    # Pillow's load is slow to index via numpy; use the array.
    import numpy as np

    raw = np.asarray(image)

    def hex_at(x, y):
        return "#%02X%02X%02X" % tuple(int(v) for v in raw[int(y), int(x)])

    print("mark center", hex_at(CX, CY), "bg", hex_at(3, 3))


if __name__ == "__main__":
    main()
