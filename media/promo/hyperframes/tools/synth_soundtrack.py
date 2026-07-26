#!/usr/bin/env python3
"""Generate the original 15-second Vibe Roast V2 kinetic sound bed."""

from __future__ import annotations

import math
import random
import struct
import wave
from pathlib import Path


SAMPLE_RATE = 48_000
DURATION = 15.0
OUTPUT = Path(__file__).resolve().parents[1] / "assets" / "vibe-roast-v2-soundtrack.wav"


def envelope(dt: float, decay: float) -> float:
    return math.exp(-dt * decay) if dt >= 0 else 0.0


def main() -> None:
    rng = random.Random(0xBADA55)
    total_samples = int(SAMPLE_RATE * DURATION)
    scene_hits = [2.6, 5.8, 9.0, 12.2]
    axis_hits = [3.05, 3.55, 4.05, 4.55]
    tag_ticks = [7.15, 7.52, 7.89]
    cast_waves = [9.16, 9.66, 10.16, 10.66]
    notes = [82.41, 98.0, 123.47, 110.0, 146.83, 123.47, 164.81, 146.83]

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUTPUT), "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        buffer = bytearray()

        for sample in range(total_samples):
            t = sample / SAMPLE_RATE
            value = 0.0

            # Nervous editorial pulse: the machine never quite sits still.
            step = int(t / 0.375)
            local = t - step * 0.375
            if local < 0.19:
                env = envelope(local, 15.0)
                frequency = notes[step % len(notes)]
                value += math.sin(math.tau * frequency * local) * env * 0.07
                value += math.sin(math.tau * frequency * 2.005 * local) * env * 0.014

            # Tiny high-frequency prompt fragments during intake.
            if t < 2.6 and step % 2 == 0 and local < 0.045:
                value += math.sin(math.tau * 1420 * local) * envelope(local, 60) * 0.075

            # Four-axis verdict stamps, descending in pitch and growing in weight.
            for number, hit in enumerate(axis_hits):
                dt = t - hit
                if 0 <= dt < 0.34:
                    env = envelope(dt, 14 - number)
                    value += math.sin(math.tau * (116 - number * 11) * dt) * env * (0.13 + number * 0.018)
                    value += (rng.random() * 2 - 1) * envelope(dt, 48) * 0.025

            # Identity tag receipts.
            for tick in tag_ticks:
                dt = t - tick
                if 0 <= dt < 0.065:
                    value += math.sin(math.tau * 1760 * dt) * envelope(dt, 68) * 0.08

            # Cast arrives in four increasingly wide swarms.
            for number, hit in enumerate(cast_waves):
                dt = t - hit
                if 0 <= dt < 0.5:
                    env = math.sin(min(1.0, dt / 0.5) * math.pi)
                    value += (rng.random() * 2 - 1) * env * (0.018 + number * 0.006)
                    value += math.sin(math.tau * (180 + number * 44 + dt * 380) * dt) * env * 0.018

            # Scene locks: low impact plus a short pre-hit noise lift.
            for hit in scene_hits:
                dt = t - hit
                if 0 <= dt < 0.62:
                    value += math.sin(math.tau * (58 - dt * 17) * dt) * envelope(dt, 6.8) * 0.23
                lead = hit - t
                if 0 < lead < 0.32:
                    progress = 1 - lead / 0.32
                    value += (rng.random() * 2 - 1) * progress * progress * 0.035

            # Finale: bright wordmark shimmer, then a clean held tail.
            if 12.2 <= t < 15:
                dt = t - 12.2
                fade = min(1.0, dt / 0.32) * min(1.0, (15 - t) / 0.55)
                value += math.sin(math.tau * 329.63 * t) * fade * 0.018
                value += math.sin(math.tau * 493.88 * t) * fade * 0.011

            value = math.tanh(value * 1.55) * 0.78
            pan = math.sin(t * 0.83) * 0.025
            left = int(max(-1.0, min(1.0, value * (1 + pan))) * 32767)
            right = int(max(-1.0, min(1.0, value * (1 - pan))) * 32767)
            buffer.extend(struct.pack("<hh", left, right))

            if len(buffer) >= SAMPLE_RATE * 4:
                wav.writeframesraw(buffer)
                buffer.clear()

        if buffer:
            wav.writeframesraw(buffer)

    print(OUTPUT)


if __name__ == "__main__":
    main()
