"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

export default function GeneratorPage() {
  const router = useRouter();
  const [ecosystemId, setEcosystemId] = useState("");
  const [name, setName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function generieren() {
    if (!name.trim()) return;
    setGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ecosystemId: ecosystemId || undefined, name }),
      });

      if (res.ok) {
        const { pipeline } = await res.json();
        router.push(`/pipelines/${pipeline.id}`);
      } else {
        const data = await res.json();
        setError(data.error ?? "Fehler beim Generieren");
      }
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1 rounded hover:bg-zinc-800">
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h1 className="text-xl font-bold text-zinc-100">Pipeline Generator</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-6 space-y-6">
        <p className="text-sm text-zinc-400">
          Generiere eine Pipeline basierend auf Business-Core Analysen.
          Der Generator erstellt Stufen und Karten aus den Analyse-Ergebnissen.
        </p>

        <div>
          <label className="text-sm text-zinc-400 block mb-1">Pipeline-Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Mein Business Pipeline"
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400 block mb-1">Ecosystem ID (optional)</label>
          <input
            value={ecosystemId}
            onChange={(e) => setEcosystemId(e.target.value)}
            placeholder="z.B. ersatzteildrucken, finder, odyn"
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="text-xs text-zinc-600 mt-1">Leer lassen fuer eine generische Fischer-Pipeline</p>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded">{error}</p>
        )}

        <button
          onClick={generieren}
          disabled={generating || !name.trim()}
          className="w-full px-6 py-3 rounded bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {generating ? "Generiere..." : "Pipeline generieren"}
        </button>
      </main>
    </div>
  );
}
