import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { GitBranch, ArrowLeft } from "lucide-react";
import { createFlow } from "../actions";

interface NewFlowPageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewFlowPage({ params }: NewFlowPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/admin/flows`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={14} />
          Flows
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
          <GitBranch className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Neuer Flow</h1>
          <p className="text-sm text-gray-500">Erstelle einen neuen Prozessablauf</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <form action={createFlow} className="space-y-5">
          <input type="hidden" name="locale" value={locale} />

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="z.B. Auftrag-Eingang Prozess"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Beschreibung
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Optionale Beschreibung des Prozessablaufs..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href={`/${locale}/admin/flows`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </Link>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              Flow erstellen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
