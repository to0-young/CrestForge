import { boxDownscaleRGBA } from './imageImport.js';
import { buildColorHistogram, medianCutQuantize, nearestPaletteIndex } from './quantize.js';
import { encodeBMP8 } from './bmp.js';

export function flattenToOpaque(imageData, bgRgb) {
  const src = imageData.data;
  const out = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const a = src[i + 3] / 255;
    out[i] = Math.round(src[i] * a + bgRgb.r * (1 - a));
    out[i + 1] = Math.round(src[i + 1] * a + bgRgb.g * (1 - a));
    out[i + 2] = Math.round(src[i + 2] * a + bgRgb.b * (1 - a));
    out[i + 3] = 255;
  }
  return out;
}

export function exportCrestBmp(imageData, cw, ch, destW, destH, bgRgb) {
  const flat = flattenToOpaque(imageData, bgRgb);
  let pixelData = flat, pw = cw, ph = ch;
  if (destW !== cw || destH !== ch) {
    pixelData = boxDownscaleRGBA(flat, cw, ch, destW, destH);
    pw = destW; ph = destH;
  }
  const hist = buildColorHistogram(pixelData, pw, ph);
  const palette = medianCutQuantize(hist, 256);
  const indices = new Uint8Array(pw * ph);
  for (let i = 0; i < pw * ph; i++) {
    const o = i * 4;
    indices[i] = nearestPaletteIndex(pixelData[o], pixelData[o + 1], pixelData[o + 2], palette);
  }
  return { blob: encodeBMP8(pw, ph, indices, palette), width: pw, height: ph, colorCount: palette.length };
}
