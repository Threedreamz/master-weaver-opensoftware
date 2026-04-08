"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FolderKanban } from "lucide-react";
import Link from "next/link";
import type { Vorlage } from "@opensoftware/db/openpipeline";

export default function NeuePipelinePage() {
  const router = useRouter();
  const [vorlagen, setVorlagen] = useState<Vorlage[]>([]);
  const [name, setName] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [selectedVorlage, setSelectedVorlage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/vorlagen").then((r) => r.json()).then(setVorlagen);
  }, []);

  async function erstellen() {
    if (!name.trim()) return;
    setCreating(true);

    try {
      if (selectedVorlage) {
        // Create from template
        const res = await fetch(`/api/vorlagen/${selectedVorlage}/instanziieren`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, beschreibung }),
        });
        if (res.ok) {
          const { pipeline } = await res.json();
          router.push(`/pipelines/${pipeline.id}`);
        }
      } else {
        // Create empty pipeline
        const res = await fetch("/api/pipelines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, beschreibung, typ: "projekt" }),
        });
        if (res.ok) {
          const pipeline = await res.json();
          router.push(`/pipelines/${pipeline.id}`);
        }
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1 rounded hover:bg-zinc-800">
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <h1 className="text-xl font-bold text-zinc-100">Neue Pipeline</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Name + Beschreibung */}
        <div className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 block mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Mein Projekt"
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 block mb-1">Beschreibung (optional)</label>
            <textarea
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Template selection */}
        <div>
          <label className="text-sm text-zinc-400 block mb-2">Vorlage (optional)</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedVorlage(null)}
              className={`p-4 rounded-lg border text-left transition-colors ${
                selectedVorlage === null
                  ? "border-blue-500 bg-blue-900/20"
                  : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"
              }`}
            >
              <FolderKanban className="w-5 h-5 text-zinc-400 mb-2" />
              <h3 className="text-sm font-medium text-zinc-200">Leer</h3>
              <p className="text-xs text-zinc-500 mt-1">Alle Stufen selbst definieren</p>
            </button>

            {vorlagen.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVorlage(v.id)}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  selectedVorlage === v.id
                    ? "border-blue-500 bg-blue-900/20"
                    : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"
                }`}
              >
                <FolderKanban className="w-5 h-5 text-zinc-400 mb-2" />
                <h3 className="text-sm font-medium text-zinc-200">{v.name}</h3>
                <p className="text-xs text-zinc-500 mt-1">{v.beschreibung}</p>
                {v.stufen && (v.stufen as { name: string }[]).length > 0 && (
                  <p className="text-[10px] text-zinc-600 mt-2">
                    {(v.stufen as { name: string }[]).map((s) => s.name).join(" → ")}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Create */}
        <div className="flex justify-end">
          <button
            onClick={erstellen}
            disabled={creating || !name.trim()}
            className="px-6 py-2.5 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 font-medium"
          >
            {creating ? "Erstellen..." : "Pipeline erstellen"}
          </button>
        </div>
      </main>
    </div>
  );
}
