# Reproducible launch promo video

- Created: 2026-07-26
- Last updated: 2026-07-27
- Status: completed

## Goal

Turn the existing Vibe Roaster visual system into a short launch film without
introducing a second illustration style or relying on licensed music.

## Delivered

- An 18-second storyboard: prompt evidence, four-axis scan, personality reveal,
  all-sixteen cast, then the `npx vibe-roast` call to action.
- Separate 1080×1920 and 1920×1080 H.264/AAC masters.
- A preserved Pillow/FFmpeg renderer at
  `media/promo/legacy-python/render_promo.py` so copy, timing, and
  source artwork can be updated without rebuilding the film by hand.
- An original procedural sound bed made from synthesized clicks, pulses,
  impacts, risers, and shimmer.

## Constraints

- Source figures remain the canonical assets under
  `assests/characters-vibe-types/`.
- The horizontal cast/finale uses the canonical README banner under
  `assests/readme/`.
- Promotional media is repository material, not part of the npm package
  whitelist or the application runtime.

## Verification

- Both masters are exactly 18 seconds at 30fps.
- Video: H.264/yuv420p. Audio: AAC, 48kHz, stereo.
- Key frames from each scene were visually inspected in both orientations.
- `python3 -m py_compile media/promo/legacy-python/render_promo.py` passes.

## V2 — The Roast Machine

- A new 15-second, 1080×1920 HyperFrames composition lives in the shared
  production project at
  `media/promo/hyperframes/variants/portrait/index.html`.
- Five shots turn prompt fragments into the four-axis verdict, the Builder
  identity, the complete 16-type cast, and the `npx vibe-roast` CTA.
- The film uses a new original procedural soundtrack aligned to every scene
  lock, verdict stamp, cast wave, and final wordmark.
- All five frame compositions are assembled with four verified cross-track
  transitions. HyperFrames lint, runtime, layout, and contrast gates pass.
- Midpoint snapshots and a frame extracted from the final artifact were
  visually inspected.
- The Frame 3 macro `M/P/S/F` layer exits immediately after the camera dive;
  exact final-render samples from 7.0–8.0 seconds confirm the Builder character
  and identity receipt complete without foreground obstruction.
- Frame 3 finishes its sliced character assembly before 7 seconds, returns the
  figure to a front-facing plane, and applies a soft masked relight to neutralize
  the source illustration's overly strong right-side shadow against the dark
  evidence panel.
- The 2–4 second handoff uses a short blur focus transfer instead of the
  artifact-prone squeeze. Four scan nodes causally trigger depth-driven verdict
  cards, and each correct axis letter locks directly without placeholder
  gibberish.
- Final master: `media/promo/masters/portrait.mp4` — 15 seconds,
  1080×1920, 30fps, H.264/yuv420p with audio.

## V2 landscape and README delivery

- A native 1920×1080 re-layout is the default composition at
  `media/promo/hyperframes/index.html`.
  It preserves the five-shot timing and audio but recomposes each scene for
  width: prompt evidence and verdict copy split the frame, Builder pairs with
  an identity receipt, the sixteen characters form a wide ensemble, and the
  finale uses the cast as lateral wings.
- The repository masters live under `media/promo/masters/` as `landscape.mp4`
  and `portrait.mp4`. The portrait master remains an independent
  asset and is not replaced by the README edition.
- README embeds `assests/readme/vibe-roast-promo-landscape.gif` (800×450,
  12fps, 15 seconds) and links it to
  `media/promo/masters/landscape.mp4`.
- HyperFrames `check --samples 7` passes with zero lint/runtime/layout/motion
  errors. The remaining notices are intentional overflow during camera and
  cast entrances plus non-blocking authoring warnings.
