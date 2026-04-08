import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { flowEdits, flows } from "@/db/schema";
import { checkApiAuth } from "@/lib/api-auth";
import { desc, eq, sql } from "drizzle-orm";

export async function GET() {
  const authError = await checkApiAuth();
  if (authError) return authError;

  try {
    // Get all flow edits joined with flow names
    const allEdits = await db
      .select({
        id: flowEdits.id,
        flowId: flowEdits.flowId,
        flowName: flows.name,
        userId: flowEdits.userId,
        userName: flowEdits.userName,
        userAvatar: flowEdits.userAvatar,
        action: flowEdits.action,
        summary: flowEdits.summary,
        createdAt: flowEdits.createdAt,
      })
      .from(flowEdits)
      .innerJoin(flows, eq(flowEdits.flowId, flows.id))
      .orderBy(desc(flowEdits.createdAt));

    // Group by flow
    const flowMap = new Map<
      string,
      {
        flowId: string;
        flowName: string;
        lastEditor: { name: string; avatar: string | null };
        contributors: { userId: string; userName: string; userAvatar: string | null }[];
        lastEditedAt: Date | null;
        editCount: number;
      }
    >();

    for (const edit of allEdits) {
      if (!flowMap.has(edit.flowId)) {
        flowMap.set(edit.flowId, {
          flowId: edit.flowId,
          flowName: edit.flowName,
          lastEditor: { name: edit.userName ?? "Unbekannt", avatar: edit.userAvatar },
          contributors: [],
          lastEditedAt: edit.createdAt,
          editCount: 0,
        });
      }

      const entry = flowMap.get(edit.flowId)!;
      entry.editCount++;

      // Add unique contributors
      if (!entry.contributors.some((c) => c.userId === edit.userId)) {
        entry.contributors.push({
          userId: edit.userId,
          userName: edit.userName ?? "Unbekannt",
          userAvatar: edit.userAvatar,
        });
      }
    }

    // Recent edits (last 10 globally)
    const recentEdits = allEdits.slice(0, 10).map((edit) => ({
      id: edit.id,
      flowId: edit.flowId,
      flowName: edit.flowName,
      userId: edit.userId,
      userName: edit.userName ?? "Unbekannt",
      userAvatar: edit.userAvatar,
      action: edit.action,
      summary: edit.summary,
      createdAt: edit.createdAt,
    }));

    return NextResponse.json({
      flowActivity: Array.from(flowMap.values()),
      recentEdits,
    });
  } catch (error) {
    console.error("Failed to fetch flow activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch flow activity" },
      { status: 500 }
    );
  }
}
