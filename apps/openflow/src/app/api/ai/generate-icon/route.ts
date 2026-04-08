import { NextRequest, NextResponse } from "next/server";
import { checkApiAuth, getAuthUser } from "@/lib/api-auth";
import { createAsset } from "@/db/queries/collaboration";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// ─── Fallback icon generation (no API key needed) ────────────────────────────

function generateFallbackIcon(
  prompt: string,
  style: "outline" | "filled" | "minimal" | "rounded",
  size: number,
  color: string
): string {
  const lowerPrompt = prompt.toLowerCase();

  const strokeAttrs =
    style === "filled"
      ? `fill="${color}" stroke="none"`
      : `stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"`;

  let paths = "";

  if (lowerPrompt.includes("pfeil") || lowerPrompt.includes("arrow")) {
    paths =
      style === "filled"
        ? `<path d="M12 2l7 10H5z" /><rect x="9" y="12" width="6" height="10" />`
        : `<line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />`;
  } else if (lowerPrompt.includes("stern") || lowerPrompt.includes("star")) {
    paths =
      style === "filled"
        ? `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />`
        : `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />`;
  } else if (lowerPrompt.includes("herz") || lowerPrompt.includes("heart")) {
    paths = `<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />`;
  } else if (
    lowerPrompt.includes("haus") ||
    lowerPrompt.includes("home") ||
    lowerPrompt.includes("house")
  ) {
    paths =
      style === "filled"
        ? `<path d="M3 12l9-9 9 9" /><path d="M5 10v10h14V10" /><rect x="9" y="14" width="6" height="6" />`
        : `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />`;
  } else if (
    lowerPrompt.includes("person") ||
    lowerPrompt.includes("user") ||
    lowerPrompt.includes("mensch")
  ) {
    paths =
      style === "filled"
        ? `<circle cx="12" cy="7" r="4" /><path d="M5.5 21a6.5 6.5 0 0 1 13 0" />`
        : `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />`;
  } else if (lowerPrompt.includes("mail") || lowerPrompt.includes("email") || lowerPrompt.includes("brief")) {
    paths =
      style === "filled"
        ? `<rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="22 4 12 13 2 4" />`
        : `<rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="22 6 12 13 2 6" />`;
  } else if (lowerPrompt.includes("check") || lowerPrompt.includes("haken") || lowerPrompt.includes("ok")) {
    paths =
      style === "filled"
        ? `<circle cx="12" cy="12" r="10" /><polyline points="9 12 11.5 14.5 16 9.5" stroke="white" stroke-width="2" fill="none" />`
        : `<polyline points="20 6 9 17 4 12" />`;
  } else if (lowerPrompt.includes("such") || lowerPrompt.includes("search") || lowerPrompt.includes("lupe")) {
    paths =
      style === "filled"
        ? `<circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" stroke="${color}" stroke-width="2" />`
        : `<circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />`;
  } else if (lowerPrompt.includes("zahnrad") || lowerPrompt.includes("settings") || lowerPrompt.includes("gear")) {
    paths = `<circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />`;
  } else {
    // Default: abstract geometric shape (circle + lines)
    paths =
      style === "filled"
        ? `<circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" fill="white" />`
        : `<circle cx="12" cy="12" r="8" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="12" x2="15" y2="15" /><circle cx="12" cy="12" r="2" />`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" ${strokeAttrs}>${paths}</svg>`;
}

// ─── POST handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const user = await getAuthUser();
    const body = await request.json();

    const prompt: string = body.prompt;
    const style: "outline" | "filled" | "minimal" | "rounded" = body.style ?? "outline";
    const size: number = body.size ?? 64;
    const color: string = body.color ?? "#4C5FD5";

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    if (![64, 128, 256].includes(size)) {
      return NextResponse.json({ error: "size must be 64, 128, or 256" }, { status: 400 });
    }

    let svgContent: string;
    let aiUsed = false;

    // ── Try Anthropic AI generation ──────────────────────────────────────────
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      try {
        const Anthropic = (await import("@anthropic-ai/sdk")).default;
        const client = new Anthropic({ apiKey });

        const message = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: `Create a simple, clean SVG icon for: "${prompt}".
Style: ${style}. Size: ${size}x${size}px. Color: ${color}.
Requirements:
- Return ONLY the SVG code, no explanation
- Use viewBox="0 0 24 24"
- Use stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" for outline style
- Use fill="${color}" for filled style
- Keep it simple and recognizable, like lucide icons
- No text elements
- The SVG must be valid and self-contained`,
            },
          ],
        });

        const content = message.content[0];
        if (content.type === "text") {
          const text = content.text.trim();
          // Extract SVG from the response
          const svgMatch = text.match(/<svg[\s\S]*<\/svg>/i);
          if (svgMatch) {
            svgContent = svgMatch[0];
            aiUsed = true;
          } else {
            // Fallback if AI didn't return valid SVG
            svgContent = generateFallbackIcon(prompt, style, size, color);
          }
        } else {
          svgContent = generateFallbackIcon(prompt, style, size, color);
        }
      } catch (err) {
        console.error("[AI generate-icon] Anthropic error, using fallback:", err);
        svgContent = generateFallbackIcon(prompt, style, size, color);
      }
    } else {
      // ── Fallback: generate geometric SVG ─────────────────────────────────
      svgContent = generateFallbackIcon(prompt, style, size, color);
    }

    // ── Validate SVG content ─────────────────────────────────────────────────
    if (!svgContent.trim().startsWith("<svg")) {
      svgContent = generateFallbackIcon(prompt, style, size, color);
    }

    // ── Save SVG file to public/uploads ──────────────────────────────────────
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const fileName = `ai-icon-${Date.now()}.svg`;
    await writeFile(path.join(uploadsDir, fileName), svgContent);
    const url = `/uploads/${fileName}`;

    // ── Create asset record ──────────────────────────────────────────────────
    const asset = await createAsset({
      name: `AI: ${prompt.slice(0, 50)}`,
      url,
      type: "icon",
      mimeType: "image/svg+xml",
      uploadedBy: user.id,
    });

    return NextResponse.json(
      {
        url,
        assetId: asset.id,
        svgContent,
        name: asset.name,
        aiUsed,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/ai/generate-icon]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
