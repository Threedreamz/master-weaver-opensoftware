import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { getFlows } from "@/db/queries/flows";
import { db } from "@/db";
import { flowSteps, submissions, flowEdits, flows } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { format } from "date-fns";
import { DeleteFlowButton } from "./DeleteFlowButton";
import { FlowActions } from "./FlowActions";
import { FlowPreview } from "./FlowPreview";

interface FlowsPageProps {
  params: Promise<{ locale: string }>;
}

interface FlowActivity {
  lastEditor: { name: string; avatar: string | null };
  contributors: { userId: string; userName: string; userAvatar: string | null }[];
  lastEditedAt: Date | null;
  editCount: number;
}

function relativeTime(date: Date | null): string {
  if (!date) return "-";
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "gerade eben";
  if (diffMinutes < 60) return `vor ${diffMinutes} Minuten`;
  if (diffHours < 24) return `vor ${diffHours} Stunden`;
  return `vor ${diffDays} Tagen`;
}

function AvatarCircle({ name }: { name: string }) {
  const initial = (name ?? "?").charAt(0).toUpperCase();
  return (
    <span
      className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold inline-flex items-center justify-center flex-shrink-0"
      title={name}
    >
      {initial}
    </span>
  );
}

export default async function FlowsPage({ params }: FlowsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const flowsList = await getFlows({ limit: 100 });

  // Fetch step counts, submission counts, and edits in parallel
  const [stepCounts, submissionCounts, allEdits] = await Promise.all([
    db
      .select({ flowId: flowSteps.flowId, count: sql<number>`count(*)` })
      .from(flowSteps)
      .groupBy(flowSteps.flowId),
    db
      .select({ flowId: submissions.flowId, count: sql<number>`count(*)` })
      .from(submissions)
      .groupBy(submissions.flowId),
    db
      .select({
        flowId: flowEdits.flowId,
        userId: flowEdits.userId,
        userName: flowEdits.userName,
        userAvatar: flowEdits.userAvatar,
        createdAt: flowEdits.createdAt,
      })
      .from(flowEdits)
      .orderBy(desc(flowEdits.createdAt)),
  ]);

  const stepCountMap = new Map(stepCounts.map((r) => [r.flowId, r.count]));
  const submissionCountMap = new Map(submissionCounts.map((r) => [r.flowId, r.count]));

  // Build activity map per flow
  const activityMap = new Map<string, FlowActivity>();
  for (const edit of allEdits) {
    if (!activityMap.has(edit.flowId)) {
      activityMap.set(edit.flowId, {
        lastEditor: { name: edit.userName ?? "Unbekannt", avatar: edit.userAvatar },
        contributors: [],
        lastEditedAt: edit.createdAt,
        editCount: 0,
      });
    }
    const entry = activityMap.get(edit.flowId)!;
    entry.editCount++;
    if (!entry.contributors.some((c) => c.userId === edit.userId)) {
      entry.contributors.push({
        userId: edit.userId,
        userName: edit.userName ?? "Unbekannt",
        userAvatar: edit.userAvatar,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flows</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your multi-step flows
          </p>
        </div>
        <Link
          href={`/${locale}/admin/flows/new`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <span>+</span>
          New Flow
        </Link>
      </div>

      {flowsList.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-indigo-600 text-xl">✦</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">No flows yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Create your first multi-step flow to get started.
          </p>
          <Link
            href={`/${locale}/admin/flows/new`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Create Flow
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 font-medium text-gray-600">
                  Name
                </th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">
                  Status
                </th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">
                  Steps
                </th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">
                  Submissions
                </th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">
                  Zuletzt bearbeitet von
                </th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">
                  Letzte Änderung
                </th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">
                  Mitwirkende
                </th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">
                  Created
                </th>
                <th className="text-right px-6 py-3 font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {flowsList.map((flow) => {
                const activity = activityMap.get(flow.id);
                return (
                  <tr key={flow.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/${locale}/flow/${flow.id}/build`}
                        className="font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                      >
                        {flow.name}
                      </Link>
                      <p className="text-xs text-gray-400 mt-0.5">/{flow.slug}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          flow.status === "published"
                            ? "bg-green-100 text-green-700"
                            : flow.status === "archived"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {flow.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {stepCountMap.get(flow.id) ?? 0}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {submissionCountMap.get(flow.id) ?? 0}
                    </td>
                    <td className="px-6 py-4">
                      {activity ? (
                        <div className="flex items-center gap-2">
                          <AvatarCircle name={activity.lastEditor.name} />
                          <span className="text-xs text-gray-600 truncate max-w-[100px]">
                            {activity.lastEditor.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-500">
                        {activity ? relativeTime(activity.lastEditedAt) : "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {activity && activity.contributors.length > 0 ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700"
                          title={activity.contributors.map((c) => c.userName).join(", ")}
                        >
                          {activity.contributors.length} Mitwirkende
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {format(new Date(flow.createdAt), "dd MMM yyyy")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/${locale}/flow/${flow.id}/build`}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Edit
                        </Link>
                        <DeleteFlowButton flowId={flow.id} flowStatus={flow.status} />
                        <FlowActions flowId={flow.id} flowStatus={flow.status} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
