type Module = {
  slug: string;
  title: string;
  blurb: string;
  status: "ready" | "stub" | "planned";
};

const MODULES: Module[] = [
  {
    slug: "loyalty",
    title: "Loyalty Engine",
    blurb: "Points ledger + reward redemptions driven by confirmed value events.",
    status: "stub",
  },
  {
    slug: "referral",
    title: "Referral Engine",
    blurb: "Referral codes + attribution with anti-self-referral guards.",
    status: "planned",
  },
  {
    slug: "career",
    title: "Career / Stage Engine",
    blurb: "Declarative stage definitions + promotion-on-confirmed-event.",
    status: "planned",
  },
  {
    slug: "commission",
    title: "Commission Engine",
    blurb: "Plan-driven calculation, hold-release, revoke-on-reverse.",
    status: "planned",
  },
  {
    slug: "wallet",
    title: "Wallet / Coin / Token",
    blurb: "Cash + coin + token wallets with mint recipes.",
    status: "planned",
  },
  {
    slug: "kyc",
    title: "KYC / Compliance",
    blurb: "Identity gating + fraud rules + payout pre-checks.",
    status: "planned",
  },
];

export default function RootPage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-12 text-neutral-200 bg-neutral-950 min-h-screen">
      <div className="text-xs tracking-wider text-neutral-500 uppercase">
        Service · OpenMLM
      </div>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">OpenMLM</h1>
      <p className="mt-2 text-neutral-400 max-w-2xl">
        Modular value-based loyalty, referral, career and commission engine.
        Generic enough for B2C, B2B, and partner / white-label tenants. The
        full spec lives at <span className="font-mono text-amber-300">docs/openmlm-start.md</span>.
      </p>

      <div className="mt-6 rounded-lg border border-amber-700/40 bg-amber-900/10 p-5 text-sm">
        <div className="font-medium text-amber-300">Pre-MVP — Phase 0.5</div>
        <p className="mt-1 text-neutral-300">
          This deployment is a deployable shell. Schema and routes are
          scaffolded; engines are stubs. Loyalty (Phase 1) lands first.
        </p>
      </div>

      <h2 className="mt-12 text-xl font-medium">Modules</h2>
      <section className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((m) => (
          <div
            key={m.slug}
            className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium">{m.title}</h3>
              <span
                className={
                  m.status === "ready"
                    ? "text-xs rounded bg-emerald-900/40 px-2 py-0.5 text-emerald-300"
                    : m.status === "stub"
                      ? "text-xs rounded bg-amber-900/40 px-2 py-0.5 text-amber-300"
                      : "text-xs rounded bg-neutral-800 px-2 py-0.5 text-neutral-400"
                }
              >
                {m.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-neutral-400">{m.blurb}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
