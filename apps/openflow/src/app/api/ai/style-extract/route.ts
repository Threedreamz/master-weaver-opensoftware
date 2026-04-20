import { NextRequest, NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/api-auth";

function luminance(r: number, g: number, b: number): number {
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

function hexToRgb(hex: string): [number, number, number] | null {
  let h = hex.replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  if (isNaN(n)) return null;
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function normalizeHex(raw: string): string | null {
  let h = raw.trim().toLowerCase().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length === 8) h = h.slice(0, 6);
  if (h.length !== 6) return null;
  if (!/^[0-9a-f]{6}$/.test(h)) return null;
  return "#" + h;
}

export async function POST(req: NextRequest) {
  const authError = await checkApiAuth();
  if (authError) return authError;

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url = body.url?.trim() ?? "";
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "URL must start with http:// or https://" }, { status: 400 });
  }

  let html: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (OpenFlow Style Extractor)",
        Accept: "text/html",
      },
    });
    clearTimeout(timeout);
    html = await res.text();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fetch fehlgeschlagen" },
      { status: 503 }
    );
  }

  // 1) theme-color meta
  const themeMatch = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["'](#[0-9a-fA-F]{3,8})["']/i);
  const themeColor = themeMatch ? normalizeHex(themeMatch[1]) : null;

  // 2) Collect all 6-digit hex colors with frequency
  const hexMatches = html.match(/#[0-9a-fA-F]{6}\b/g) ?? [];
  const freq = new Map<string, number>();
  for (const raw of hexMatches) {
    const h = normalizeHex(raw);
    if (!h) continue;
    freq.set(h, (freq.get(h) ?? 0) + 1);
  }
  const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1]);

  const isNeutral = (hex: string) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return true;
    const l = luminance(rgb[0], rgb[1], rgb[2]);
    return l > 0.92 || l < 0.03;
  };

  // 3) Background candidate
  const bgStyleMatch = html.match(/background(?:-color)?:\s*(#[0-9a-fA-F]{6})/i);
  let backgroundColor = bgStyleMatch ? normalizeHex(bgStyleMatch[1]) : null;
  if (!backgroundColor) {
    const lightHit = ranked.find(([h]) => {
      const rgb = hexToRgb(h);
      return rgb && luminance(rgb[0], rgb[1], rgb[2]) > 0.85;
    });
    backgroundColor = lightHit?.[0] ?? "#ffffff";
  }

  // 4) Primary
  let primaryColor: string;
  if (themeColor) {
    primaryColor = themeColor;
  } else {
    const nonNeutral = ranked.find(([h]) => !isNeutral(h));
    primaryColor = nonNeutral?.[0] ?? "#4f46e5";
  }

  // 5) Text color based on background luminance
  const bgRgb = hexToRgb(backgroundColor) ?? [255, 255, 255];
  const bgLum = luminance(bgRgb[0], bgRgb[1], bgRgb[2]);
  const textColor = bgLum > 0.5 ? "#111827" : "#f9fafb";

  // 6) border-radius median
  const radiusMatches = [...html.matchAll(/border-radius:\s*(\d+(?:\.\d+)?)(px|rem|em)/gi)];
  let borderRadius = "0.75rem";
  if (radiusMatches.length > 0) {
    const byUnit = new Map<string, number[]>();
    for (const m of radiusMatches) {
      const u = m[2].toLowerCase();
      const v = parseFloat(m[1]);
      if (!byUnit.has(u)) byUnit.set(u, []);
      byUnit.get(u)!.push(v);
    }
    const [unit, values] = [...byUnit.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    values.sort((a, b) => a - b);
    const mid = values[Math.floor(values.length / 2)];
    borderRadius = `${mid}${unit}`;
  }

  return NextResponse.json({ primaryColor, backgroundColor, textColor, borderRadius });
}
