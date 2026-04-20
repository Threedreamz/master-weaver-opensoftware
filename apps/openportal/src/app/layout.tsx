import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "OpenPortal",
  description: "Generic team and organization portal for OpenSoftware.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
