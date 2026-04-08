import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Open3D Studio',
  description: 'Unified 3D platform — viewer, converter, slicer, CAD, AI generation',
};

const NAV_LINKS = [
  { href: '/viewer', label: 'Viewer' },
  { href: '/converter', label: 'Converter' },
  { href: '/slicer', label: 'Slicer' },
  { href: '/cad', label: 'CAD' },
  { href: '/generate', label: 'AI Generate' },
  { href: '/reconstruct', label: 'Reconstruct' },
  { href: '/analyze', label: 'Analyze' },
  { href: '/simulate', label: 'Simulate' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="navbar">
          <a href="/" className="navbar-brand">Open3D Studio</a>
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
        </nav>
        {children}
      </body>
    </html>
  );
}
