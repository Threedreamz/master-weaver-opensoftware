import Link from "next/link";

type Domain = {
  slug: string;
  title: string;
  blurb: string;
  status: "ready" | "planned";
};

const DOMAINS: Domain[] = [
  { slug: "kinematic", title: "Kinematic (FWD + IK)", blurb: "Forward + inverse kinematics for articulated assemblies.", status: "ready" },
  { slug: "fea-static", title: "FEA Static", blurb: "Linear-elastic static stress + displacement fields.", status: "ready" },
  { slug: "thermal-steady", title: "Thermal Steady", blurb: "Steady-state heat conduction + convective boundaries.", status: "ready" },
  { slug: "modal", title: "Modal", blurb: "Natural frequency + mode shape extraction.", status: "planned" },
  { slug: "rigid-body", title: "Rigid-Body", blurb: "Multi-body dynamics with joints + contact.", status: "planned" },
  { slug: "cleaning", title: "Cleaning", blurb: "Ultrasonic + CIP cleaning-cycle simulation.", status: "ready" },
];

export default function RootPage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-semibold tracking-tight">OpenSimulation</h1>
      <p className="mt-2 text-neutral-400">Physics + kinematics simulation service</p>
      <section className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DOMAINS.map((d) => (
          <Link
            key={d.slug}
            href={`/admin/simulation/${d.slug}`}
            className="block rounded-lg border border-neutral-800 bg-neutral-900/50 p-5 hover:border-neutral-700 transition-colors"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{d.title}</h2>
              {d.status === "planned" && (
                <span className="text-xs rounded bg-neutral-800 px-2 py-0.5 text-neutral-400">planned</span>
              )}
            </div>
            <p className="mt-2 text-sm text-neutral-400">{d.blurb}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
