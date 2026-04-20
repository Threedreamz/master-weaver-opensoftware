"use client";

/**
 * opencad — ProjectList
 *
 * Grid of project cards. Fetches GET /api/projects on mount. Includes a
 * leading "+ New Project" card that invokes the provided onCreate handler
 * (parent typically routes to a wizard or calls POST /api/projects).
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus, FolderOpen, Shapes, AlertCircle, Loader2 } from "lucide-react";

export interface ProjectSummary {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl: string | null;
  currentVersionId: string | null;
  featureCount: number;
}

export interface ProjectListProps {
  onCreate?: () => void;
  /** Override the default fetch endpoint (testing / storybook). */
  fetchUrl?: string;
  /** Base path for the open-project link (defaults to /projects). */
  projectHrefBase?: string;
}

export function ProjectList({
  onCreate,
  fetchUrl = "/api/projects",
  projectHrefBase = "/projects",
}: ProjectListProps) {
  const [items, setItems] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(fetchUrl, {
        method: "GET",
        credentials: "include",
        headers: { accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Failed to load projects (${res.status})`);
      const data = (await res.json()) as { items?: ProjectSummary[] };
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [fetchUrl]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section
      className="w-full bg-neutral-950 p-6 text-neutral-100"
      aria-label="Projects"
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Projects</h1>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New Project
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200"
          >
            <AlertCircle className="h-4 w-4" aria-hidden />
            {error}
            <button
              type="button"
              onClick={() => void load()}
              className="ml-auto rounded bg-red-900/60 px-2 py-0.5 text-xs hover:bg-red-800"
            >
              Retry
            </button>
          </div>
        )}

        <ul
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          role="list"
        >
          <li>
            <button
              type="button"
              onClick={onCreate}
              className="group flex aspect-[4/3] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-800 bg-neutral-900/60 text-neutral-300 transition hover:border-blue-500 hover:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="Create new project"
            >
              <Plus
                className="mb-2 h-8 w-8 text-neutral-500 transition group-hover:text-blue-400"
                aria-hidden
              />
              <span className="text-sm font-medium">New Project</span>
              <span className="mt-1 text-[11px] text-neutral-500">
                Blank part or from import
              </span>
            </button>
          </li>

          {loading && items.length === 0 && (
            <li className="col-span-full flex items-center justify-center py-12 text-sm text-neutral-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Loading projects…
            </li>
          )}

          {!loading &&
            items.map((p) => (
              <li key={p.id}>
                <Link
                  href={`${projectHrefBase}/${p.id}`}
                  className="group flex aspect-[4/3] w-full flex-col overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 transition hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <div className="relative flex flex-1 items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-950">
                    {p.thumbnailUrl ? (
                      // Thumbnail images are remote — <img> avoids next/image domain config here.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.thumbnailUrl}
                        alt={`${p.name} thumbnail`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Shapes
                        className="h-12 w-12 text-neutral-700 transition group-hover:text-blue-500"
                        aria-hidden
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between border-t border-neutral-800 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-neutral-100">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {p.featureCount}{" "}
                        {p.featureCount === 1 ? "feature" : "features"}
                      </div>
                    </div>
                    <FolderOpen
                      className="h-4 w-4 text-neutral-500 transition group-hover:text-blue-400"
                      aria-hidden
                    />
                  </div>
                </Link>
              </li>
            ))}

          {!loading && items.length === 0 && !error && (
            <li className="col-span-full rounded border border-dashed border-neutral-800 bg-neutral-900/40 p-8 text-center text-sm text-neutral-500">
              No projects yet. Click <span className="text-neutral-300">New Project</span> to get started.
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}

export default ProjectList;
