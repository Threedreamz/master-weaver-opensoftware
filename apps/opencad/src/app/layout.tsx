import type { ReactNode } from "react";

export const metadata = {
  title: "OpenCAD — Parametric CAD/CAM",
  description: "Browser-based parametric CAD + CAM + assemblies. Open-source Fusion 360 alternative.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
