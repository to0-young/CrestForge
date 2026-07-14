export function encodeBMP8(width, height, indices, palette) {
  const PALETTE_ENTRIES = 256;
  const rowSize = Math.ceil(width / 4) * 4;
  const pixelArraySize = rowSize * height;
  const paletteBytes = PALETTE_ENTRIES * 4;
  const dataOffset = 14 + 40 + paletteBytes;
  const fileSize = dataOffset + pixelArraySize;

  const buf = new ArrayBuffer(fileSize);
  const view = new DataView(buf);
  const u8 = new Uint8Array(buf);

  u8[0] = 0x42; u8[1] = 0x4D;
  view.setUint32(2, fileSize, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint32(10, dataOffset, true);

  let o = 14;
  view.setUint32(o, 40, true); o += 4;
  view.setInt32(o, width, true); o += 4;
  view.setInt32(o, height, true); o += 4;
  view.setUint16(o, 1, true); o += 2;
  view.setUint16(o, 8, true); o += 2;
  view.setUint32(o, 0, true); o += 4;
  view.setUint32(o, pixelArraySize, true); o += 4;
  view.setInt32(o, 2835, true); o += 4;
  view.setInt32(o, 2835, true); o += 4;
  view.setUint32(o, PALETTE_ENTRIES, true); o += 4;
  view.setUint32(o, 0, true);

  for (let i = 0; i < PALETTE_ENTRIES; i++) {
    const c = palette[i] || [0, 0, 0];
    const off = 54 + i * 4;
    u8[off] = c[2]; u8[off + 1] = c[1]; u8[off + 2] = c[0]; u8[off + 3] = 0;
  }

  for (let row = 0; row < height; row++) {
    const srcRow = height - 1 - row;
    const destOff = dataOffset + row * rowSize;
    for (let x = 0; x < width; x++) {
      u8[destOff + x] = indices[srcRow * width + x];
    }
  }

  return new Blob([u8], { type: 'image/bmp' });
}
