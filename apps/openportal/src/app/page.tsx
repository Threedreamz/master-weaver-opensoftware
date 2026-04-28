import Link from "next/link";
import { UserChip } from "@/components/UserChip";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-20">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
          OpenPortal
        </h1>
        <UserChip />
      </div>

      <p className="mt-3 text-sm text-[var(--text-secondary)]">
        Connect with anyone over video.
      </p>

      <Link
        href="/call"
        className="mt-10 inline-flex items-center rounded-md bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[var(--text-inverse)] transition-colors hover:bg-[var(--color-brand-dark)]"
      >
        Start a call
      </Link>
    </main>
  );
}
