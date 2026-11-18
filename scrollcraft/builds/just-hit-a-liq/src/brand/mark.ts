// The LiQ mark, following the owner's Drop 001 product boards: a serif L and
// Q, the i drawn as a candlestick, and one cobalt liquidity level running
// through the letters and on past the Q.
//
// The L and Q outlines come from Bodoni Moda (scripts/build-mark.mjs writes
// glyphs.json), so every logo, favicon and garment print is generated from
// this one file. PROVISIONAL until the professionally redrawn vector exists
// (rollout Phase 6); replace the shapes here and everything follows.

import glyphs from './glyphs.json' with { type: 'json' };

export type Shape = { x: number; y: number; w: number; h: number; r?: number };

export const MARK_VIEWBOX = { w: 300, h: 172 } as const;
export const L_PATH = glyphs.L.d;
export const Q_PATH = glyphs.Q.d;

/** The candlestick i: a thin wick and a filled body. */
export const WICK: Shape = { x: 119, y: 2, w: 2.6, h: 150 };
export const BODY: Shape = { x: 112.3, y: 50, w: 16, h: 58 };
/** The liquidity level, through the letters. Always the accent colour. */
export const LEVEL: Shape = { x: 0, y: 78, w: 300, h: 3.4 };

const rect = (s: Shape) => `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}"/>`;

/** Inline SVG markup for the full mark. Ink comes from CSS by default. */
export function markSVG(
  opts: { ink?: string; level?: string; className?: string; title?: string; levelExtends?: boolean } = {},
): string {
  const ink = opts.ink ?? 'currentColor';
  const level = opts.level ?? 'var(--accent)';
  const width = opts.levelExtends === false ? glyphs.Q.x2 + 4 : MARK_VIEWBOX.w;
  const label = opts.title ? `role="img" aria-label="${opts.title}"` : 'aria-hidden="true" focusable="false"';
  return (
    `<svg class="${opts.className ?? ''}" viewBox="0 0 ${width} ${MARK_VIEWBOX.h}" ${label} xmlns="http://www.w3.org/2000/svg">` +
    `<g fill="${ink}"><path d="${L_PATH}"/><path d="${Q_PATH}"/>${rect(WICK)}${rect(BODY)}</g>` +
    `<g fill="${level}" class="mark-level">${rect({ ...LEVEL, w: width })}</g>` +
    `</svg>`
  );
}

/** The Q crossed by the level: chest embroidery, cuff, favicon. */
export function strikeIconSVG(ink = '#E8E3D7', level = '#3A63F2', bg?: string): string {
  const q = glyphs.Q;
  const pad = 18;
  const s = Math.max(q.x2 - q.x1, q.y2 - q.y1) + pad * 2;
  const ox = (q.x1 + q.x2) / 2 - s / 2;
  const oy = (q.y1 + q.y2) / 2 - s / 2;
  const background = bg
    ? `<rect x="${ox}" y="${oy}" width="${s}" height="${s}" rx="${s * 0.18}" fill="${bg}"/>`
    : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ox} ${oy} ${s} ${s}">${background}` +
    `<path fill="${ink}" d="${Q_PATH}"/>` +
    `<rect x="${ox + pad * 0.4}" y="${LEVEL.y}" width="${s - pad * 0.8}" height="${LEVEL.h + 1.6}" fill="${level}"/></svg>`
  );
}

/** Draw the mark into a 2D canvas (garment prints). Width is the 300-unit mark width. */
export function drawMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  parts: { letters?: string | null; level?: string | null; levelWidth?: number; qOnly?: boolean },
): void {
  const k = width / MARK_VIEWBOX.w;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  if (parts.letters) {
    ctx.fillStyle = parts.letters;
    if (!parts.qOnly) {
      ctx.fill(new Path2D(L_PATH));
      ctx.fillRect(WICK.x, WICK.y, WICK.w, WICK.h);
      ctx.fillRect(BODY.x, BODY.y, BODY.w, BODY.h);
    }
    ctx.fill(new Path2D(Q_PATH));
  }
  if (parts.level) {
    ctx.fillStyle = parts.level;
    ctx.fillRect(LEVEL.x, LEVEL.y, parts.levelWidth ?? LEVEL.w, LEVEL.h);
  }
  ctx.restore();
}

export const Q_BOUNDS = { x1: glyphs.Q.x1, x2: glyphs.Q.x2, y1: glyphs.Q.y1, y2: glyphs.Q.y2 };
