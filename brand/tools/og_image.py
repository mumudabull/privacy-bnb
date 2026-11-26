"""Social card for hack.darkswap.app.

A 1200x630 Open Graph / Twitter image: dark base, gold-to-purple gradient,
the DarkSwap mark, and BNB hackathon copy. No venue, price, or privacy claim.
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT.parent / "public"
MARK_PATH = PUBLIC / "brand" / "final-v3-transparent.png"
CARD_NAME = "og-darkswap-bnb-hack.png"

WIDTH = 1200
HEIGHT = 630
BG = (7, 6, 11)
GOLD = np.array([240, 185, 11], np.float32)
PURPLE = np.array([164, 99, 252], np.float32)
TITLE = "DarkSwap × BNB Hackathon"
SUBTITLE = "Private AI agent swaps on BNB Chain"
# Bundled so the card can be regenerated without a system font package.
# License: brand/fonts/OFL.txt (SIL Open Font License 1.1).
FONTS = ROOT / "fonts"
TITLE_FONT = FONTS / "LiberationSans-Bold.ttf"
BODY_FONT = FONTS / "LiberationSans-Regular.ttf"


def gradient(width: int, height: int) -> Image.Image:
    """Dark field with a gold glow on the left and a purple glow on the right."""
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    xn = x / (width - 1)
    yn = y / (height - 1)
    # Gold at the lower left, purple at the upper right.
    mix = np.clip(xn * 0.72 + (1.0 - yn) * 0.28, 0.0, 1.0)
    color = GOLD * (1.0 - mix[..., None]) + PURPLE * mix[..., None]
    base = np.zeros((height, width, 3), np.float32)
    base[:] = BG

    left = np.exp(-((xn - 0.12) ** 2) / 0.08 - ((yn - 0.62) ** 2) / 0.18)
    right = np.exp(-((xn - 0.92) ** 2) / 0.06 - ((yn - 0.18) ** 2) / 0.12)
    # A diagonal ribbon keeps the gold-to-purple shift visible when the card is small.
    ribbon_y = 0.08 + xn * 0.22
    ribbon = np.exp(-((yn - ribbon_y) ** 2) / 0.004) * (0.35 + 0.25 * xn)
    strength = np.clip(left * 0.62 + right * 0.55 + ribbon * 0.85, 0.0, 0.78)
    # Hold the type column darker than the glows.
    type_well = np.exp(-((xn - 0.68) ** 2) / 0.08 - ((yn - 0.52) ** 2) / 0.12)
    strength = strength * (1.0 - 0.55 * type_well)

    rgb = base * (1.0 - strength[..., None]) + color * strength[..., None]
    rgb = np.clip(rgb, 0, 255).astype(np.uint8)
    return Image.fromarray(rgb, "RGB")


def inner_disc_radius(mark: Image.Image) -> int:
    """Radius of the transparent hole inside the ring, in mark pixels."""
    alpha = np.asarray(mark.getchannel("A"))
    cy, cx = alpha.shape[0] // 2, alpha.shape[1] // 2
    row = alpha[cy]
    # Walk right from the center, past the diamond, through the hole, to the ring.
    x = cx
    while x < row.shape[0] and row[x] > 20:
        x += 1
    while x < row.shape[0] and row[x] <= 20:
        x += 1
    return max(1, x - cx - 2)


def paste_mark(card: Image.Image, left: int, top: int, size: int) -> None:
    mark = Image.open(MARK_PATH).convert("RGBA")
    hole = inner_disc_radius(mark)
    scale = size / mark.width
    mark = mark.resize((size, size), Image.Resampling.LANCZOS)
    disc_d = int(hole * 2 * scale)
    disc = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(disc).ellipse(
        ((size - disc_d) // 2, (size - disc_d) // 2, (size + disc_d) // 2, (size + disc_d) // 2),
        fill=(*BG, 255),
    )
    layer = Image.new("RGBA", card.size, (0, 0, 0, 0))
    layer.paste(disc, (left, top), disc)
    layer.paste(mark, (left, top), mark)
    card.paste(Image.alpha_composite(card.convert("RGBA"), layer).convert("RGB"))


def draw_copy(card: Image.Image, text_x: int, text_width: int) -> None:
    draw = ImageDraw.Draw(card)
    title_size = 68
    title_font = ImageFont.truetype(TITLE_FONT, title_size)
    # Two lines stay large enough after Telegram scales the card down.
    title_lines = ["DarkSwap ×", "BNB Hackathon"]
    if " ".join(title_lines) != TITLE:
        raise RuntimeError("title lines must read as the hackathon line")
    while title_size > 40 and any(draw.textlength(line, font=title_font) > text_width for line in title_lines):
        title_size -= 2
        title_font = ImageFont.truetype(TITLE_FONT, title_size)

    body_size = 34
    body_font = ImageFont.truetype(BODY_FONT, body_size)
    while body_size > 24 and draw.textlength(SUBTITLE, font=body_font) > text_width:
        body_size -= 1
        body_font = ImageFont.truetype(BODY_FONT, body_size)

    title_step = title_size + 6
    title_block = title_step * len(title_lines)
    gap = 22
    body_h = body_size + 8
    block = title_block + gap + body_h
    y = (card.height - block) // 2

    for line in title_lines:
        draw.text((text_x, y), line, fill=(246, 244, 239), font=title_font)
        y += title_step
    y += gap
    draw.text((text_x, y), SUBTITLE, fill=(240, 185, 11), font=body_font)


def render(dest: Path) -> None:
    card = gradient(WIDTH, HEIGHT)
    pad = 64
    mark_size = 392
    mark_top = (HEIGHT - mark_size) // 2
    paste_mark(card, pad, mark_top, mark_size)
    text_x = pad + mark_size + 36
    draw_copy(card, text_x, WIDTH - text_x - pad)
    dest.parent.mkdir(parents=True, exist_ok=True)
    card.save(dest, "PNG", optimize=True)
    print("og", dest, card.size)


def main() -> None:
    public_dest = PUBLIC / CARD_NAME
    render(public_dest)
    brand_dest = ROOT / "out" / CARD_NAME
    brand_dest.parent.mkdir(parents=True, exist_ok=True)
    brand_dest.write_bytes(public_dest.read_bytes())
    print("brand", brand_dest)


if __name__ == "__main__":
    main()
