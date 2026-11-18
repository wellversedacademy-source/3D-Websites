// The LiQ strike mark. PROVISIONAL.
//
// Built from the rules agreed in the brand conversation, not from a final
// vector: the letters are price-chart forms (L is an OHLC bar whose close tick
// is the foot, i is a filled candle with a doji for the dot, Q is a hollow
// candle), and the Q's lower wick pierces one horizontal liquidity level that
// runs on past the Q. Phase 6 of the rollout calls for the final mark to be
// professionally redrawn as vector artwork. When that exists, replace the
// shapes below and every logo, favicon and garment print on the site follows,
// because they are all generated from this one definition.

export type Shape = { x: number; y: number; w: number; h: number; r?: number };

export const MARK_VIEWBOX = { w: 300, h: 160 } as const;

/** Letterforms, drawn in ink (tonal on garments). */
export const LETTERS: Shape[] = [
  // L: open tick, stem, close tick as the foot
  { x: 14, y: 46, w: 22, h: 8 },
  { x: 36, y: 24, w: 12, h: 94 },
  { x: 48, y: 106, w: 38, h: 12 },
  // i: doji dot, upper wick, filled body
  { x: 103, y: 30, w: 18, h: 13 },
  { x: 110.5, y: 52, w: 3, h: 10 },
  { x: 103, y: 62, w: 18, h: 56 },
  // Q: upper wick (the hollow body is drawn separately)
  { x: 178.5, y: 14, w: 3, h: 20 },
];

/** Q body: a hollow candle, outer and inner rounded rectangles. */
export const Q_OUTER: Shape = { x: 140, y: 34, w: 80, h: 84, r: 14 };
export const Q_INNER: Shape = { x: 152, y: 46, w: 56, h: 60, r: 5 };

/** The liquidity level. Always the accent colour. */
export const LEVEL: Shape = { x: 0, y: 128, w: 300, h: 4 };

/** The Q's lower wick: the strike. Drawn over the level, in ink. */
export const STRIKE: Shape = { x: 198, y: 118, w: 6, h: 34 };

const rect = (s: Shape) =>
  `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}"${s.r ? ` rx="${s.r}"` : ''}/>`;

function roundRectPath(s: Shape): string {
  const r = s.r ?? 0;
  const { x, y, w, h } = s;
  return `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
}

/** Inline SVG markup for the full mark. Colours come from CSS by default. */
export function markSVG(
  opts: {
    ink?: string;
    level?: string;
    className?: string;
    title?: string;
    levelExtends?: boolean;
  } = {},
): string {
  const ink = opts.ink ?? 'currentColor';
  const level = opts.level ?? 'var(--accent)';
  const width = opts.levelExtends === false ? 228 : MARK_VIEWBOX.w;
  const lvl = { ...LEVEL, w: width };
  const label = opts.title ? `role="img" aria-label="${opts.title}"` : 'aria-hidden="true" focusable="false"';
  return (
    `<svg class="${opts.className ?? ''}" viewBox="0 0 ${width} ${MARK_VIEWBOX.h}" ${label} xmlns="http://www.w3.org/2000/svg">` +
    `<g fill="${ink}">${LETTERS.map(rect).join('')}` +
    `<path fill-rule="evenodd" d="${roundRectPath(Q_OUTER)}${roundRectPath(Q_INNER)}"/></g>` +
    `<g fill="${level}" class="mark-level">${rect(lvl)}</g>` +
    `<g fill="${ink}" class="mark-strike">${rect(STRIKE)}</g>` +
    `</svg>`
  );
}

/** The Q and its strike alone: favicon, cuff icon, loader. */
export function strikeIconSVG(ink = '#E8E3D7', level = '#3A63F2', bg?: string): string {
  const pad = 14;
  const x0 = Q_OUTER.x - pad;
  const w = Q_OUTER.w + pad * 2;
  const y0 = 14 - 4;
  const h = 152 - y0 + 4;
  const s = Math.max(w, h);
  const ox = x0 - (s - w) / 2;
  const oy = y0 - (s - h) / 2;
  const background = bg
    ? `<rect x="${ox}" y="${oy}" width="${s}" height="${s}" rx="${s * 0.18}" fill="${bg}"/>`
    : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ox} ${oy} ${s} ${s}">${background}` +
    `<g fill="${ink}">${rect(LETTERS[6])}<path fill-rule="evenodd" d="${roundRectPath(Q_OUTER)}${roundRectPath(Q_INNER)}"/></g>` +
    `<rect x="${ox}" y="${LEVEL.y}" width="${s}" height="${LEVEL.h}" fill="${level}"/>` +
    `<g fill="${ink}">${rect(STRIKE)}</g></svg>`
  );
}

/** Draw the mark into a 2D canvas context (garment prints, loader). */
export function drawMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  parts: { letters?: string | null; level?: string | null; strike?: string | null; levelWidth?: number },
): void {
  const k = width / 228;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  const fill = (s: Shape) => {
    ctx.beginPath();
    if (s.r) ctx.roundRect(s.x, s.y, s.w, s.h, s.r);
    else ctx.rect(s.x, s.y, s.w, s.h);
    ctx.fill();
  };
  if (parts.letters) {
    ctx.fillStyle = parts.letters;
    LETTERS.forEach(fill);
    ctx.beginPath();
    ctx.roundRect(Q_OUTER.x, Q_OUTER.y, Q_OUTER.w, Q_OUTER.h, Q_OUTER.r ?? 0);
    ctx.roundRect(Q_INNER.x, Q_INNER.y, Q_INNER.w, Q_INNER.h, Q_INNER.r ?? 0);
    ctx.fill('evenodd');
  }
  if (parts.level) {
    ctx.fillStyle = parts.level;
    fill({ ...LEVEL, w: parts.levelWidth ?? LEVEL.w });
  }
  if (parts.strike) {
    ctx.fillStyle = parts.strike;
    fill(STRIKE);
  }
  ctx.restore();
}
