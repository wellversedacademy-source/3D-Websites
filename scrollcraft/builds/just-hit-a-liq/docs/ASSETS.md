# Asset manifest and image production plan

Approved workflow (owner, 2026-11-18): **still images from ChatGPT, video from
kie.ai.** Final product photography and the final mark come from the physical
samples and a designer, per the rollout plan (Phases 6 and 18).

Everything on the site today is either real markup or rendered from the 3D
scene, so the art direction is already coherent. Nothing below is filler: each
item replaces a placeholder at a known path.

## 1. What exists now

| Asset | Path | Status | Made with |
|---|---|---|---|
| LiQ mark | `src/brand/mark.ts` + `glyphs.json` (every logo, favicon, garment print) | **Follows the owner's product boards**: serif L and Q (Bodoni Moda outlines), candlestick i, cobalt level through the letters. Still to be redrawn as final vector | `scripts/build-mark.mjs` |
| Garment models | `public/models/{signature-hoodie,heavyweight-tee,cap}{,-m}.glb` | **Placeholder sculpts**, desktop + phone LOD | `scripts/build-garments.mjs` |
| **Product photos** | `public/photos/<handle>-{front,back,angle}.{avif,webp}` 960×1200, `-detail-*.webp` | Cut from the owner's product boards (5 of 7 pieces) | `scripts/crop-boards.mjs` from `assets-src/boards/` |
| Cap renders | `public/renders/cap-{front,back,card}.{avif,webp}` | Stand-in until the cap board is re-uploaded | `npm run posters` |
| Homepage posters (no-WebGL fallback) | `public/renders/home-*.{avif,webp}` 1600×1000 | Rendered from the scene | `npm run posters` |
| Social images | `public/og/*.jpg` 1200×630 | Front + back photos per piece; homepage and cap from the scene | `crop-boards.mjs`, `npm run posters` |
| Icons | `public/favicon.ico`, `/icons/*.png`, `favicon.svg` (build) | From the strike icon | `npm run posters` |
| Fonts | Bodoni Moda, IBM Plex Mono (SIL Open Font License) | **Provisional choice**, the conversation named no faces | npm `@fontsource` |
| Palette | `src/styles/site.css` `:root` | **Provisional hex values** for black, graphite, bone, stone, cobalt | — |

Still missing as files: the Limited Atelier Jacket board and the Designer Cap
board (see `assets-src/README.md`). Until they arrive the jacket shows an
"images coming soon" placeholder and the cap shows its 3D render.

## 2. What is still needed

| # | Asset | Replaces | Spec | Where it appears | Tool / owner |
|---|---|---|---|---|---|
| 1 | **Final LiQ mark** | `src/brand/mark.ts` shapes | Vector (SVG + AI), letters and level as separate layers; colour standards in Pantone, CMYK, RGB, HEX | Header, hero, close, favicon, every garment print | Designer (Phase 6). Not AI. |
| 2 | **Colour standards** | `:root` tokens | Approved cobalt, graphite, bone, stone values from strike-offs | Whole site | Phase 12 strike-offs |
| 3 | **Garment 3D model, hoodie** | `public/models/signature-hoodie.glb` | Real sample, CLO3D export or photogrammetry. ≤ 1.5 MB desktop, ≤ 600 KB phone LOD, Y-up, metres, front facing +Z, centred, with UVs. Untextured is fine: prints are projected by the site | Homepage stage, product viewer | 3D artist from the PPS sample |
| 4 | Garment 3D models, tee and cap | `heavyweight-tee.glb`, `cap.glb` | Same spec | Product viewers, cards | Same |
| 5 | **Fabric maps** | Procedural knit in `src/three/garment.ts` | Tileable 1024² normal + roughness from a macro photo of the actual fleece swatch; WebP or KTX2 | Every 3D view | Macro photo of swatch |
| 6 | **Product photography** | Rendered cards and posters | Per product and colorway: front, back, side, 3 detail macros (silicone line, embroidery, woven label). 2400×3000 (4:5) PNG master on a near-black seamless; the build pipeline makes AVIF/WebP | Product pages, cards, bag, structured data | Photographer, real samples (Phase 18) |
| 7 | Editorial campaign stills | `public/og/og-default.jpg`, and future lookbook | See prompts below; 1536×1024 and 1024×1536 masters | Social sharing, future lookbook, pre-launch posts | **ChatGPT** now, real shoot later |
| 8 | Motion (optional) | Nothing on site yet | 5 s clips from approved stills, 1080p, no audio | Social pre-launch only; the site deliberately uses real-time 3D instead of video | **kie.ai** (`kie.mjs shot`), about 160 credits per clip at published rates |

## 3. ChatGPT image prompts

Paste the **style preamble exactly as written** at the start of every prompt.
Never paraphrase it: it is what makes separate images look like one shoot.
Generate, look, and regenerate anything off-brief. Upload approved images here
and they get optimised into AVIF/WebP and wired in.

**Rule for every prompt:** keep garments **plain**. Image generators cannot
draw the LiQ mark correctly. The real mark is applied from vector afterwards,
or the shot waits for real samples.

### Style preamble (copy verbatim)

```
Editorial fashion photograph for a premium apparel label. Near-black set lit by a single hard key light from above and slightly in front, soft falloff into darkness, faint low haze at floor level. Palette limited to black, graphite, bone and stone, with one restrained cobalt blue accent only where the scene asks for it. Medium format look, 80mm lens, f/5.6, fine natural film grain, true blacks that keep their detail. No text, no letters, no logos, no watermarks, no money, no cars, no jewellery, no crypto imagery, no glowing charts, no neon, no red or green colours.
```

### 01-campaign-back.png · Landscape 16:9, 1536×1024

```
[STYLE PREAMBLE]

A model stands with their back to the camera in an empty trading floor at night: long rows of dark, switched-off monitors receding into shadow. They wear an oversized heavyweight washed-black hoodie with a dropped shoulder, hood down, and the back of the hoodie is completely plain. The key light falls on their shoulders and the back panel. Composition leaves generous empty space to the right of the figure. Landscape 16:9.
```

### 02-fabric-line.png · Square 1:1, 1024×1024

```
[STYLE PREAMBLE]

Extreme macro of heavyweight washed-black cotton loopback fleece, the knit texture clearly visible, raked by the hard key light from the upper left. A single thin matte cobalt blue rubber line, about 4 mm wide, crosses the frame horizontally just below centre, slightly raised from the fabric. Nothing else in frame. Square 1:1.
```

### 03-lobby-front.png · Portrait 2:3, 1024×1536

```
[STYLE PREAMBLE]

A model sits on a low steel bench in an empty glass and concrete lobby at dusk, city lights soft and out of focus behind the glass. They wear an oversized heavyweight washed-black hoodie, front completely plain except for a tiny tonal mark area over the heart left blank, hood down, hands resting on knees, looking off camera with calm concentration. Portrait 2:3.
```

### 04-desk-sleeve.png · Landscape 16:9, 1536×1024

```
[STYLE PREAMBLE]

Close crop at a dark trading desk: a forearm in a heavyweight washed-black hoodie sleeve with a thick ribbed cuff rests beside a keyboard. Two monitors behind are out of focus and dim, showing only soft abstract grey shapes, no readable numbers. One thin cobalt reflection lies along the edge of the desk. Landscape 16:9.
```

### 05-bone-edition.png · Portrait 2:3, 1024×1536

```
[STYLE PREAMBLE]

A heavyweight hoodie in bone (warm off-white) hangs on an invisible form against a near-black backdrop, front view, hood down, kangaroo pocket, dropped shoulders, no drawcords, completely plain. The key light from above shapes its folds. Portrait 2:3.
```

### 06-social-preview.png · Landscape 1.91:1, 1536×804

```
[STYLE PREAMBLE]

A single heavyweight washed-black hoodie on an invisible form, seen from the back, centred, with a large calm area of darkness on the left third of the frame. The back is completely plain. Faint haze at the floor. Landscape.
```

After upload: approved stills replace `public/og/og-default.jpg` (06), feed a
lookbook section if one is added, and 02 can become the fabric-chapter poster.
The garment back graphic is composited onto 01 and 06 from the vector mark.

## 4. Optimisation rules (already in the pipeline)

- Masters stay in `lab/` (gitignored). Only optimised files ship.
- Stills: AVIF (libaom, crf 30) with WebP fallback via `<picture>`; JPEG only for Open Graph.
- Models: quantized GLB (`KHR_mesh_quantization`), phone LOD at roughly 40%.
- No video on the site. kie.ai clips, if made, are for social only, encoded with
  `.claude/skills/scroll-craft/scripts/encode.sh`, audio stripped.
