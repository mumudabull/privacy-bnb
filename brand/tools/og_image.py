"""1200x630 social card with the final-v3 mark on the site background."""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))

from logo import BG, OUT


def main() -> None:
    card = Image.new("RGB", (1200, 630), tuple(int(v) for v in BG))
    mark = Image.open(OUT / "final-v3-512.png").convert("RGBA")
    mark.thumbnail((360, 360), Image.LANCZOS)
    card.paste(mark, (96, (630 - mark.height) // 2), mark)
    draw = ImageDraw.Draw(card)
    font = ImageFont.load_default(52)
    small = ImageFont.load_default(28)
    draw.text((500, 230), "DarkSwap on BNB", fill=(246, 244, 239), font=font)
    draw.text((500, 310), "One deep shielded pool.", fill=(240, 185, 11), font=small)
    card.save(OUT / "og.png")
    print("og", OUT / "og.png")


if __name__ == "__main__":
    main()
