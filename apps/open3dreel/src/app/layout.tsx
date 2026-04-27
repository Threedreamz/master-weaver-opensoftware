import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Open3DReel — 3D Model to Product Video",
  description:
    "Upload a 3D model. Generate a 360° product reel. Built for 3D artists, creators, and small businesses.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
