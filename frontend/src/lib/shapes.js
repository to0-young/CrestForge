export function linePixels(x0, y0, x1, y1) {
  const pts = [];
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    pts.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return pts;
}

export function rectPixels(x0, y0, x1, y1, filled) {
  const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);
  const pts = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (filled || x === minX || x === maxX || y === minY || y === maxY) pts.push([x, y]);
    }
  }
  return pts;
}

export function circlePixels(x0, y0, x1, y1, filled) {
  const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const rx = Math.max((maxX - minX) / 2, 0.5), ry = Math.max((maxY - minY) / 2, 0.5);
  const ring = Math.max(1 / rx, 1 / ry) * 1.4;
  const pts = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const nx = (x + 0.5 - cx - 0.5) / rx, ny = (y + 0.5 - cy - 0.5) / ry;
      const d = nx * nx + ny * ny;
      if (filled) { if (d <= 1) pts.push([x, y]); }
      else if (d <= 1 && d > (1 - ring) * (1 - ring)) pts.push([x, y]);
    }
  }
  return pts;
}
