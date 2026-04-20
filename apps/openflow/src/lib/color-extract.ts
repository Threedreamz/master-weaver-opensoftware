// Client-only util: canvas-based image color sampling.
// DOM APIs (Image, canvas) are used inside the exported function only.

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
      case gn: h = (bn - rn) / d + 2; break;
      default: h = (rn - gn) / d + 4;
    }
    h /= 6;
  }
  return { h, s, l };
}

function luminance(r: number, g: number, b: number): number {
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

export async function extractColorsFromImage(
  dataUrl: string
): Promise<{ primary: string; background: string; text: string }> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Bild konnte nicht gelesen werden"));
    el.src = dataUrl;
  });

  const maxSize = 50;
  const ratio = img.width / img.height || 1;
  let w = img.width;
  let h = img.height;
  if (w > h) {
    w = Math.min(maxSize, w);
    h = Math.round(w / ratio);
  } else {
    h = Math.min(maxSize, h);
    w = Math.round(h * ratio);
  }
  w = Math.max(1, w);
  h = Math.max(1, h);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Bild konnte nicht gelesen werden");
  ctx.drawImage(img, 0, 0, w, h);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    throw new Error("Bild konnte nicht gelesen werden");
  }

  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 10) continue;
    const r = Math.round(data[i] / 16) * 16;
    const g = Math.round(data[i + 1] / 16) * 16;
    const b = Math.round(data[i + 2] / 16) * 16;
    const key = `${r},${g},${b}`;
    const existing = buckets.get(key);
    if (existing) existing.count++;
    else buckets.set(key, { r, g, b, count: 1 });
  }

  const top = [...buckets.values()].sort((a, b) => b.count - a.count).slice(0, 10);

  const vibrant = top.find((bk) => {
    const { s, l } = rgbToHsl(bk.r, bk.g, bk.b);
    return s > 0.25 && l >= 0.25 && l <= 0.75;
  });
  const primaryBucket = vibrant ?? top[0];
  const primary = primaryBucket
    ? rgbToHex(primaryBucket.r, primaryBucket.g, primaryBucket.b)
    : "#4f46e5";

  const bgBucket = top.find((bk) => {
    const { l } = rgbToHsl(bk.r, bk.g, bk.b);
    return l > 0.85 || l < 0.15;
  });
  const background = bgBucket ? rgbToHex(bgBucket.r, bgBucket.g, bgBucket.b) : "#ffffff";

  const bgRgb = bgBucket ?? { r: 255, g: 255, b: 255 };
  const text = luminance(bgRgb.r, bgRgb.g, bgRgb.b) > 0.5 ? "#111827" : "#f9fafb";

  return { primary, background, text };
}
