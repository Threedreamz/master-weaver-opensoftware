"use client";

import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";

interface BreadcrumbItem {
  id: string;
  name: string;
}

interface PipelineNavProps {
  breadcrumb: BreadcrumbItem[];
}

export function PipelineNav({ breadcrumb }: PipelineNavProps) {
  return (
    <nav className="flex items-center gap-1 text-sm text-zinc-400 px-4 py-2 bg-zinc-900/50 border-b border-zinc-800">
      <Link href="/" className="hover:text-zinc-200 flex items-center gap-1">
        <Home className="w-4 h-4" />
        <span>Pipelines</span>
      </Link>

      {breadcrumb.map((item) => (
        <span key={item.id} className="flex items-center gap-1">
          <ChevronRight className="w-3 h-3 text-zinc-600" />
          <Link
            href={`/pipelines/${item.id}`}
            className="hover:text-zinc-200"
          >
            {item.name}
          </Link>
        </span>
      ))}
    </nav>
  );
}
