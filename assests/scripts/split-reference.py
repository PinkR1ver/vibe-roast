"""Split v5 reference boards into per-profile mascot PNGs and badge crops."""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CONFIG = Path(__file__).resolve().parent / "profiles.json"


def split_board(board_path: Path, cols: int, profiles: list[dict]) -> None:
    im = Image.open(board_path).convert("RGBA")
    w, h = im.size
    col_w = w // cols

    for i, profile in enumerate(profiles):
        x0 = i * col_w
        x1 = (i + 1) * col_w if i < cols - 1 else w
        crop = im.crop((x0, 0, x1, h))

        char_dir = ROOT / "characters" / profile["folder"]
        char_dir.mkdir(parents=True, exist_ok=True)

        mascot_name = f"{profile['name']}-mascot.png"
        mascot_path = char_dir / mascot_name
        crop.save(mascot_path, optimize=True)
        print(f"wrote {mascot_path} ({crop.size[0]}x{crop.size[1]})")


def main() -> None:
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    for board in config["boards"]:
        board_path = ROOT / board["file"]
        split_board(board_path, board["cols"], board["profiles"])


if __name__ == "__main__":
    main()
