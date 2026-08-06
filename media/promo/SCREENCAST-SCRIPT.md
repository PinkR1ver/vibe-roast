---
format: 1920×1080 (primary), 1080×1920 (social cut)
duration: target 45–60s
style: screen-capture demo with editorial overlay
message: "Your prompts have a personality — run one command to find out."
arc: Terminal → Inspection → Web Reveal → 16-Type Cast → CTA
audience: AI coding users discovering vibe-roast for the first time
audio: keyboard ASMR + subtle procedural pulse bed + four percussive verdict stamps + cast arrival texture + soft sting
---

# Vibe Roast — Terminal-to-Web Screencast Script

## Production approach

This is a screen-capture demo, not a motion-graphics film. The terminal and
browser footage are real; editorial overlays (axis verdicts, type badge, cast
grid) are composited in post. The palette and typography follow `frame.md`:
cream (#F5F0E5), ink (#0B1113), mint (#18B98B), coral (#EF6B4A), navy
(#181615), Inter display, JetBrains Mono for terminal/code.

Capture the terminal at retina resolution with the macOS "Pro" theme (dark
background). Capture the browser at 1920×1080 in a clean Chrome window with
no bookmarks bar, no extension icons. Record both as separate source tracks.

## Sound design (minimal)

No narration. No licensed music. The audio is three layers:

- **Room tone + keyboard ASMR** throughout the terminal section. Real
  mechanical keyboard clicks synced to typed characters.
- **Procedural pulse bed** — low 60–80 BPM sub-bass pulse that enters subtly
  during the inspection status animation and carries through the web section.
- **Four percussive verdict stamps** — short woodblock/clave hits that land as
  each axis letter (M, P, S, F) locks into place.
- **Cast arrival texture** — a rising filtered-noise whoosh as the 16
  characters materialize, peaking just before the grid settles.
- **Short coral sting** on the final CTA reveal.

---

## Shot 1 — The Terminal Opens

| attr | value |
|------|-------|
| duration | 3.0s |
| source | screen capture — macOS Terminal, Pro theme, 120×40 |
| transition_in | cut from black |
| sfx | ambient room tone, single terminal-bell chime on open |

**Visual:** Black screen → instant cut to a macOS Terminal window. The prompt
line sits at `~ $` with a blinking block cursor. The window is centered in
frame; everything else is dark — this is the only thing the viewer sees.

Hold for 0.8s of stillness. The cursor blinks twice. This beat establishes:
this is real, not a mockup.

Then the user's fingers enter frame (optional — if you have a top-down camera,
a brief 0.5s insert of hands on keyboard adds texture; otherwise skip it).

**Keyframe overlay (post):** none. Pure screen.

---

## Shot 2 — Typing The Command

| attr | value |
|------|-------|
| duration | 2.5s |
| source | same terminal capture, continuous |
| sfx | mechanical keyboard clicks, one per character |

The characters type in one at a time, ~100ms per character, deliberate but not
slow:

```
n p x   v i b e - r o a s t
```

A 0.3s pause after `vibe-roast`, then:

```
⏎
```

The Enter key lands with a slightly heavier click. The terminal clears or
scrolls and the VIBE ROAST branded header appears.

---

## Shot 3 — The Roast Machine Wakes Up

| attr | value |
|------|-------|
| duration | 4.0s |
| source | real terminal output from `npx vibe-roast` |
| sfx | pulse bed enters, low-passed, barely audible |

The terminal renders the branded launch sequence. On screen, exactly:

```
╭─ VIBE ROAST · local evidence lab
│  Compiling vibes. Types may be dramatically exaggerated.
╰────────────────────────────────────────────
```

The humour line rotates (any of the 8 variants is fine — "Compiling vibes" or
"Your prompts have requested legal counsel" both work).

Then the animated status spinner cycles through:

```
  ◜ Dusting the fingerprints off local agent history
  ◝ Arranging the evidence by dramatic potential
  ◟ Preheating the roast without uploading your prompts
  ◆ Preheating the roast without uploading your prompts
```

Each line resolves with the ◆ checkmark. This is where the pulse bed fades in
from silence to audible. The viewer gets the message: this is local, private,
and it's working.

**Post note:** If the real terminal output scrolls too fast, slow this section
to 80–85% speed in post. The spinner frames should feel deliberate.

---

## Shot 4 — Inspection Complete, Server Starts

| attr | value |
|------|-------|
| duration | 2.0s |
| source | continuous terminal capture |
| sfx | pulse bed settles into steady loop |

The terminal prints the final line:

```
  ◆ Ready — open http://localhost:7681
```

The URL is in dim white/cream on the dark terminal background. Hold this frame
for 1.2s so the viewer can read the URL, then:

**Transition to Shot 5:** The terminal frame shrinks and slides left as a
browser window expands from the right. This is a 0.4s push transition — the
terminal becomes a narrow column on the left third of frame, and Chrome fills
the remaining two-thirds. The URL bar in Chrome shows `localhost:7681` being
typed (or autofilled) and Enter being pressed.

---

## Shot 5 — The Roast Result Page Loads

| attr | value |
|------|-------|
| duration | 3.5s |
| source | screen capture — Chrome, localhost:7681, 1920×1080 viewport |
| transition_in | push from Shot 4 |
| sfx | pulse bed continues |

The page loads. The first thing visible is the header:

```
Vibe Roast                    🌙  EN  GitHub  [Share]
```

The brand name is large (44–52px, dark on light or light on dark depending on
theme). Below it, the profile content reveals in this order as the page
renders:

1. **Agent icon** — the user's determined personality character, centered,
   fades in (this is the `AgentIcon` component).

2. **Four-axis verdict** — the four dichotomies render as labeled bars or
   pills: Methodology (M), Precision (P), Scale (S), Focus (F). Each axis has
   a letter and a binary position (e.g., M→O, P→S, etc.).

3. **Type name** — the 16-type label (e.g., "Builder", "Context Cartographer",
   "YOLO Shipper") appears below the icon in Inter display weight.

The page settles. Hold for 1.0s of stillness so the viewer absorbs the
personality result.

**Post overlay:** As each axis locks, flash a subtle coral ✱ mark beside the
axis letter and play the corresponding woodblock stamp (four total, spaced
~0.5s apart). These are the only editorial overlays on the web section — the
rest is real product.

---

## Shot 6 — Scroll Through The Evidence

| attr | value |
|------|-------|
| duration | 8.0s |
| source | smooth scroll capture of the Roast Result page |
| sfx | pulse bed with slight filter sweep upward as we descend |

A smooth, linear scroll (capture with browser devtools or a scroll-capture
tool, not shaky hand-scrolling) reveals the full page in sequence:

**6a. Roast text** (0.0–2.5s)
The AI-generated or deterministic roast paragraph. This is the heart of the
product. A paragraph of playful, personality-driven commentary in English (or
bilingual if locale is ZH). The text is in Inter body on a subtle card
background.

**6b. Hashtags** (2.5–3.5s)
A row of 3–5 hashtag pills below the roast: `#BuilderEnergy`,
`#CommitAndPray`, `#TypeMPSF`, etc. Each pill is a small rounded tag in the
accent color.

**6c. Activity heatmap** (3.5–6.0s)
The 3D terrain or grid heatmap showing coding activity over time. Peaks and
valleys are visible — busy weeks form mountains, quiet weeks are flat. This
is the `ActivityHeatmap3DPanel` component.

**6d. Usage stats** (6.0–8.0s)
The `UsageAnalytics` section: active days, streak, peak day, top agent/model.
Numbers are large (Inter number-hero style) with JetBrains Mono unit labels.

**Post note:** Insert a 0.3s ease-pause at each section boundary so the
viewer's eye can register what they're seeing. Do not linger — this is a
scroll-through, not a deep read.

---

## Shot 7 — The Camera Pulls Back

| attr | value |
|------|-------|
| duration | 2.0s |
| source | post-production composite |
| transition_in | browser content fades to a screenshot snapshot, then camera zooms out |
| sfx | cast arrival whoosh begins |

The browser content freezes into a flat card. The camera pulls back — the card
shrinks as the background expands to a full-bleed cream field. The terminal
column from Shot 4 dissolves away.

Now the frame is an open cream canvas. The roast result card sits small in the
center. This is the breath before the finale.

---

## Shot 8 — The Sixteen Types Arrive

| attr | value |
|------|-------|
| duration | 5.0s |
| source | composited character artwork from `assests/characters-vibe-types/` |
| sfx | rising filtered-noise whoosh → sharp cutoff → silence → coral sting |

**8a. Grid formation** (0.0–2.5s)
Sixteen character figures materialize in a 4×4 grid, one row at a time,
top to bottom. Each figure scales from 0.85 → 1.0 with a short overshoot and
settles on `power3.out`. Row stagger: 0.35s between rows.

The grid order follows the canonical 4×4 arrangement from the README banner:

| Row | Types |
|-----|-------|
| 1 | Strategy Shipper, Agent Believer, Systems Architect, Context Cartographer |
| 2 | Diagram Sprinter, Infinite Planner, Architect, Prompt Priest |
| 3 | YOLO Shipper, Agent Commander, Agent Engineer, Systems Wrangler |
| 4 | Builder, Tab Hoarder, Debugger, Context Maxxer |

Each figure has a thin cream hairline border (1px, ink@12%) and sits on a
navy-soft background tile.

**8b. Name labels** (1.5–3.5s)
As each row settles, its type names fade in below each figure in JetBrains
Mono, uppercase, 0.16em tracking — the `kicker` typography from `frame.md`.

**8c. The user's type highlights** (3.5–5.0s)
One figure in the grid pulses with a coral border. The rest dim slightly
(opacity 0.4). This is the user's determined type — the same character from
Shot 5. A small coral ✱ spike mark appears beside its name.

**8d. Grid holds** (4.0–5.0s)
All figures return to full opacity. The entire ensemble is visible and still.
Silence for the final 0.6s.

---

## Shot 9 — Call To Action

| attr | value |
|------|-------|
| duration | 4.0s |
| source | composited |
| transition_in | dissolve from cast grid |
| sfx | short coral sting on reveal, then pulse bed fades out |

The grid dissolves to a centered lockup on the cream background:

```
              npx vibe-roast

        Your prompts have a personality.

              [ GitHub ] [ npm ]
```

The command is in JetBrains Mono on a navy code surface (the `code-surface`
component). The tagline is in Inter display-italic. GitHub and npm are small
coral-callout buttons.

A subtle Vibe Roast wordmark in Great Vibes sits below everything, small,
in ink at 40% opacity. The coral ✱ spike mark sits to its left.

Hold for 3.0s, then fade to ink (#0B1113).

---

## Editing notes

### Capture checklist

- [ ] Record terminal at retina resolution, Pro theme, 120×40, no transparency
- [ ] Record browser at 1920×1080, incognito window, no extensions, no bookmarks bar
- [ ] Capture a real `npx vibe-roast` run with actual local data (the humour
  lines and status animation are part of the product)
- [ ] Capture a smooth scroll of the full Roast Result page (use `window.scrollTo`
  in devtools console with `behavior: "smooth"` for consistent timing)
- [ ] Ensure the Roast Result page uses real data — real prompts, real activity,
  real type determination. Empty or demo data undermines the video's premise.

### Post-production order

1. Sync terminal and browser tracks to a single timeline
2. Speed-ramp the terminal spinner section (Shot 3) to ~80% if too fast
3. Composite the four axis stamp overlays in Shot 5
4. Composite the 16-character grid (Shot 8) using the canonical figures from
   `assests/characters-vibe-types/` — do not redraw or restyle them
5. Add the coral ✱ callout on the user's type
6. Build the CTA lockup (Shot 9) — the `code-surface` and `coral-callout`
   components are defined in `frame.md`
7. Mix audio: keyboard ASMR → pulse bed → verdict stamps → cast whoosh → sting
8. Render at 30fps, H.264/yuv420p, AAC 48kHz stereo

### Social cut (1080×1920)

For the portrait variant, reframe each shot:
- **Shots 1–4 (terminal):** crop to center 1080×1920 region; the command
  prompt and output remain legible at this width
- **Shots 5–6 (browser):** scroll the page in a 1080-wide viewport; capture a
  separate mobile-width scroll pass if needed
- **Shot 8 (cast grid):** stack the 16 characters in a 2×8 or 4×4 layout that
  fits 1080 width; reduce figure scale to ~70%
- **Shot 9 (CTA):** center the lockup vertically, same typography scale

### What to avoid

- Device mockups, phone frames, browser chrome as decoration
- Stock footage, generic "AI" purple-blue gradients, particle fields
- Screen-recording artifacts: mouse cursor wandering, window resize flicker,
  notification popups, desktop icons in frame
- Over-explaining the interface with callout arrows or text bubbles — let the
  product speak
- Motion that freezes after the first second of any shot — keep micro-animation
  alive (cursor blink, spinner, scroll momentum)

### Reference assets

| Asset | Path |
|-------|------|
| 16 character figures | `assests/characters-vibe-types/` |
| Ensemble banner | `assests/readme/vibe-roast-16-types-banner.webp` |
| Product screenshot | `assests/screenshots/roast-result-hero.jpg` |
| Frame design system | `media/promo/hyperframes/frame.md` |
| Existing landscape master | `media/promo/masters/landscape.mp4` |
| Existing portrait master | `media/promo/masters/portrait.mp4` |
| Great Vibes wordmark font | `media/promo/hyperframes/assets/brand/GreatVibes-Regular.ttf` |

---

## Alternative: the 25-second cut

If 45–60s is too long, trim to this compressed arc:

| Shot | Duration | Content |
|------|----------|---------|
| 1–2 | 2.5s | Terminal opens, command types |
| 3 | 2.0s | Branded header + one status line |
| 4 | 1.0s | "Ready" line, immediate cut to browser |
| 5 | 2.5s | Page loads, icon + axes appear |
| 6 | skip | No scroll — cut directly from verdict to cast |
| 8 | 3.5s | Grid forms faster, 0.2s row stagger |
| 9 | 2.5s | CTA lockup, 2s hold, fade out |

Total: ~14s. This keeps the terminal → web → cast payoff but drops the
evidence scroll for a tighter loop. Use the same audio cues compressed to fit.
