# Source assets (not served)

Masters that the build pipeline turns into web images. Nothing here ships to
the public site directly.

## boards/

The owner's Drop 001 product boards (design concepts, 1122 × 1402), supplied
on 2026-11-18. **This is the approved direction for the website**: tonal
garments, the serif LiQ with a candlestick i, and cobalt as the only colour.

`node scripts/crop-boards.mjs` cuts each board into front, back and
three-quarter views (`public/photos/<handle>-{front,back,angle}`), the detail
close-ups (`public/photos/<handle>-detail-*`), and a social preview
(`public/og/<handle>.jpg`).

| Board | Product |
|---|---|
| `signature-hoodie.webp` | Signature Heavyweight Hoodie |
| `technical-zip-hoodie.webp` | Technical Zip Hoodie |
| `heavyweight-tee.webp` | Heavyweight Oversized Tee |
| `structured-sweatpants.webp` | Structured Sweatpants |
| `signature-knit-long-sleeve.webp` | Signature Knit Long Sleeve |

**Still needed** (sent in chat but not received as files; please re-upload):

- The light Limited Atelier Jacket board → `boards/limited-atelier-jacket.webp`
- The Designer Cap board (dark, red candles: the owner chose to show the cap as
  designed) → `boards/cap.webp`
- The dark red-candle concept boards, to keep as alternates → `concepts/`
  (reference only, never shown on the site)

## Notes on the boards

- The boards print **LiQ®**. The ® symbol may only be used once a trademark is
  actually registered; until then use **™**. The website uses ™.
- The boards are generated concepts, not photographs of samples. Replace them
  with real sample photography after the pre-production sample (rollout
  Phase 18) and re-run the crop script with new boxes, or drop finished photos
  straight into `public/photos/` with the same names.
