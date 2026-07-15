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

export const IMPORT_MAX_DIM = 1024;

export function imageToCappedRGBA(img, cap = IMPORT_MAX_DIM) {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const canvas = document.createElement('canvas');
  if (Math.max(srcW, srcH) > cap) {
    const s = cap / Math.max(srcW, srcH);
    canvas.width = Math.round(srcW * s);
    canvas.height = Math.round(srcH * s);
  } else {
    canvas.width = srcW;
    canvas.height = srcH;
  }
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { data, width: canvas.width, height: canvas.height };
}

export function rotateRGBA90CW(data, w, h) {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let sy = 0; sy < h; sy++) {
    for (let sx = 0; sx < w; sx++) {
      const dx = h - 1 - sy;
      const dy = sx;
      const si = (sy * w + sx) * 4;
      const di = (dy * h + dx) * 4;
      out[di] = data[si]; out[di + 1] = data[si + 1];
      out[di + 2] = data[si + 2]; out[di + 3] = data[si + 3];
    }
  }
  return { data: out, width: h, height: w };
}

export function extractRegionRGBA(data, srcW, x, y, w, h) {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let row = 0; row < h; row++) {
    const srcStart = ((y + row) * srcW + x) * 4;
    const destStart = row * w * 4;
    out.set(data.subarray(srcStart, srcStart + w * 4), destStart);
  }
  return out;
}

export function computeContainImageData(data, srcW, srcH, destW, destH) {
  const [fitW, fitH] = fitDimensions(srcW, srcH, destW, destH);
  const block = boxDownscaleRGBA(data, srcW, srcH, fitW, fitH);
  const out = new Uint8ClampedArray(destW * destH * 4);
  const offX = Math.floor((destW - fitW) / 2);
  const offY = Math.floor((destH - fitH) / 2);
  for (let y = 0; y < fitH; y++) {
    for (let x = 0; x < fitW; x++) {
      const si = (y * fitW + x) * 4;
      const di = ((y + offY) * destW + (x + offX)) * 4;
      out[di] = block[si]; out[di + 1] = block[si + 1];
      out[di + 2] = block[si + 2]; out[di + 3] = block[si + 3];
    }
  }
  return out;
}

export function computeCropImageData(data, srcW, x, y, w, h, destW, destH) {
  const region = extractRegionRGBA(data, srcW, x, y, w, h);
  return boxDownscaleRGBA(region, w, h, destW, destH);
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
