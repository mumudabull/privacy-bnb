"""Social cards with the final-v3 mark on the site background.

Writes the 1200x630 card plus the HackQuest sizes, 1280x720 and 500x300.
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))

from logo import BG, OUT, ROOT

TITLE = "DarkSwap on BNB"
TAGLINE = "Say the swap. A guarded agent built for BNB Chain's shielded pool."
PUBLIC = ROOT.parent / "public"


def wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for word in text.split():
        trial = word if not current else f"{current} {word}"
        if draw.textlength(trial, font=font) <= width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def render(
    size: tuple[int, int],
    mark_max: int,
    title_size: int,
    body_size: int,
    pad: int,
    gap: int,
    dest: Path,
) -> None:
    width, height = size
    card = Image.new("RGB", size, tuple(int(v) for v in BG))
    mark = Image.open(OUT / "final-v3-512.png").convert("RGBA")
    mark.thumbnail((mark_max, mark_max), Image.LANCZOS)
    card.paste(mark, (pad, (height - mark.height) // 2), mark)
    draw = ImageDraw.Draw(card)
    title_font = ImageFont.load_default(title_size)
    body_font = ImageFont.load_default(body_size)
    text_x = pad + mark.width + gap
    text_width = width - text_x - pad
    title_lines = wrap(draw, TITLE, title_font, text_width)
    body_lines = wrap(draw, TAGLINE, body_font, text_width)
    title_step = title_size + 8
    body_step = body_size + 6
    block = title_step * len(title_lines) + 16 + body_step * len(body_lines)
    y = (height - block) // 2
    for line in title_lines:
        draw.text((text_x, y), line, fill=(246, 244, 239), font=title_font)
        y += title_step
    y += 16
    for line in body_lines:
        draw.text((text_x, y), line, fill=(240, 185, 11), font=body_font)
        y += body_step
    dest.parent.mkdir(parents=True, exist_ok=True)
    card.save(dest)
    print("og", dest, card.size)


def main() -> None:
    render((1200, 630), 360, 52, 28, 72, 48, OUT / "og.png")
    render((1280, 720), 400, 54, 28, 72, 48, OUT / "og-1280x720.png")
    render((500, 300), 168, 22, 13, 20, 16, OUT / "og-500x300.png")
    PUBLIC.mkdir(parents=True, exist_ok=True)
    for name in ("og-1280x720.png", "og-500x300.png"):
        target = PUBLIC / name
        target.write_bytes((OUT / name).read_bytes())
        print("public", target)


if __name__ == "__main__":
    main()
