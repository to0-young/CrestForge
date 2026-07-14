export function loadImageFile(file, callback) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => callback(img);
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

export function fitDimensions(srcW, srcH, maxW, maxH) {
  const scaleFactor = Math.min(maxW / srcW, maxH / srcH);
  return [Math.max(1, Math.round(srcW * scaleFactor)), Math.max(1, Math.round(srcH * scaleFactor))];
}

export function boxDownscaleRGBA(data, srcW, srcH, destW, destH) {
  const out = new Uint8ClampedArray(destW * destH * 4);
  for (let dy = 0; dy < destH; dy++) {
    const sy0 = Math.floor(dy * srcH / destH), sy1 = Math.max(sy0 + 1, Math.floor((dy + 1) * srcH / destH));
    for (let dx = 0; dx < destW; dx++) {
      const sx0 = Math.floor(dx * srcW / destW), sx1 = Math.max(sx0 + 1, Math.floor((dx + 1) * srcW / destW));
      let sumRA = 0, sumGA = 0, sumBA = 0, sumA = 0, count = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const si = (sy * srcW + sx) * 4;
          const a = data[si + 3];
          sumRA += data[si] * a; sumGA += data[si + 1] * a; sumBA += data[si + 2] * a;
          sumA += a; count++;
        }
      }
      const di = (dy * destW + dx) * 4;
      if (sumA > 0) {
        out[di] = Math.round(sumRA / sumA);
        out[di + 1] = Math.round(sumGA / sumA);
        out[di + 2] = Math.round(sumBA / sumA);
      }
      out[di + 3] = Math.round(sumA / count);
    }
  }
  return out;
}
