import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Open3D Desktop',
  description: 'Local 3D processing desktop application',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0a0a1a', color: '#e0e0f0', fontFamily: 'system-ui' }}>
        {children}
      </body>
    </html>
  );
}
