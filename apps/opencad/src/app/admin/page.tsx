export default function AdminPage() {
  const services: Array<{ label: string; href: string; description: string }> = [
    {
      label: "Health probe",
      href: "/api/health",
      description: "Liveness + boot status for the OpenCAD server.",
    },
    {
      label: "AppStore manifest",
      href: "/api/appstore/manifest",
      description: "Declares sidebar entries, dashboards and widgets to the host admin.",
    },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-xl font-semibold">Service status</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {services.map((s) => (
            <li
              key={s.href}
              className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4"
            >
              <div className="mb-1 flex items-center justify-between">
                <a
                  className="font-medium text-neutral-100 hover:underline"
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {s.label}
                </a>
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                  live
                </span>
              </div>
              <p className="text-sm text-neutral-400">{s.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Dashboards</h2>
        <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900/30">
          <iframe
            title="OpenCAD Projects"
            src="/projects"
            className="h-[60vh] w-full bg-neutral-950"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        </div>
      </section>
    </div>
  );
}
