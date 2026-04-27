import Link from "next/link";
import { UserChip } from "@/components/UserChip";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
            OpenSoftware
          </div>
          <h1 className="mt-2 text-4xl font-semibold text-[var(--text-primary)]">
            OpenPortal
          </h1>
          <p className="mt-3 max-w-md text-sm text-[var(--text-secondary)]">
            Team and organization portal for the OpenSoftware ecosystem.
          </p>
        </div>
        <UserChip />
      </div>

      <section className="mt-12 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6">
        <h2 className="text-base font-medium text-[var(--text-primary)]">
          Start a call
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Connect over video. Both sides open the same room URL.
        </p>
        <Link
          href="/call"
          className="mt-5 inline-flex items-center rounded-md bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[var(--text-inverse)] transition-colors hover:bg-[var(--color-brand-dark)]"
        >
          Open call lobby
        </Link>
      </section>

      <section className="mt-10">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Coming soon
        </h3>
        <ul className="mt-3 grid grid-cols-1 gap-1 text-sm text-[var(--text-secondary)] sm:grid-cols-2">
          <li>Teams &mdash; organization management</li>
          <li>Members &mdash; roles &amp; invitations</li>
          <li>Channels &mdash; real-time messaging</li>
          <li>Meetings &mdash; AI-recorded sessions</li>
          <li>Audit &mdash; logs &amp; GDPR exports</li>
        </ul>
      </section>
    </main>
  );
}
