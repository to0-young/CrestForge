export function buildColorHistogram(rgba, w, h) {
  const map = new Map();
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    const key = (rgba[o] << 16) | (rgba[o + 1] << 8) | rgba[o + 2];
    const entry = map.get(key);
    if (entry) entry.count++;
    else map.set(key, { r: rgba[o], g: rgba[o + 1], b: rgba[o + 2], count: 1 });
  }
  return Array.from(map.values());
}

export function medianCutQuantize(colorCounts, maxColors) {
  if (colorCounts.length <= maxColors) {
    return colorCounts.map((c) => [c.r, c.g, c.b]);
  }
  let boxes = [colorCounts.slice()];

  function boxChannelRange(box) {
    let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
    for (let i = 0; i < box.length; i++) {
      const c = box[i];
      if (c.r < minR) minR = c.r; if (c.r > maxR) maxR = c.r;
      if (c.g < minG) minG = c.g; if (c.g > maxG) maxG = c.g;
      if (c.b < minB) minB = c.b; if (c.b > maxB) maxB = c.b;
    }
    const rr = maxR - minR, rg = maxG - minG, rb = maxB - minB;
    const channel = (rr >= rg && rr >= rb) ? 'r' : (rg >= rb ? 'g' : 'b');
    return { range: Math.max(rr, rg, rb), channel };
  }

  while (boxes.length < maxColors) {
    let bestIdx = -1, bestRange = -1, bestInfo = null;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length <= 1) continue;
      const info = boxChannelRange(boxes[i]);
      if (info.range > bestRange) { bestRange = info.range; bestIdx = i; bestInfo = info; }
    }
    if (bestIdx === -1) break;

    const box = boxes[bestIdx];
    const ch = bestInfo.channel;
    box.sort((a, b) => a[ch] - b[ch]);

    let total = 0;
    for (let j = 0; j < box.length; j++) total += box[j].count;
    const half = total / 2;
    let acc = 0, splitAt = box.length - 1;
    for (let k = 0; k < box.length; k++) { acc += box[k].count; if (acc >= half) { splitAt = k; break; } }

    let boxA = box.slice(0, splitAt + 1);
    let boxB = box.slice(splitAt + 1);
    if (!boxB.length) { boxA = box.slice(0, box.length - 1); boxB = [box[box.length - 1]]; }
    boxes.splice(bestIdx, 1, boxA, boxB);
  }

  return boxes.map((box) => {
    let total = 0, sr = 0, sg = 0, sb = 0;
    for (let i = 0; i < box.length; i++) { const c = box[i]; sr += c.r * c.count; sg += c.g * c.count; sb += c.b * c.count; total += c.count; }
    return [Math.round(sr / total), Math.round(sg / total), Math.round(sb / total)];
  });
}

export function nearestPaletteIndex(r, g, b, palette) {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const dr = r - palette[i][0], dg = g - palette[i][1], db = b - palette[i][2];
    const d = dr * dr + dg * dg + db * db;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}
