import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "OpenCAD — Parametric CAD/CAM",
  description:
    "Browser-based parametric CAD + CAM + assemblies. Open-source Fusion 360 alternative.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-neutral-950 text-neutral-100 min-h-screen">{children}</body>
    </html>
  );
}
