"use client";

import { useState, type ReactNode } from "react";
import { cn } from "../lib/utils";

interface AppShellProps {
  sidebar: ReactNode;
  children: ReactNode;
  header?: ReactNode;
  className?: string;
}

export function AppShell({ sidebar, children, header, className }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className={cn("flex h-screen bg-gray-50 dark:bg-gray-950", className)}>
      {/* Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-200",
          !sidebarOpen && "lg:w-0 lg:overflow-hidden"
        )}
      >
        {sidebar}
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {header && (
          <header className="h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center px-4 gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 lg:block hidden"
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {header}
          </header>
        )}
        <main className="flex-1 overflow-auto p-6" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
