import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { GitBranch, Plus, Trash2, Eye, Archive, Radio } from "lucide-react";
import { deleteFlow, publishFlow, archiveFlow } from "./actions";

interface FlowsPageProps {
  params: Promise<{ locale: string }>;
}

function StatusBadge({ status }: { status: "draft" | "live" | "archived" }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
        <Radio size={10} />
        Live
      </span>
    );
  }
  if (status === "archived") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
        <Archive size={10} />
        Archiviert
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
      Entwurf
    </span>
  );
}

export default async function FlowsPage({ params }: FlowsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tc = await getTranslations("common");

  const flows = await db.query.deskFlows.findMany({
    with: {
      nodes: true,
      edges: true,
    },
    orderBy: (f, { desc }) => [desc(f.updatedAt)],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Flows</h1>
            <p className="text-sm text-gray-500">Prozessabläufe definieren und verwalten</p>
          </div>
        </div>
        <Link
          href={`/${locale}/admin/flows/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          Neuer Flow
        </Link>
      </div>

      {flows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <GitBranch size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Noch keine Flows angelegt</p>
          <p className="text-gray-400 text-sm mt-1">Erstelle deinen ersten Prozessablauf</p>
          <Link
            href={`/${locale}/admin/flows/new`}
            className="inline-flex items-center gap-2 mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            Neuer Flow
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Knoten
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Verbindungen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Veröffentlicht
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {tc("actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {flows.map((flow) => (
                <tr key={flow.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      href={`/${locale}/admin/flows/${flow.id}`}
                      className="font-medium text-gray-900 hover:text-indigo-700 transition-colors"
                    >
                      {flow.name}
                    </Link>
                    {flow.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
                        {flow.description}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={flow.status} />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                      v{flow.version}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-medium text-gray-700">
                    {flow.nodes.length}
                  </td>
                  <td className="px-6 py-4 text-center font-medium text-gray-700">
                    {flow.edges.length}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {flow.publishedAt
                      ? new Date(flow.publishedAt).toLocaleDateString("de-DE")
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/${locale}/admin/flows/${flow.id}`}
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors px-2 py-1 rounded hover:bg-indigo-50"
                        title="Öffnen"
                      >
                        <Eye size={13} />
                      </Link>
                      {flow.status !== "live" && (
                        <form action={publishFlow}>
                          <input type="hidden" name="id" value={flow.id} />
                          <input type="hidden" name="locale" value={locale} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 transition-colors px-2 py-1 rounded hover:bg-green-50"
                            title="Veröffentlichen"
                          >
                            <Radio size={13} />
                          </button>
                        </form>
                      )}
                      {flow.status !== "archived" && (
                        <form action={archiveFlow}>
                          <input type="hidden" name="id" value={flow.id} />
                          <input type="hidden" name="locale" value={locale} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 text-xs text-yellow-600 hover:text-yellow-800 transition-colors px-2 py-1 rounded hover:bg-yellow-50"
                            title="Archivieren"
                          >
                            <Archive size={13} />
                          </button>
                        </form>
                      )}
                      <form action={deleteFlow}>
                        <input type="hidden" name="id" value={flow.id} />
                        <input type="hidden" name="locale" value={locale} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50"
                          title={tc("delete")}
                        >
                          <Trash2 size={13} />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
