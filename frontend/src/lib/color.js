export function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

export function isValidHex6(value) {
  return /^#?[0-9a-fA-F]{6}$/.test(value);
}

export function normalizeHex(value) {
  const v = value[0] === '#' ? value : '#' + value;
  return v.toLowerCase();
}
