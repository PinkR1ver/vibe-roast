# Vibe Types — 16-character visual brief

These portraits extend the visual language of the eight legacy score archetypes into a sixteen-type system. They are a single coherent series: one centered full-body figure, 2:3 portrait, transparent background, large low-poly flat-vector facets, simplified rectangular face, clean silhouette, no outlines, no texture, no text, no logo, no watermark, no card border, no photorealism, no anime, and no glossy 3D.

Every image should make the roast readable before the label is shown. Use one human, one compact prop grouping, one visual joke, empty background, and 5.5–6-head character proportions. Do not turn a role into a multi-character environment or editorial scene.

## Shared generation prompt

> Match the attached legacy characters exactly: one single tall slim full-body human, about six heads tall; simple friendly rectangular face with oval eyes and a tiny curved mouth; large clean low-poly vector facets; smooth untextured muted fills; no outlines; sparse details; one compact prop grouping; isolated with the same scale and negative space. Generate on a perfectly flat `#00FF00` chroma-key background, then remove that background to produce a true-alpha PNG. No elaborate environment, complex scene, paper grain, realistic anatomy, cinematic lighting, 3D materials, words, letters, logos, watermark, border, or card frame. 1024×1536 portrait.

Append one character direction below to the shared prompt.

| Type | Character | Visual direction | Palette |
|---|---|---|---|
| MOVF | Agent Engineer | Calm engineer with a control tablet and two tiny Agent cubes: check and wrench. | teal, charcoal |
| MOVX | Systems Wrangler | Operator holding colored context ribbons attached to two Agent cubes; overfilled file satchel. | sea green, rust, navy |
| MOSF | YOLO Shipper | Grinning courier holding an oversized merge symbol; unchecked test sheet in pocket. | vermilion, charcoal |
| MOSX | Agent Commander | Conductor directing three Agent cubes with a baton while balancing coffee. | coral, plum, cyan |
| MPVF | Debugger | Patient debugger with magnifying glass, tiny bug, error notebook, and rubber duck. | dusty rose, cream, yellow |
| MPVX | Context Maxxer | Anxious engineer carrying a huge folder stack with an almost-full gauge. | cyan, navy, sand |
| MPSF | Builder | Practical maker holding a finished play-block and a wrench. | mint, cobalt, charcoal |
| MPSX | Tab Hoarder | Overwhelmed developer holding a fan of browser-tab cards and reaching for the green one. | orange, turquoise, aubergine |
| AOVF | Systems Architect | Composed architect with a modular blueprint tablet and one checking Agent cube. | blue, jade, sand |
| AOVX | Context Cartographer | Explorer holding a folded dependency map with a tiny Agent scout. | slate blue, moss, copper |
| AOSF | Strategy Shipper | Tactical planner turning a roadmap scroll into a launch ramp for one app cube. | violet, coral, gold |
| AOSX | Agent Believer | Serene technologist holding an arch-shaped Agent shrine and forgotten checklist. | purple, aqua, rose |
| APVF | Architect | Severe reviewer measuring a geometric system model with calipers; check tile waits below. | royal blue, brick, cream |
| APVX | Prompt Priest | Ceremonial prompt writer holding a comically long rules scroll that wraps around a patient robot agent; reverent but self-aware. | mustard, plum, teal |
| APSF | Diagram Sprinter | Energetic designer carrying rolled blueprints and one small runnable play-block. | terracotta, sky blue, green |
| APSX | Infinite Planner | Thoughtful planner adding one last sticky to a circular map; dusty start block below. | lavender, mauve, dusty blue |

## Target paths

Each final PNG is `1024×1536`, contains a real alpha channel, and lives at:

`assests/characters-vibe-types/<lowercase-code>-<slug>/<slug>-figure.png`

The exact folders/slugs are defined by `PERSONALITIES` in `src/lib/agent-score.js` and `assests/scripts/vibe-types.json`. The legacy `profiles.json` remains unchanged for the old eight-figure maintenance scripts.
