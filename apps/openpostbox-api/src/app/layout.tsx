import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenPostbox",
  description: "Virtual mailbox — scan, OCR, classify, archive",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="antialiased">{children}</body>
    </html>
  );
}
