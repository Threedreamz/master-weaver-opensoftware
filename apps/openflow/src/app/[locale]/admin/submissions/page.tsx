import { setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { submissions, flows } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { format, formatDistanceStrict } from "date-fns";

interface SubmissionsPageProps {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ flow?: string }>;
}

export default async function SubmissionsPage({
  params,
  searchParams,
}: SubmissionsPageProps) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const allFlows = await db.query.flows.findMany({
    orderBy: [flows.name],
    columns: { id: true, name: true },
  });

  const allSubmissions = await db.query.submissions.findMany({
    orderBy: [desc(submissions.startedAt)],
    limit: 200,
    with: {
      flow: { columns: { name: true, slug: true } },
    },
  });

  const filtered = sp?.flow
    ? allSubmissions.filter((s) => s.flowId === sp.flow)
    : allSubmissions;

  function statusBadgeClass(status: string) {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "abandoned":
        return "bg-red-100 text-red-700";
      default:
        return "bg-yellow-100 text-yellow-700";
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Submissions</h1>
          <p className="text-sm text-gray-500 mt-1">
            All form submissions across flows
          </p>
        </div>
        <span className="text-sm text-gray-500">
          {filtered.length} submission{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Filter bar */}
      <form method="GET" className="flex items-center gap-3">
        <select
          name="flow"
          defaultValue={sp?.flow ?? ""}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        >
          <option value="">All Flows</option>
          {allFlows.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Filter
        </button>
        {sp?.flow && (
          <a
            href="?"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Clear
          </a>
        )}
        {sp?.flow && (
          <a
            href={`/api/flows/${sp.flow}/export?format=csv`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            CSV Export
          </a>
        )}
      </form>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500 font-medium">No submissions found</p>
          <p className="text-sm text-gray-400 mt-1">
            Submissions will appear here once users complete flows.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 font-medium text-gray-600">
                  Flow
                </th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">
                  Status
                </th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">
                  Started At
                </th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">
                  Completed At
                </th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((sub) => {
                const duration =
                  sub.completedAt && sub.startedAt
                    ? formatDistanceStrict(
                        new Date(sub.completedAt),
                        new Date(sub.startedAt)
                      )
                    : "—";
                return (
                  <tr
                    key={sub.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">
                        {sub.flow?.name ?? "Unknown Flow"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 font-mono">
                        {sub.id.slice(0, 8)}…
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(sub.status)}`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {sub.startedAt
                        ? format(new Date(sub.startedAt), "dd MMM yyyy HH:mm")
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {sub.completedAt
                        ? format(
                            new Date(sub.completedAt),
                            "dd MMM yyyy HH:mm"
                          )
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{duration}</td>
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
