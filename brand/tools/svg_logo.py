"""Clean SVG of final-v3 using the same ring cuts and BNB polygons."""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from logo import BNB, OUT
from vec import BNB_W, CX, CY, GAP_BL, GAP_TR, R2, R_IN, R_OUT


def visible(x, y):
    radius = math.hypot(x, y)
    if radius >= R_OUT or radius <= R_IN:
        return False
    perp = (x + y) / R2
    along = (x - y) / R2
    low, high = GAP_TR if along > 0 else GAP_BL
    return not (low <= perp <= high)


def segment(samples=720):
    """Two ring pieces. Visibility is sampled at mid-radius, then drawn on both edges."""
    mid = (R_IN + R_OUT) / 2
    shown = []
    for index in range(samples):
        theta = 2 * math.pi * index / samples
        shown.append(visible(mid * math.cos(theta), mid * math.sin(theta)))
    runs = []
    current = []
    for index, is_shown in enumerate(shown):
        if is_shown:
            current.append(index)
        elif current:
            runs.append(current)
            current = []
    if current:
        if runs and runs[0][0] == 0:
            runs[0] = current + runs[0]
        else:
            runs.append(current)
    outer = []
    inner = []
    for index in range(samples):
        theta = 2 * math.pi * index / samples
        outer.append((CX + R_OUT * math.cos(theta), CY + R_OUT * math.sin(theta)))
        inner.append((CX + R_IN * math.cos(theta), CY + R_IN * math.sin(theta)))
    paths = []
    for run in runs:
        outer_pts = [outer[i] for i in run]
        inner_pts = [inner[i] for i in reversed(run)]
        commands = [f"M {outer_pts[0][0]:.2f} {outer_pts[0][1]:.2f}"]
        commands.extend(f"L {x:.2f} {y:.2f}" for x, y in outer_pts[1:])
        commands.extend(f"L {x:.2f} {y:.2f}" for x, y in inner_pts)
        commands.append("Z")
        paths.append(" ".join(commands))
    return paths


def bnb_paths():
    scale = BNB_W / 126.52
    paths = []
    for polygon in BNB:
        points = []
        for x, y in polygon:
            points.append((CX + (x - 63.26) * scale, CY + (y - 63.3) * scale))
        commands = [f"M {points[0][0]:.2f} {points[0][1]:.2f}"]
        commands.extend(f"L {x:.2f} {y:.2f}" for x, y in points[1:])
        commands.append("Z")
        paths.append(" ".join(commands))
    return paths


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    ring = "\n    ".join(f'<path d="{path}"/>' for path in segment())
    mark = "\n    ".join(f'<path d="{path}"/>' for path in bnb_paths())
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="DarkSwap on BNB">
  <defs>
    <linearGradient id="darkswap-bnb" x1="0" y1="0" x2="1024" y2="1024" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#A463FC"/>
      <stop offset="1" stop-color="#F0B90B"/>
    </linearGradient>
  </defs>
  <g fill="url(#darkswap-bnb)">
    {ring}
    {mark}
  </g>
</svg>
"""
    (OUT / "logo.svg").write_text(svg)
    print("svg", OUT / "logo.svg")


if __name__ == "__main__":
    main()
