import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OpenPipeline — Hierarchisches Pipeline-Management',
  description: 'Kanban-basiertes Pipeline-System mit Sub-Pipelines, Teams-Sync und Business-Core Integration',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  )
}
