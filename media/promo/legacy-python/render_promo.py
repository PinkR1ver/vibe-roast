#!/usr/bin/env python3
"""Render the Vibe Roaster promo from existing repository artwork.

The renderer intentionally has no runtime dependency beyond Pillow and FFmpeg.
It streams RGB frames directly into FFmpeg, then adds an original procedural
sound bed. Nothing in this folder is part of the published npm package.
"""

from __future__ import annotations

import argparse
import math
import random
import shutil
import struct
import subprocess
import sys
import wave
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[3]
PROMO_DIR = ROOT / "media" / "promo"
OUTPUT_DIR = PROMO_DIR / "output"
FONT_DIR = ROOT / "assests" / "source" / "fonts"
CHARACTER_DIR = ROOT / "assests" / "characters-vibe-types"
BANNER_PATH = ROOT / "assests" / "readme" / "vibe-roast-16-types-banner.webp"
SCREENSHOT_PATH = ROOT / "assests" / "screenshots" / "roast-result-hero.jpg"
DURATION = 18.0

CHARACTERS = [
    ("AOSF", "strategy-shipper", "aosf-strategy-shipper"),
    ("AOSX", "agent-believer", "aosx-agent-believer"),
    ("AOVF", "systems-architect", "aovf-systems-architect"),
    ("AOVX", "context-cartographer", "aovx-context-cartographer"),
    ("APSF", "diagram-sprinter", "apsf-diagram-sprinter"),
    ("APSX", "infinite-planner", "apsx-infinite-planner"),
    ("APVF", "architect", "apvf-architect"),
    ("APVX", "prompt-priest", "apvx-prompt-priest"),
    ("MOSF", "yolo-shipper", "mosf-yolo-shipper"),
    ("MOSX", "agent-commander", "mosx-agent-commander"),
    ("MOVF", "agent-engineer", "movf-agent-engineer"),
    ("MOVX", "systems-wrangler", "movx-systems-wrangler"),
    ("MPSF", "builder", "mpsf-builder"),
    ("MPSX", "tab-hoarder", "mpsx-tab-hoarder"),
    ("MPVF", "debugger", "mpvf-debugger"),
    ("MPVX", "context-maxxer", "mpvx-context-maxxer"),
]

PROMPT_CHIPS = [
    "make it work",
    "one more tweak",
    "use the existing style",
    "check the whole repo",
    "ship it",
    "why is this broken?",
    "keep the useful parts",
    "no, more personality",
]


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def mix(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def ease_out_cubic(t: float) -> float:
    t = clamp(t)
    return 1 - (1 - t) ** 3


def ease_in_out_cubic(t: float) -> float:
    t = clamp(t)
    return 4 * t**3 if t < 0.5 else 1 - ((-2 * t + 2) ** 3) / 2


def ease_out_back(t: float) -> float:
    t = clamp(t)
    c1 = 1.70158
    c3 = c1 + 1
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2


def window(t: float, start: float, end: float, fade: float = 0.3) -> float:
    return clamp((t - start) / fade) * clamp((end - t) / fade)


def rgb(hex_value: str) -> tuple[int, int, int]:
    value = hex_value.lstrip("#")
    return tuple(int(value[index : index + 2], 16) for index in (0, 2, 4))


INK = rgb("#17181d")
CREAM = rgb("#f6eddb")
MINT = rgb("#22b889")
CORAL = rgb("#ef5b42")
COBALT = rgb("#557fd8")
PURPLE = rgb("#8d67b7")
MUTED = rgb("#77716a")


class PromoRenderer:
    def __init__(self, width: int, height: int, fps: int, orientation: str):
        self.width = width
        self.height = height
        self.fps = fps
        self.orientation = orientation
        self.vertical = orientation == "vertical"
        self.unit = min(width / (1080 if self.vertical else 1920), height / (1920 if self.vertical else 1080))
        self.dark_bg = self.make_background(True)
        self.light_bg = self.make_background(False)
        self.banner = Image.open(BANNER_PATH).convert("RGB")
        self.screenshot = Image.open(SCREENSHOT_PATH).convert("RGB")
        self.builder_path = (
            CHARACTER_DIR / "mpsf-builder" / "builder-figure.png"
        )
        self.character_paths = [
            CHARACTER_DIR / folder / f"{slug}-figure.png"
            for _code, slug, folder in CHARACTERS
        ]

    @lru_cache(maxsize=128)
    def font(self, role: str, size: int) -> ImageFont.FreeTypeFont:
        if role == "script":
            path = FONT_DIR / "GreatVibes-Regular.ttf"
        elif role == "mono":
            path = Path("/System/Library/Fonts/SFNSMono.ttf")
        elif role == "bold":
            path = Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")
        else:
            path = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
        if not path.exists():
            fallback = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
            path = fallback if fallback.exists() else FONT_DIR / "GreatVibes-Regular.ttf"
        return ImageFont.truetype(str(path), max(8, int(size * self.unit)))

    def make_background(self, dark: bool) -> Image.Image:
        top = (8, 10, 13) if dark else (244, 237, 224)
        bottom = (17, 21, 25) if dark else (226, 216, 202)
        image = Image.new("RGB", (self.width, self.height))
        draw = ImageDraw.Draw(image)
        for y in range(self.height):
            p = y / max(1, self.height - 1)
            color = tuple(int(mix(top[index], bottom[index], p)) for index in range(3))
            draw.line((0, y, self.width, y), fill=color)
        glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow, "RGBA")
        if dark:
            gd.ellipse(
                (
                    int(self.width * 0.1),
                    int(self.height * 0.08),
                    int(self.width * 0.9),
                    int(self.height * 0.76),
                ),
                fill=(*MINT, 35),
            )
        else:
            gd.ellipse(
                (
                    int(self.width * 0.08),
                    int(self.height * 0.02),
                    int(self.width * 0.92),
                    int(self.height * 0.83),
                ),
                fill=(255, 244, 219, 140),
            )
        glow = glow.filter(ImageFilter.GaussianBlur(max(16, int(110 * self.unit))))
        return Image.alpha_composite(image.convert("RGBA"), glow).convert("RGB")

    @lru_cache(maxsize=256)
    def asset(self, path_string: str, target_height: int) -> Image.Image:
        image = Image.open(path_string).convert("RGBA")
        height = max(1, target_height)
        width = max(1, int(image.width * height / image.height))
        return image.resize((width, height), Image.Resampling.LANCZOS)

    def tracked_width(self, draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, spacing: float) -> float:
        return sum(draw.textlength(char, font=font) for char in text) + spacing * max(0, len(text) - 1)

    def tracked_text(
        self,
        draw: ImageDraw.ImageDraw,
        text: str,
        center_x: float,
        y: float,
        font: ImageFont.FreeTypeFont,
        fill: tuple[int, int, int, int],
        spacing: float = 0,
    ) -> None:
        spacing *= self.unit
        x = center_x - self.tracked_width(draw, text, font, spacing) / 2
        for char in text:
            draw.text((x, y), char, font=font, fill=fill)
            x += draw.textlength(char, font=font) + spacing

    def centered_text(
        self,
        draw: ImageDraw.ImageDraw,
        text: str,
        center_x: float,
        y: float,
        font: ImageFont.FreeTypeFont,
        fill: tuple[int, int, int, int],
        stroke: int = 0,
        stroke_fill: tuple[int, int, int, int] | None = None,
    ) -> None:
        box = draw.textbbox((0, 0), text, font=font, stroke_width=stroke)
        x = center_x - (box[2] - box[0]) / 2 - box[0]
        draw.text(
            (x, y - box[1]),
            text,
            font=font,
            fill=fill,
            stroke_width=stroke,
            stroke_fill=stroke_fill,
        )

    def cover(self, source: Image.Image, zoom: float = 1.0, focus_x: float = 0.5, focus_y: float = 0.5) -> Image.Image:
        ratio = max(self.width / source.width, self.height / source.height) * zoom
        size = (max(1, int(source.width * ratio)), max(1, int(source.height * ratio)))
        image = source.resize(size, Image.Resampling.LANCZOS)
        max_x = max(0, image.width - self.width)
        max_y = max(0, image.height - self.height)
        left = int(max_x * clamp(focus_x))
        top = int(max_y * clamp(focus_y))
        return image.crop((left, top, left + self.width, top + self.height)).convert("RGBA")

    def contain(self, source: Image.Image, max_width: int, max_height: int) -> Image.Image:
        ratio = min(max_width / source.width, max_height / source.height)
        size = (max(1, int(source.width * ratio)), max(1, int(source.height * ratio)))
        return source.resize(size, Image.Resampling.LANCZOS)

    def paste(
        self,
        frame: Image.Image,
        layer: Image.Image,
        x: float,
        y: float,
        opacity: float = 1.0,
    ) -> None:
        if opacity <= 0:
            return
        image = layer
        if opacity < 0.999:
            image = layer.copy()
            alpha = image.getchannel("A").point(lambda value: int(value * clamp(opacity)))
            image.putalpha(alpha)
        frame.alpha_composite(image, (int(x), int(y)))

    def rounded_label(
        self,
        frame: Image.Image,
        text: str,
        center_x: float,
        y: float,
        color: tuple[int, int, int],
        alpha: float,
        font_size: int = 24,
    ) -> None:
        if alpha <= 0:
            return
        draw = ImageDraw.Draw(frame, "RGBA")
        font = self.font("bold", font_size)
        box = draw.textbbox((0, 0), text, font=font)
        pad_x = int(18 * self.unit)
        pad_y = int(10 * self.unit)
        width = box[2] - box[0] + pad_x * 2
        height = box[3] - box[1] + pad_y * 2
        x = int(center_x - width / 2)
        fill = (*color, int(220 * alpha))
        draw.rounded_rectangle(
            (x, int(y), x + width, int(y) + height),
            radius=max(4, int(height / 2)),
            fill=fill,
        )
        draw.text(
            (x + pad_x, y + pad_y - box[1]),
            text,
            font=font,
            fill=(249, 247, 240, int(255 * alpha)),
        )

    def spark_field(self, frame: Image.Image, t: float, light: bool = False) -> None:
        draw = ImageDraw.Draw(frame, "RGBA")
        palette = [MINT, CORAL, COBALT, PURPLE]
        for index in range(28):
            seed = index * 17.31
            x = (seed * 97 + t * (18 + index % 5) * self.unit) % self.width
            y = (seed * 43 + math.sin(t * 0.8 + index) * 40 * self.unit) % self.height
            size = max(2, int((2 + index % 4) * self.unit))
            color = palette[index % len(palette)]
            alpha = 35 if light else 55
            draw.polygon(
                [(x, y - size), (x + size, y), (x, y + size), (x - size, y)],
                fill=(*color, alpha),
            )

    def scene_intro(self, t: float) -> Image.Image:
        frame = self.dark_bg.convert("RGBA")
        self.spark_field(frame, t)
        draw = ImageDraw.Draw(frame, "RGBA")
        for index, chip in enumerate(PROMPT_CHIPS):
            row = index % (5 if self.vertical else 3)
            y_gap = self.height / (6 if self.vertical else 4)
            y = y_gap * (row + 0.8) + math.sin(t * 0.9 + index) * 18 * self.unit
            direction = -1 if index % 2 else 1
            base_x = ((index * 0.29 + t * 0.055 * direction) % 1.35 - 0.18) * self.width
            font = self.font("mono", 22 if self.vertical else 24)
            box = draw.textbbox((0, 0), chip, font=font)
            width = box[2] - box[0] + 34 * self.unit
            height = box[3] - box[1] + 20 * self.unit
            chip_alpha = int(130 * window(t, 0.0, 2.85, 0.45))
            draw.rounded_rectangle(
                (base_x, y, base_x + width, y + height),
                radius=max(5, int(16 * self.unit)),
                fill=(255, 255, 255, int(chip_alpha * 0.11)),
                outline=(*[70, 78, 82], int(chip_alpha * 0.35)),
                width=max(1, int(self.unit)),
            )
            draw.text(
                (base_x + 17 * self.unit, y + 10 * self.unit - box[1]),
                chip,
                font=font,
                fill=(230, 231, 227, chip_alpha),
            )

        center_y = self.height * (0.39 if self.vertical else 0.34)
        line1 = "YOUR PROMPTS"
        line2 = "HAVE A PERSONALITY."
        progress = ease_out_cubic((t - 0.38) / 1.0)
        font1 = self.font("bold", 76 if self.vertical else 82)
        font2 = self.font("bold", 76 if self.vertical else 82)
        shown1 = line1[: int(len(line1) * clamp(progress * 1.3))]
        shown2 = line2[: int(len(line2) * clamp((progress - 0.28) * 1.45))]
        self.centered_text(draw, shown1, self.width / 2, center_y, font1, (248, 246, 238, 255))
        self.centered_text(
            draw,
            shown2,
            self.width / 2,
            center_y + 100 * self.unit,
            font2,
            (*MINT, 255),
        )
        cursor = 1 if int(t * 4) % 2 == 0 else 0
        if cursor and shown2:
            text_width = draw.textlength(shown2, font=font2)
            draw.rounded_rectangle(
                (
                    self.width / 2 + text_width / 2 + 10 * self.unit,
                    center_y + 112 * self.unit,
                    self.width / 2 + text_width / 2 + 16 * self.unit,
                    center_y + 180 * self.unit,
                ),
                radius=2,
                fill=(*CORAL, 230),
            )
        self.tracked_text(
            draw,
            "LOCAL HISTORY  →  PERSONALITY EVIDENCE",
            self.width / 2,
            center_y + 245 * self.unit,
            self.font("mono", 17),
            (178, 180, 177, int(220 * clamp((t - 1.6) / 0.5))),
            1.1,
        )
        return frame

    def scene_axes(self, t: float) -> Image.Image:
        local = t - 2.8
        frame = self.light_bg.convert("RGBA")
        self.spark_field(frame, t, light=True)
        draw = ImageDraw.Draw(frame, "RGBA")
        title_y = 120 * self.unit if self.vertical else 80 * self.unit
        self.tracked_text(
            draw,
            "FOUR AXES. ONE VERDICT.",
            self.width / 2,
            title_y,
            self.font("mono", 19),
            (*INK, int(230 * ease_out_cubic(local / 0.5))),
            1.4,
        )
        axes = [
            ("M", "MAKER", 88, MINT),
            ("P", "PROMPTSMITH", 73, PURPLE),
            ("S", "SHIPPER", 87, CORAL),
            ("F", "FOCUSED", 95, COBALT),
        ]
        if self.vertical:
            start_y = self.height * 0.22
            gap = 265 * self.unit
            for index, (letter, label, percent, color) in enumerate(axes):
                reveal = ease_out_back((local - 0.35 - index * 0.48) / 0.52)
                y = start_y + index * gap
                x = 145 * self.unit + (1 - reveal) * -140 * self.unit
                font_letter = self.font("bold", 118)
                draw.text((x, y), letter, font=font_letter, fill=(*color, int(255 * clamp(reveal))))
                draw.text(
                    (x + 150 * self.unit, y + 20 * self.unit),
                    label,
                    font=self.font("bold", 30),
                    fill=(*INK, int(245 * clamp(reveal))),
                )
                draw.text(
                    (self.width - 165 * self.unit, y + 20 * self.unit),
                    f"{percent}%",
                    anchor="ra",
                    font=self.font("bold", 30),
                    fill=(*color, int(245 * clamp(reveal))),
                )
                bar_x = x + 150 * self.unit
                bar_y = y + 84 * self.unit
                bar_w = self.width - bar_x - 140 * self.unit
                draw.rounded_rectangle(
                    (bar_x, bar_y, bar_x + bar_w, bar_y + 14 * self.unit),
                    radius=max(2, int(7 * self.unit)),
                    fill=(25, 26, 30, int(25 * reveal)),
                )
                draw.rounded_rectangle(
                    (bar_x, bar_y, bar_x + bar_w * percent / 100 * clamp(reveal), bar_y + 14 * self.unit),
                    radius=max(2, int(7 * self.unit)),
                    fill=(*color, int(235 * clamp(reveal))),
                )
        else:
            card_w = self.width * 0.2
            gap = self.width * 0.025
            start_x = (self.width - (card_w * 4 + gap * 3)) / 2
            for index, (letter, label, percent, color) in enumerate(axes):
                reveal = ease_out_back((local - 0.35 - index * 0.45) / 0.5)
                x = start_x + index * (card_w + gap)
                y = self.height * 0.28 + (1 - reveal) * 100 * self.unit
                draw.rounded_rectangle(
                    (x, y, x + card_w, y + 380 * self.unit),
                    radius=max(10, int(28 * self.unit)),
                    fill=(255, 252, 247, int(210 * reveal)),
                    outline=(*INK, int(25 * reveal)),
                    width=max(1, int(2 * self.unit)),
                )
                self.centered_text(draw, letter, x + card_w / 2, y + 40 * self.unit, self.font("bold", 140), (*color, int(255 * reveal)))
                self.centered_text(draw, label, x + card_w / 2, y + 220 * self.unit, self.font("bold", 27), (*INK, int(245 * reveal)))
                self.centered_text(draw, f"{percent}%", x + card_w / 2, y + 280 * self.unit, self.font("bold", 36), (*color, int(245 * reveal)))

        final_alpha = ease_out_cubic((local - 2.25) / 0.65)
        if final_alpha > 0:
            y = self.height * (0.82 if self.vertical else 0.78)
            self.centered_text(
                draw,
                "MPSF",
                self.width / 2,
                y,
                self.font("bold", 132 if self.vertical else 150),
                (*INK, int(255 * final_alpha)),
            )
        scan_y = int((local * 0.42 % 1) * self.height)
        draw.rectangle((0, scan_y, self.width, scan_y + max(2, int(3 * self.unit))), fill=(*MINT, 80))
        return frame

    def scene_reveal(self, t: float) -> Image.Image:
        local = t - 5.8
        frame = self.dark_bg.convert("RGBA")
        draw = ImageDraw.Draw(frame, "RGBA")
        glow = Image.new("RGBA", frame.size, (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow, "RGBA")
        if self.vertical:
            gd.ellipse((80 * self.unit, 90 * self.unit, self.width - 80 * self.unit, 1060 * self.unit), fill=(*MINT, 50))
        else:
            gd.ellipse((30 * self.unit, 80 * self.unit, 850 * self.unit, 1000 * self.unit), fill=(*MINT, 50))
        glow = glow.filter(ImageFilter.GaussianBlur(max(20, int(75 * self.unit))))
        frame = Image.alpha_composite(frame, glow)
        draw = ImageDraw.Draw(frame, "RGBA")

        reveal = ease_out_back(local / 0.75)
        if self.vertical:
            target_h = int(920 * self.unit * max(0.1, mix(0.82, 1.0, clamp(reveal))))
            figure = self.asset(str(self.builder_path), target_h)
            x = (self.width - figure.width) / 2
            y = 115 * self.unit + (1 - clamp(reveal)) * 180 * self.unit
            self.paste(frame, figure, x, y, clamp(reveal))
            text_center = self.width / 2
            text_y = 1100 * self.unit
        else:
            target_h = int(900 * self.unit * max(0.1, mix(0.82, 1.0, clamp(reveal))))
            figure = self.asset(str(self.builder_path), target_h)
            x = 90 * self.unit + (1 - clamp(reveal)) * -160 * self.unit
            y = 100 * self.unit
            self.paste(frame, figure, x, y, clamp(reveal))
            text_center = self.width * 0.66
            text_y = 185 * self.unit

        type_alpha = ease_out_cubic((local - 0.45) / 0.5)
        self.centered_text(draw, "MPSF", text_center, text_y, self.font("bold", 72), (245, 244, 238, int(255 * type_alpha)))
        self.centered_text(draw, "Builder", text_center, text_y + 100 * self.unit, self.font("script", 92), (*MINT, int(255 * type_alpha)))
        self.centered_text(
            draw,
            "Converts short prompts into suspiciously fast demos",
            text_center,
            text_y + 220 * self.unit,
            self.font("bold", 25 if self.vertical else 28),
            (200, 199, 193, int(240 * type_alpha)),
        )

        tag_y = text_y + 330 * self.unit
        tag1 = ease_out_back((local - 1.25) / 0.48)
        tag2 = ease_out_back((local - 1.72) / 0.48)
        tag3 = ease_out_back((local - 2.18) / 0.48)
        if self.vertical:
            self.rounded_label(frame, "#PokerAIPlayer", text_center, tag_y, (18, 92, 70), tag1, 24)
            self.rounded_label(frame, "#PocketAcesBlindAllIn", text_center, tag_y + 78 * self.unit, (90, 50, 30), tag2, 21)
            self.rounded_label(frame, "#Builder", text_center, tag_y + 156 * self.unit, (39, 65, 109), tag3, 23)
        else:
            self.rounded_label(frame, "#PokerAIPlayer", text_center - 155 * self.unit, tag_y, (18, 92, 70), tag1, 22)
            self.rounded_label(frame, "#PocketAcesBlindAllIn", text_center + 125 * self.unit, tag_y, (90, 50, 30), tag2, 19)
            self.rounded_label(frame, "#Builder", text_center, tag_y + 72 * self.unit, (39, 65, 109), tag3, 22)

        receipt_alpha = ease_out_cubic((local - 2.65) / 0.45)
        receipt_y = self.height - (170 if self.vertical else 130) * self.unit
        self.tracked_text(
            draw,
            "3.68B TOKENS  ·  244 ACTIVE DAYS  ·  5 AGENTS",
            self.width / 2,
            receipt_y,
            self.font("mono", 18),
            (180, 184, 180, int(220 * receipt_alpha)),
            0.7,
        )
        return frame

    def vertical_cast(self, local: float) -> Image.Image:
        frame = self.light_bg.convert("RGBA")
        draw = ImageDraw.Draw(frame, "RGBA")
        cols = 4
        rows = 4
        cell_w = self.width / cols
        top = 95 * self.unit
        row_h = 370 * self.unit
        target_h = int(390 * self.unit)
        for index, path in enumerate(self.character_paths):
            col = index % cols
            row = index // cols
            delay = index * 0.095
            p = ease_out_back((local - delay) / 0.55)
            figure = self.asset(str(path), target_h)
            center_x = cell_w * (col + 0.5)
            x = center_x - figure.width / 2
            final_y = top + row * row_h
            origin = -140 * self.unit if col < cols / 2 else 140 * self.unit
            y = final_y + (1 - clamp(p)) * 110 * self.unit
            self.paste(frame, figure, x + (1 - clamp(p)) * origin, y, clamp(p))
        overlay = Image.new("RGBA", frame.size, (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay, "RGBA")
        od.rectangle((0, self.height * 0.73, self.width, self.height), fill=(13, 15, 18, 188))
        frame = Image.alpha_composite(frame, overlay)
        draw = ImageDraw.Draw(frame, "RGBA")
        title_alpha = ease_out_cubic((local - 1.55) / 0.55)
        self.centered_text(draw, "16 TYPES", self.width / 2, self.height * 0.78, self.font("bold", 78), (248, 246, 238, int(255 * title_alpha)))
        self.tracked_text(
            draw,
            "ONE VERY JUDGMENTAL DATASET",
            self.width / 2,
            self.height * 0.855,
            self.font("mono", 18),
            (*MINT, int(240 * title_alpha)),
            1.1,
        )
        return frame

    def horizontal_cast(self, local: float) -> Image.Image:
        zoom = mix(1.12, 1.0, ease_in_out_cubic(local / 3.8))
        frame = self.cover(self.banner, zoom=zoom, focus_x=0.5, focus_y=0.5)
        flash = clamp((0.4 - local) / 0.4)
        if flash > 0:
            wash = Image.new("RGBA", frame.size, (255, 249, 233, int(150 * flash)))
            frame = Image.alpha_composite(frame, wash)
        return frame

    def scene_cast(self, t: float) -> Image.Image:
        local = t - 9.9
        return self.vertical_cast(local) if self.vertical else self.horizontal_cast(local)

    def scene_finale(self, t: float) -> Image.Image:
        local = t - 14.2
        if self.vertical:
            frame = self.vertical_cast(4.2)
            veil = Image.new("RGBA", frame.size, (0, 0, 0, 0))
            vd = ImageDraw.Draw(veil, "RGBA")
            vd.rectangle((0, 0, self.width, self.height), fill=(8, 10, 12, int(128 * clamp(local / 0.8))))
            vd.ellipse(
                (
                    self.width * 0.06,
                    self.height * 0.19,
                    self.width * 0.94,
                    self.height * 0.72,
                ),
                fill=(255, 243, 218, int(205 * clamp(local / 0.8))),
            )
            veil = veil.filter(ImageFilter.GaussianBlur(max(20, int(45 * self.unit))))
            frame = Image.alpha_composite(frame, veil)
            center_y = self.height * 0.39
        else:
            zoom = mix(1.04, 1.0, ease_in_out_cubic(local / 2.5))
            frame = self.cover(self.banner, zoom=zoom, focus_x=0.5, focus_y=0.5)
            shade = Image.new("RGBA", frame.size, (0, 0, 0, 0))
            sd = ImageDraw.Draw(shade, "RGBA")
            sd.rectangle((0, self.height * 0.80, self.width, self.height), fill=(5, 7, 9, 145))
            shade = shade.filter(ImageFilter.GaussianBlur(max(4, int(12 * self.unit))))
            frame = Image.alpha_composite(frame, shade)
            center_y = self.height * 0.43
        draw = ImageDraw.Draw(frame, "RGBA")
        alpha = ease_out_cubic(local / 0.75)
        if self.vertical:
            title_font = self.font("script", 126)
            self.centered_text(draw, "Vibe Roaster", self.width / 2, center_y, title_font, (*INK, int(255 * alpha)), stroke=max(1, int(self.unit)), stroke_fill=(255, 249, 236, int(180 * alpha)))
            self.tracked_text(
                draw,
                "16 TYPES  /  NO ALIBIS",
                self.width / 2,
                center_y + 180 * self.unit,
                self.font("bold", 22),
                (*CORAL, int(255 * alpha)),
                0.7,
            )
        command_y = self.height * (0.87 if self.vertical else 0.88)
        command_alpha = ease_out_back((local - 0.72) / 0.55)
        command = "npx vibe-roast"
        font = self.font("mono", 25 if self.vertical else 28)
        box = draw.textbbox((0, 0), command, font=font)
        box_w = box[2] - box[0] + 54 * self.unit
        box_h = box[3] - box[1] + 30 * self.unit
        x = self.width / 2 - box_w / 2
        draw.rounded_rectangle(
            (x, command_y, x + box_w, command_y + box_h),
            radius=max(8, int(box_h / 2)),
            fill=(15, 17, 20, int(235 * clamp(command_alpha))),
            outline=(*MINT, int(180 * clamp(command_alpha))),
            width=max(1, int(2 * self.unit)),
        )
        self.centered_text(
            draw,
            command,
            self.width / 2,
            command_y + 15 * self.unit,
            font,
            (248, 247, 241, int(255 * clamp(command_alpha))),
        )
        return frame

    def scene(self, t: float) -> Image.Image:
        if t < 2.8:
            return self.scene_intro(t)
        if t < 3.2:
            p = ease_in_out_cubic((t - 2.8) / 0.4)
            return Image.blend(self.scene_intro(t), self.scene_axes(t), p)
        if t < 5.8:
            return self.scene_axes(t)
        if t < 6.25:
            p = ease_in_out_cubic((t - 5.8) / 0.45)
            return Image.blend(self.scene_axes(t), self.scene_reveal(t), p)
        if t < 9.9:
            return self.scene_reveal(t)
        if t < 10.35:
            p = ease_in_out_cubic((t - 9.9) / 0.45)
            return Image.blend(self.scene_reveal(t), self.scene_cast(t), p)
        if t < 14.2:
            return self.scene_cast(t)
        if t < 14.65:
            p = ease_in_out_cubic((t - 14.2) / 0.45)
            return Image.blend(self.scene_cast(t), self.scene_finale(t), p)
        return self.scene_finale(t)

    def render(self, output_path: Path, audio_path: Path | None, crf: int) -> None:
        total_frames = int(DURATION * self.fps)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        command = [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "rgb24",
            "-s",
            f"{self.width}x{self.height}",
            "-r",
            str(self.fps),
            "-i",
            "-",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            str(crf),
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(output_path),
        ]
        if audio_path is not None:
            command[command.index("-c:v"):command.index("-c:v")] = ["-i", str(audio_path)]
            command[command.index("-movflags"):command.index("-movflags")] = [
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                "-shortest",
            ]
        process = subprocess.Popen(command, stdin=subprocess.PIPE)
        assert process.stdin is not None
        try:
            for frame_index in range(total_frames):
                t = frame_index / self.fps
                frame = self.scene(t).convert("RGB")
                process.stdin.write(frame.tobytes())
                if frame_index % self.fps == 0:
                    print(f"[{self.orientation}] {frame_index // self.fps:02d}s / {int(DURATION):02d}s", flush=True)
        finally:
            process.stdin.close()
        return_code = process.wait()
        if return_code != 0:
            raise RuntimeError(f"FFmpeg exited with status {return_code}")


def synth_audio(path: Path, duration: float = DURATION, sample_rate: int = 48_000) -> None:
    """Create an original restrained electronic pulse/click/impact sound bed."""
    rng = random.Random(8721)
    total = int(duration * sample_rate)
    transitions = [2.9, 5.95, 10.05, 14.35]
    axis_clicks = [3.2, 3.68, 4.16, 4.64]
    tag_clicks = [7.05, 7.52, 7.98]
    notes = [110.0, 130.81, 164.81, 146.83, 110.0, 196.0]

    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(sample_rate)
        frames = bytearray()
        for index in range(total):
            t = index / sample_rate
            value = 0.0

            # Soft tonal bed: sparse plucks instead of a copyrighted music loop.
            beat = int(t / 0.75)
            beat_time = t - beat * 0.75
            if beat_time < 0.34:
                env = math.exp(-beat_time * 10.0)
                freq = notes[beat % len(notes)]
                value += math.sin(2 * math.pi * freq * beat_time) * env * 0.075
                value += math.sin(2 * math.pi * freq * 2.01 * beat_time) * env * 0.018

            # Low transition impacts.
            for hit in transitions:
                dt = t - hit
                if 0 <= dt < 0.72:
                    env = math.exp(-dt * 7.0)
                    sweep = 62 - dt * 20
                    value += math.sin(2 * math.pi * sweep * dt) * env * 0.22

            # Axis and hashtag UI clicks.
            for click in axis_clicks + tag_clicks:
                dt = t - click
                if 0 <= dt < 0.07:
                    env = math.exp(-dt * 55)
                    value += math.sin(2 * math.pi * 1250 * dt) * env * 0.11
                    value += (rng.random() * 2 - 1) * env * 0.025

            # Short risers into major scene changes.
            for hit in transitions:
                dt = hit - t
                if 0 < dt < 0.55:
                    p = 1 - dt / 0.55
                    value += (rng.random() * 2 - 1) * p * p * 0.035
                    value += math.sin(2 * math.pi * (260 + p * 620) * t) * p * 0.018

            # Final logo shimmer.
            if 14.6 <= t < 17.4:
                local = t - 14.6
                env = min(1.0, local / 0.5) * min(1.0, (17.4 - t) / 0.7)
                value += math.sin(2 * math.pi * 440 * t) * env * 0.018
                value += math.sin(2 * math.pi * 659.25 * t) * env * 0.012

            value = math.tanh(value * 1.45) * 0.78
            left = int(max(-1, min(1, value * (0.98 + 0.02 * math.sin(t * 0.7)))) * 32767)
            right = int(max(-1, min(1, value * (0.98 - 0.02 * math.sin(t * 0.7)))) * 32767)
            frames.extend(struct.pack("<hh", left, right))
            if len(frames) >= sample_rate * 4:
                output.writeframesraw(frames)
                frames.clear()
        if frames:
            output.writeframesraw(frames)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--orientation", choices=["vertical", "horizontal"], default="vertical")
    parser.add_argument("--preset", choices=["draft", "final"], default="draft")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--no-audio", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not shutil.which("ffmpeg"):
        raise SystemExit("ffmpeg is required")
    if args.orientation == "vertical":
        width, height = ((540, 960) if args.preset == "draft" else (1080, 1920))
    else:
        width, height = ((960, 540) if args.preset == "draft" else (1920, 1080))
    fps = 24 if args.preset == "draft" else 30
    suffix = "-draft" if args.preset == "draft" else ""
    output = args.output or OUTPUT_DIR / f"vibe-roast-promo-{args.orientation}{suffix}.mp4"
    audio = None if args.no_audio else OUTPUT_DIR / "vibe-roast-promo-audio.wav"
    if audio is not None and not audio.exists():
        print("Synthesizing original sound bed…", flush=True)
        synth_audio(audio)
    renderer = PromoRenderer(width, height, fps, args.orientation)
    renderer.render(output, audio, 22 if args.preset == "draft" else 18)
    print(f"Rendered {output.relative_to(ROOT)}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
