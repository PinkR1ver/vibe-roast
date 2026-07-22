"""Split vibe-badges-v6-board.png into per-profile symbolic badge PNGs."""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CONFIG = Path(__file__).resolve().parent / "profiles.json"
OUT_SIZE = 256


def main() -> None:
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    board = config["badgeBoard"]
    profiles = [p for b in config["boards"] for p in b["profiles"]]
    cols = board["cols"]

    if len(profiles) != cols:
        raise SystemExit(f"profile count {len(profiles)} != badge columns {cols}")

    im = Image.open(ROOT / board["file"]).convert("RGBA")
    w, h = im.size
    col_w = w // cols

    for i, profile in enumerate(profiles):
        x0 = i * col_w
        x1 = (i + 1) * col_w if i < cols - 1 else w
        col = im.crop((x0, 0, x1, h))

        # Full badge card (vertical), pad to square — keeps symbol + base icon
        y0 = int(h * 0.06)
        y1 = int(h * 0.90)
        badge = col.crop((0, y0, col.width, y1))
        side = max(badge.width, badge.height)
        square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        ox = (side - badge.width) // 2
        oy = (side - badge.height) // 2
        square.paste(badge, (ox, oy))
        badge = square.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)

        out_dir = ROOT / "badges" / profile["folder"]
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"{profile['name']}-badge.png"
        badge.save(out_path, optimize=True)
        print(f"wrote {out_path} ({OUT_SIZE}x{OUT_SIZE}) symbol badge")


if __name__ == "__main__":
    main()
