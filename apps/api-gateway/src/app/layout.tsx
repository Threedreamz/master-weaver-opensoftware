import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OpenSoftware API Gateway",
  description: "Unified API entry point for external apps accessing OpenSoftware services",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
