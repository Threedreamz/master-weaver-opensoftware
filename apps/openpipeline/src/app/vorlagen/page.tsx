import { db, schema } from "@/db";
import Link from "next/link";
import { ArrowLeft, FolderKanban, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VorlagenPage() {
  const vorlagen = db.select().from(schema.pipVorlagen).all();

  const system = vorlagen.filter((v) => v.istSystem);
  const custom = vorlagen.filter((v) => !v.istSystem);

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1 rounded hover:bg-zinc-800">
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <h1 className="text-xl font-bold text-zinc-100">Vorlagen</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-8">
        {/* System templates */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">System-Vorlagen</h2>
          <div className="space-y-2">
            {system.map((v) => (
              <div key={v.id} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-zinc-200">{v.name}</h3>
                    <p className="text-sm text-zinc-500 mt-0.5">{v.beschreibung}</p>
                    {v.stufen && (v.stufen as { name: string }[]).length > 0 && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-zinc-600">
                        {(v.stufen as { name: string }[]).map((s, i) => (
                          <span key={i} className="flex items-center gap-1">
                            {i > 0 && <ChevronRight className="w-3 h-3" />}
                            <span className="px-1.5 py-0.5 bg-zinc-800 rounded">{s.name}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 capitalize">{v.kategorie}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Custom templates */}
        {custom.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Eigene Vorlagen</h2>
            <div className="space-y-2">
              {custom.map((v) => (
                <div key={v.id} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                  <h3 className="font-medium text-zinc-200">{v.name}</h3>
                  <p className="text-sm text-zinc-500 mt-0.5">{v.beschreibung}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
