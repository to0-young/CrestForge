export function floodFill(imageData, x, y, w, h, rgb) {
  const data = imageData.data;
  function idx(px, py) { return (py * w + px) * 4; }
  const start = idx(x, y);
  const tr = data[start], tg = data[start + 1], tb = data[start + 2], ta = data[start + 3];
  const rr = rgb.r, rg = rgb.g, rb = rgb.b, ra = 255;
  if (tr === rr && tg === rg && tb === rb && ta === ra) return imageData;
  const stack = [[x, y]];
  const visited = new Uint8Array(w * h);
  while (stack.length) {
    const [px, py] = stack.pop();
    if (px < 0 || py < 0 || px >= w || py >= h) continue;
    const vi = py * w + px;
    if (visited[vi]) continue;
    const i = idx(px, py);
    if (data[i] !== tr || data[i + 1] !== tg || data[i + 2] !== tb || data[i + 3] !== ta) continue;
    visited[vi] = 1;
    data[i] = rr; data[i + 1] = rg; data[i + 2] = rb; data[i + 3] = ra;
    stack.push([px + 1, py]); stack.push([px - 1, py]); stack.push([px, py + 1]); stack.push([px, py - 1]);
  }
  return imageData;
}
