import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "OpenSimulation",
  description: "Physics + kinematics simulation service",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-neutral-950 text-neutral-100 min-h-screen">{children}</body>
    </html>
  );
}
