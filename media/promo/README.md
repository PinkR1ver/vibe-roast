# Vibe Roaster promo media

All launch-film production files and delivery masters live here. This directory
is repository-only and is intentionally excluded from the npm `files` list.

## Structure

```text
media/promo/
├── hyperframes/       shared 15-second V2 source project
│   ├── index.html     1920×1080 landscape composition
│   ├── variants/portrait/index.html
│   │                   1080×1920 portrait composition
│   ├── compositions/
│   │   ├── landscape/
│   │   └── portrait/
│   └── assets/        generated locally from canonical `assests/` artwork
├── masters/
│   ├── landscape.mp4
│   └── portrait.mp4
├── review/            compact contact sheets only
└── legacy-python/     preserved 18-second Pillow/FFmpeg V1 renderer
```

The README animation stays under `assests/readme/` because it must render on
GitHub and npm. Full MP4 masters and authoring sources do not ship in the npm
package.

## HyperFrames

```bash
cd media/promo/hyperframes

# Landscape is the default composition.
npm run check
npm run render

# Portrait remains independently reproducible.
npm run render:portrait
```

Both compositions share the same canonical artwork and original procedural
soundtrack. `npm run prepare:assets` rebuilds the ignored local asset folder
from `assests/characters-vibe-types/`, `assests/readme/`, and
`assests/screenshots/`. Generated thumbnails, snapshots, captures, renders, and
local dependencies are ignored; keep only intentional contact sheets under
`media/promo/review/`.

## Legacy renderer

The first 18-second renderer is retained for reference:

```bash
python3 media/promo/legacy-python/render_promo.py --orientation horizontal --preset draft
```

Its generated output is not tracked.
