# 3D-Websites

Scroll-driven websites built with the **scroll-craft** skill
(`.claude/skills/scroll-craft/`). Builds live in `scrollcraft/builds/<name>/`;
the fingerprint registry is `scrollcraft/FINGERPRINTS.md`.

The owner is new to coding. Explain steps in plain language, and do installs
and setup for them rather than handing them commands to run.

## Asset pipeline (overrides scroll-craft Step 3 defaults)

**Images come from ChatGPT. Video comes from kie.ai.**

Do NOT use `kie.mjs still` to generate images. Instead:

1. Write each still prompt exactly as scroll-craft says: the one shared style
   preamble reused verbatim, then the scene. Give the owner one prompt per
   image, ready to paste into ChatGPT, with the aspect ratio stated in the
   prompt (e.g. "Landscape 16:9, 1536x1024") and a file name to save it under
   (e.g. `01-hero.png`). For hero layers that need transparency, ask ChatGPT
   for a transparent PNG background, and say so in the prompt.
2. The owner generates the images in ChatGPT and uploads them to the session.
   Save them into `scrollcraft/builds/<name>/out/` under the agreed names.
3. Look at every image before using it (the skill's "look at every asset"
   rule). Ask for a regenerate in ChatGPT when one is off-brief.
4. Turn approved stills into motion with kie.ai:
   `node .claude/skills/scroll-craft/scripts/kie.mjs shot "<camera move>" out/01-hero.png out/01.mp4 --dur 5`
   (and `--tail` for chained legs), then `encode.sh` as the skill describes.
   Each clip costs credits: say which clips you plan and why before running.

## Environment notes

- `.claude/settings.json` sets `SCROLLCRAFT_CHROME` to the preinstalled
  Chromium and a SessionStart hook reinstalls `playwright-core`.
- The kie.ai key is held by the cloud environment's network proxy (a network
  secret for `api.kie.ai` / `kieai.redpandaai.co`), never in the repo. The
  `KIE_AI_API_KEY` in settings is a placeholder the proxy replaces. Never
  commit a real key or a `.env`.
- Video files (`*.mp4`) are gitignored because they are large. Decide with
  the owner where finished clips are stored before a site ships.
