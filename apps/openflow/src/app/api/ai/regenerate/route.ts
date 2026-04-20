import { NextRequest, NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/api-auth";
import { callClaudeCli } from "@/lib/claude-cli";
import { getFlowById, updateFlow } from "@/db/queries/flows";
import { buildFlowInDb, type GeneratedStep } from "@/lib/ai-flow-builder";
import { buildGeneratePrompt, type GenerateBriefing } from "../generate/route";

export async function POST(request: NextRequest) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const body = await request.json();
    const flowId: string | undefined = body.flowId;
    const plan: string | undefined = typeof body.plan === "string" ? body.plan.trim() : undefined;
    const briefing: GenerateBriefing | undefined = body.briefing;

    if (!flowId) {
      return NextResponse.json({ error: "flowId is required" }, { status: 400 });
    }
    if (!plan) {
      return NextResponse.json({ error: "plan is required" }, { status: 400 });
    }
    if (!briefing?.goal) {
      return NextResponse.json({ error: "briefing.goal is required" }, { status: 400 });
    }

    const flow = await getFlowById(flowId);
    if (!flow) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    }

    const prompt = buildGeneratePrompt(briefing, plan);

    let text: string;
    try {
      text = (await callClaudeCli(prompt)).trim();
    } catch (err) {
      console.error("[POST /api/ai/regenerate] Claude CLI failed:", err);
      return NextResponse.json({ error: "AI nicht verfügbar" }, { status: 503 });
    }

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI-Antwort konnte nicht geparst werden" }, { status: 502 });
    }

    let generatedSteps: GeneratedStep[];
    try {
      generatedSteps = JSON.parse(jsonMatch[0]) as GeneratedStep[];
    } catch (err) {
      console.error("[POST /api/ai/regenerate] JSON parse error:", err);
      return NextResponse.json({ error: "AI-Antwort konnte nicht geparst werden" }, { status: 502 });
    }

    const { stepCount } = await buildFlowInDb({
      flowId,
      generatedSteps,
      clearExisting: true,
    });

    await updateFlow(flowId, {
      aiPlan: plan,
      aiBriefing: JSON.stringify(briefing),
    });

    return NextResponse.json({
      flowId,
      steps: stepCount,
      aiUsed: true,
    });
  } catch (error) {
    console.error("[POST /api/ai/regenerate]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
