import { setRequestLocale } from "next-intl/server";
import { getFlows } from "@/db/queries/flows";
import { db } from "@/db";
import { submissions, flowEdits, flows } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

interface AdminDashboardProps {
  params: Promise<{ locale: string }>;
}

interface FlowActivity {
  flowId: string;
  lastEditor: { name: string; avatar: string | null };
  contributors: { userId: string; userName: string; userAvatar: string | null }[];
  lastEditedAt: Date | null;
  editCount: number;
}

interface RecentEdit {
  id: string;
  flowId: string;
  flowName: string;
  userName: string;
  userAvatar: string | null;
  action: string;
  summary: string | null;
  createdAt: Date;
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

function actionLabel(action: string): string {
  switch (action) {
    case "created": return "hat erstellt";
    case "edited": return "hat bearbeitet";
    case "published": return "hat veröffentlicht";
    case "reviewed": return "hat geprüft";
    case "deleted": return "hat gelöscht";
    case "settings_changed": return "hat Einstellungen geändert";
    default: return "hat bearbeitet";
  }
}

function AvatarCircle({ name, size = "w-6 h-6" }: { name: string; size?: string }) {
  const initial = (name ?? "?").charAt(0).toUpperCase();
  return (
    <span
      className={`${size} rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold inline-flex items-center justify-center flex-shrink-0`}
      title={name}
    >
      {initial}
    </span>
  );
}

function ContributorStack({
  contributors,
}: {
  contributors: { userId: string; userName: string; userAvatar: string | null }[];
}) {
  const maxShow = 3;
  const shown = contributors.slice(0, maxShow);
  const overflow = contributors.length - maxShow;
  const allNames = contributors.map((c) => c.userName).join(", ");

  return (
    <div className="flex items-center -space-x-1" title={allNames}>
      {shown.map((c) => (
        <AvatarCircle key={c.userId} name={c.userName} />
      ))}
      {overflow > 0 && (
        <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold inline-flex items-center justify-center flex-shrink-0 border border-white">
          +{overflow}
        </span>
      )}
    </div>
  );
}

export default async function AdminDashboardPage({ params }: AdminDashboardProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Fetch all data in parallel
  const [allFlows, totalSubmissionsResult, completedSubmissionsResult, allEdits] = await Promise.all([
    getFlows({ limit: 1000 }),
    db.select({ count: sql<number>`count(*)` }).from(submissions),
    db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(eq(submissions.status, "completed")),
    db
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
      .orderBy(desc(flowEdits.createdAt)),
  ]);

  // Build activity map per flow
  const activityMap = new Map<string, FlowActivity>();
  for (const edit of allEdits) {
    if (!activityMap.has(edit.flowId)) {
      activityMap.set(edit.flowId, {
        flowId: edit.flowId,
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

  // Recent 10 edits globally
  const recentEdits: RecentEdit[] = allEdits.slice(0, 10).map((edit) => ({
    id: edit.id,
    flowId: edit.flowId,
    flowName: edit.flowName,
    userName: edit.userName ?? "Unbekannt",
    userAvatar: edit.userAvatar,
    action: edit.action,
    summary: edit.summary,
    createdAt: edit.createdAt,
  }));

  const totalFlows = allFlows.length;
  const publishedFlows = allFlows.filter((f) => f.status === "published").length;
  const totalSubmissions = totalSubmissionsResult[0]?.count ?? 0;
  const completedSubmissions = completedSubmissionsResult[0]?.count ?? 0;
  const completionRate =
    totalSubmissions > 0
      ? Math.round((completedSubmissions / totalSubmissions) * 100)
      : 0;

  const stats = [
    {
      label: "Total Flows",
      value: totalFlows,
      description: "All flows in the system",
      color: "bg-indigo-50 text-indigo-700 border-indigo-200",
      iconBg: "bg-indigo-100",
    },
    {
      label: "Published Flows",
      value: publishedFlows,
      description: "Live flows accepting submissions",
      color: "bg-green-50 text-green-700 border-green-200",
      iconBg: "bg-green-100",
    },
    {
      label: "Total Submissions",
      value: totalSubmissions,
      description: "All form submissions",
      color: "bg-blue-50 text-blue-700 border-blue-200",
      iconBg: "bg-blue-100",
    },
    {
      label: "Completion Rate",
      value: `${completionRate}%`,
      description: "Completed vs. started submissions",
      color: "bg-purple-50 text-purple-700 border-purple-200",
      iconBg: "bg-purple-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">OpenFlow Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Overview of your flows and submissions
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border p-5 ${stat.color}`}
          >
            <p className="text-sm font-medium opacity-80">{stat.label}</p>
            <p className="text-3xl font-bold mt-1">{stat.value}</p>
            <p className="text-xs opacity-60 mt-1">{stat.description}</p>
          </div>
        ))}
      </div>

      {/* Recent Flows */}
      {allFlows.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Flows</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {allFlows.slice(0, 5).map((flow) => {
              const activity = activityMap.get(flow.id);
              return (
                <div
                  key={flow.id}
                  className="px-6 py-3 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{flow.name}</p>
                    <p className="text-xs text-gray-500">/{flow.slug}</p>
                  </div>

                  {/* Zuletzt bearbeitet von */}
                  <div className="flex items-center gap-2 min-w-[140px] px-3">
                    {activity ? (
                      <>
                        <AvatarCircle name={activity.lastEditor.name} />
                        <span className="text-xs text-gray-600 truncate">
                          {activity.lastEditor.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </div>

                  {/* Mitwirkende */}
                  <div className="min-w-[100px] px-3">
                    {activity && activity.contributors.length > 0 ? (
                      <ContributorStack contributors={activity.contributors} />
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </div>

                  {/* Letzte Änderung */}
                  <div className="min-w-[120px] px-3 text-right">
                    <span className="text-xs text-gray-500">
                      {activity ? relativeTime(activity.lastEditedAt) : "-"}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ml-3 ${
                      flow.status === "published"
                        ? "bg-green-100 text-green-700"
                        : flow.status === "archived"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {flow.status}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Column headers hint */}
          <div className="px-6 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 uppercase tracking-wide">
            <span className="flex-1">Flow</span>
            <span className="min-w-[140px] px-3">Zuletzt bearbeitet von</span>
            <span className="min-w-[100px] px-3">Mitwirkende</span>
            <span className="min-w-[120px] px-3 text-right">Letzte Änderung</span>
            <span className="ml-3">Status</span>
          </div>
        </div>
      )}

      {/* Letzte Aktivität */}
      {recentEdits.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Letzte Aktivität</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {recentEdits.map((edit) => (
              <div
                key={edit.id}
                className="px-6 py-3 flex items-center gap-3 hover:bg-gray-50"
              >
                <AvatarCircle name={edit.userName} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{edit.userName}</span>{" "}
                    <span className="text-gray-500">{actionLabel(edit.action)}</span>{" "}
                    <span className="font-medium">{edit.flowName}</span>
                  </p>
                  {edit.summary && (
                    <p className="text-xs text-gray-400 truncate">{edit.summary}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {relativeTime(edit.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
