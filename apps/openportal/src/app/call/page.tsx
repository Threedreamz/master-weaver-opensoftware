"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserChip } from "@/components/UserChip";

function randomRoom() {
  const adjectives = ["calm", "bright", "swift", "quiet", "warm", "bold", "sharp"];
  const nouns = ["river", "stone", "forest", "harbor", "cloud", "field", "meadow"];
  const a = adjectives[Math.floor(Math.random() * adjectives.length)];
  const n = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${a}-${n}-${num}`;
}

export default function CallLanding() {
  const router = useRouter();
  const [room, setRoom] = useState("");

  const join = () => {
    const slug = (room.trim() || randomRoom()).replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 80);
    router.push(`/call/${slug}`);
  };

  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
          Join a call
        </h1>
        <UserChip />
      </div>

      <div className="mt-8 flex gap-2">
        <input
          autoFocus
          type="text"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && join()}
          placeholder="Room name or leave empty"
          className="flex-1 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--color-brand)] focus:outline-none"
        />
        <button
          type="button"
          onClick={join}
          className="rounded-md bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[var(--text-inverse)] transition-colors hover:bg-[var(--color-brand-dark)]"
        >
          Join
        </button>
      </div>

      <p className="mt-6 text-xs text-[var(--text-muted)]">
        Anyone with the link can join. Use a hard-to-guess name.
      </p>

      <Link
        href="/"
        className="mt-12 inline-block text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
      >
        &larr; Back
      </Link>
    </main>
  );
}
