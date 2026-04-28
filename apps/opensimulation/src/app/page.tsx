import CantileverDemo from "@/components/demo/cantilever-demo";

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
    <main className="max-w-5xl mx-auto px-6 py-12 text-neutral-200 bg-neutral-950 min-h-screen">
      <div className="text-xs tracking-wider text-neutral-500 uppercase">
        Service · OpenSimulation
      </div>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">OpenSimulation</h1>
      <p className="mt-2 text-neutral-400">
        Browser-native physics + kinematics simulator. The result below is
        computed live by a TypeScript Cholesky FEA kernel — no plugins, no
        cloud GPU, no sign-in.
      </p>

      <section className="mt-8">
        <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
          Live demo · cantilever beam
        </div>
        <div className="mt-2">
          <CantileverDemo />
        </div>
      </section>

      <div className="mt-10 rounded-lg border border-amber-700/40 bg-amber-900/10 p-5 text-sm">
        <div className="font-medium text-amber-300">Run your own simulation</div>
        <p className="mt-1 text-neutral-300">
          Sign in at the 3Dreamz hub and open
          <span className="font-mono text-amber-300"> /tools/sim</span> to
          create a project, import a part from OpenCAD, and run FEA, thermal,
          kinematic, or cleaning solvers on it. API access is documented at
          <span className="font-mono text-amber-300"> /api/health</span>.
        </p>
      </div>

      <h2 className="mt-12 text-xl font-medium">Available solver domains</h2>
      <section className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DOMAINS.map((d) => (
          <div
            key={d.slug}
            className="block rounded-lg border border-neutral-800 bg-neutral-900/50 p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium">{d.title}</h3>
              <span
                className={
                  d.status === "ready"
                    ? "text-xs rounded bg-emerald-900/40 px-2 py-0.5 text-emerald-300"
                    : "text-xs rounded bg-neutral-800 px-2 py-0.5 text-neutral-400"
                }
              >
                {d.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-neutral-400">{d.blurb}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
