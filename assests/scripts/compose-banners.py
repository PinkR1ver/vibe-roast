"""Compose banners from existing profile mascot PNGs only — no extra characters."""
import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
CONFIG = Path(__file__).resolve().parent / "profiles.json"
BG = (10, 10, 15, 255)


def load_profiles() -> list[dict]:
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    return [p for board in config["boards"] for p in board["profiles"]]


def mascot_path(profile: dict) -> Path:
    return ROOT / "characters" / profile["folder"] / f"{profile['name']}-mascot.png"


def scale_to_height(im: Image.Image, height: int) -> Image.Image:
    ratio = height / im.height
    width = max(1, int(im.width * ratio))
    return im.resize((width, height), Image.LANCZOS)


def draw_circuit_bg(canvas: Image.Image, accent: tuple[int, int, int] = (35, 214, 165)) -> None:
    draw = ImageDraw.Draw(canvas)
    w, h = canvas.size
    for y in range(0, h, 48):
        draw.line([(0, y), (w, y)], fill=(20, 28, 40), width=1)
    for x in range(0, w, 64):
        draw.line([(x, 0), (x, h)], fill=(16, 22, 32), width=1)
    draw.line([(24, h - 24), (w - 24, h - 24)], fill=accent + (40,), width=2)
    draw.line([(24, 24), (w * 0.35, 24)], fill=(92, 141, 255, 40), width=2)


def paste_row(
    canvas: Image.Image,
    slices: list[Image.Image],
    *,
    pad_x: int = 16,
    pad_y: int = 0,
    gap: int = 8,
    align: str = "center",
) -> None:
    w, h = canvas.size
    pad_y = pad_y or max(8, (h - slices[0].height) // 2)
    total_w = sum(s.width for s in slices) + gap * (len(slices) - 1)
    if align == "left":
        x = pad_x
    else:
        x = max(pad_x, (w - total_w) // 2)
    for im in slices:
        canvas.paste(im, (x, pad_y), im)
        x += im.width + gap


def compose_home_hero(profiles: list[dict], out: Path) -> None:
    """Home: first 3 profiles on the left, empty hero space on the right."""
    w, h = 1200, 400
    canvas = Image.new("RGBA", (w, h), BG)
    draw_circuit_bg(canvas)

    picks = profiles[:3]
    imgs = [scale_to_height(Image.open(mascot_path(p)).convert("RGBA"), h - 32) for p in picks]
    paste_row(canvas, imgs, pad_x=28, pad_y=16, gap=12, align="left")

    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(out, optimize=True)
    print(f"wrote {out} ({w}x{h})")


def compose_share_strip(profiles: list[dict], out: Path) -> None:
    """Share: all 8 profiles, equal slots, full width."""
    w, h = 1200, 400
    canvas = Image.new("RGBA", (w, h), BG)
    draw_circuit_bg(canvas, accent=(255, 195, 77))

    slot_w = (w - 32 - 7 * 6) // 8
    imgs = []
    for p in profiles:
        im = Image.open(mascot_path(p)).convert("RGBA")
        imgs.append(scale_to_height(im, h - 24))

    # Re-scale to fit equal slot widths
    fitted = []
    for im in imgs:
        if im.width > slot_w:
            ratio = slot_w / im.width
            fitted.append(im.resize((slot_w, max(1, int(im.height * ratio))), Image.LANCZOS))
        else:
            fitted.append(im)

    x = 16
    for im in fitted:
        y = (h - im.height) // 2
        canvas.paste(im, (x, y), im)
        x += slot_w + 6

    canvas.convert("RGB").save(out, optimize=True)
    print(f"wrote {out} ({w}x{h})")


def compose_result_header(profiles: list[dict], out: Path) -> None:
    """Result: all 8 profiles in shallow header."""
    w, h = 1200, 280
    canvas = Image.new("RGBA", (w, h), BG)
    draw_circuit_bg(canvas, accent=(92, 141, 255))

    target_h = h - 20
    imgs = [scale_to_height(Image.open(mascot_path(p)).convert("RGBA"), target_h) for p in profiles]
    slot_w = (w - 24 - 7 * 4) // 8
    fitted = []
    for im in imgs:
        if im.width > slot_w:
            ratio = slot_w / im.width
            fitted.append(im.resize((slot_w, max(1, int(im.height * ratio))), Image.LANCZOS))
        else:
            fitted.append(im)

    x = 12
    for im in fitted:
        y = (h - im.height) // 2
        canvas.paste(im, (x, y), im)
        x += slot_w + 4

    canvas.convert("RGB").save(out, optimize=True)
    print(f"wrote {out} ({w}x{h})")


def main() -> None:
    profiles = load_profiles()
    if len(profiles) != 8:
        raise SystemExit(f"expected 8 profiles, got {len(profiles)}")

    for p in profiles:
        path = mascot_path(p)
        if not path.exists():
            raise SystemExit(f"missing mascot: {path}")

    compose_home_hero(profiles, ROOT / "banners" / "home-hero.png")
    compose_share_strip(profiles, ROOT / "banners" / "share-strip.png")
    compose_result_header(profiles, ROOT / "banners" / "result-header.png")


if __name__ == "__main__":
    main()
