import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { checkApiAuth } from "@/lib/api-auth";
import { db } from "@/db";
import { flows, submissions } from "@/db/schema";

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDuration(startedAt: Date, completedAt: Date | null): string {
  if (!completedAt) return "";
  const diffMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");

    if (format !== "csv") {
      return NextResponse.json(
        { error: "Only format=csv is supported" },
        { status: 400 }
      );
    }

    // Get flow info for filename
    const flow = await db.query.flows.findFirst({
      where: eq(flows.id, id),
      columns: { name: true, slug: true },
    });

    if (!flow) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    }

    // Get all submissions for this flow
    const allSubmissions = await db.query.submissions.findMany({
      where: eq(submissions.flowId, id),
      orderBy: [submissions.startedAt],
    });

    if (allSubmissions.length === 0) {
      // Return empty CSV with just headers
      const csv = "ID,Status,Gestartet,Abgeschlossen,Dauer\n";
      const filename = `${flow.slug || flow.name}-submissions.csv`;
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // Collect all unique field keys from answers
    const fieldKeySet = new Set<string>();
    const parsedSubmissions = allSubmissions.map((sub) => {
      let answers: Record<string, unknown> = {};
      try {
        answers =
          typeof sub.answers === "string"
            ? JSON.parse(sub.answers)
            : (sub.answers as Record<string, unknown>) ?? {};
      } catch {
        answers = {};
      }
      for (const key of Object.keys(answers)) {
        fieldKeySet.add(key);
      }
      return { ...sub, parsedAnswers: answers };
    });

    const fieldKeys = Array.from(fieldKeySet).sort();

    // Build CSV header
    const headerCols = [
      "ID",
      "Status",
      "Gestartet",
      "Abgeschlossen",
      "Dauer",
      ...fieldKeys,
    ];
    const headerRow = headerCols.map(escapeCSV).join(",");

    // Build CSV rows
    const rows = parsedSubmissions.map((sub) => {
      const started = sub.startedAt
        ? new Date(sub.startedAt).toISOString()
        : "";
      const completed = sub.completedAt
        ? new Date(sub.completedAt).toISOString()
        : "";
      const duration = sub.startedAt
        ? formatDuration(new Date(sub.startedAt), sub.completedAt ? new Date(sub.completedAt) : null)
        : "";

      const baseCols = [
        sub.id,
        sub.status,
        started,
        completed,
        duration,
      ];

      const answerCols = fieldKeys.map((key) => {
        const val = sub.parsedAnswers[key];
        if (val === undefined || val === null) return "";
        if (typeof val === "object") return JSON.stringify(val);
        return String(val);
      });

      return [...baseCols, ...answerCols].map(escapeCSV).join(",");
    });

    const csv = [headerRow, ...rows].join("\n");
    const filename = `${flow.slug || flow.name}-submissions.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/flows/[id]/export]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
