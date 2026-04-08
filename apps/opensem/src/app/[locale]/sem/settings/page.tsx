import { PageHeader } from "@opensoftware/ui";
import { Settings, ExternalLink } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect external services to power your SEM analytics"
      />

      <div className="space-y-6">
        {/* Google Ads */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Google Ads</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Connect your Google Ads account to import campaigns, keywords, and performance data.
                Enables Paid Search, Quality Score, Dayparting, and Automation features.
              </p>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              Not connected
            </span>
          </div>
          <div className="mt-4">
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              <ExternalLink className="w-4 h-4" />
              Connect Google Ads
            </button>
          </div>
        </div>

        {/* SEMrush */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">SEMrush</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Provide your SEMrush API key to import competitor data, keyword research, and domain analytics.
                Enables Intelligence, Competitor, and Keyword Gap features.
              </p>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              Not connected
            </span>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 max-w-md">
              <label htmlFor="semrush-api-key" className="sr-only">SEMrush API Key</label>
              <input
                id="semrush-api-key"
                type="password"
                placeholder="Enter SEMrush API key"
                disabled
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
            <button
              disabled
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Save Key
            </button>
          </div>
        </div>

        {/* Campaign Mapping */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Campaign Mapping</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Map Google Ads campaigns to landing pages for unified organic + paid reporting.
                Required for SERP Dominance scoring and Cannibalization detection.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900">
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Campaign</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Landing Page</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      Connect Google Ads above to configure campaign mappings.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
