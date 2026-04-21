import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "OpenCAM — Toolpaths + G-Code",
  description:
    "Browser-based CAM companion to OpenCAD. Generate pocket/contour/face/drill toolpaths and post to G-Code for CNC/milling.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-neutral-950 text-neutral-100 min-h-screen">{children}</body>
    </html>
  );
}
