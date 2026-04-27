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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
          OpenSoftware &middot; OpenPortal
        </div>
        <UserChip />
      </div>
      <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">
        Join a call
      </h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Type a room name to join, or leave it empty for a random one. Share the link from
        the next page with anyone you want in the call.
      </p>

      <div className="mt-6 flex gap-2">
        <input
          autoFocus
          type="text"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && join()}
          placeholder="e.g. team-standup or leave empty"
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
        Calls run on{" "}
        <a
          href="https://framatalk.org"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-[var(--text-secondary)]"
        >
          framatalk.org
        </a>{" "}
        (open Jitsi by Framasoft). Anyone with the link can join &mdash; use a hard-to-guess
        room name.
      </p>
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        First time? If you see &ldquo;asking to join meeting&rdquo;, click{" "}
        <span className="text-[var(--text-secondary)]">Log-in</span> on the Jitsi screen
        once &mdash; that grants you moderator status (one-time per browser, anti-abuse).
      </p>

      <Link
        href="/"
        className="mt-12 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
      >
        &larr; Back to portal
      </Link>
    </main>
  );
}
