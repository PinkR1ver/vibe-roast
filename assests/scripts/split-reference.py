"""Split vibe-mascots-v4-reference.png into per-character raster slices."""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / "source" / "references" / "vibe-mascots-v4-reference.png"

OUT = [
    ("01-builder", "builder-mascot.png"),
    ("02-debugger", "debugger-mascot.png"),
    ("03-architect", "architect-mascot.png"),
]


def main() -> None:
    im = Image.open(REF).convert("RGBA")
    w, h = im.size
    col_w = w // 3

    for i, (folder, filename) in enumerate(OUT):
        x0 = i * col_w
        x1 = (i + 1) * col_w if i < 2 else w
        crop = im.crop((x0, 0, x1, h))
        out = ROOT / "characters" / folder / filename
        out.parent.mkdir(parents=True, exist_ok=True)
        crop.save(out, optimize=True)
        print(f"wrote {out} ({crop.size[0]}x{crop.size[1]})")


if __name__ == "__main__":
    main()
