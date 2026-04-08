import { PageHeader } from "@opensoftware/ui";
import {
  BarChart3,
  Scale,
  TrendingUp,
  FileText,
  ListChecks,
  Calculator,
  Receipt,
} from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";

interface ReportCard {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const reports: ReportCard[] = [
    {
      title: "BWA",
      description:
        "Betriebswirtschaftliche Auswertung - Monthly business performance analysis with standard German BWA structure.",
      href: `/${locale}/accounting/reports/bwa`,
      icon: <BarChart3 className="w-6 h-6" />,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      title: "Bilanz",
      description:
        "Balance Sheet - Assets (Aktiva) and liabilities (Passiva) overview for any reporting period.",
      href: `/${locale}/accounting/reports/bilanz`,
      icon: <Scale className="w-6 h-6" />,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "GuV",
      description:
        "Gewinn- und Verlustrechnung - Profit & Loss statement showing revenue, expenses, and net result.",
      href: `/${locale}/accounting/reports/guv`,
      icon: <TrendingUp className="w-6 h-6" />,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950",
    },
    {
      title: "OPOS",
      description:
        "Offene Posten - Open items list with aging buckets for outstanding invoices and receivables.",
      href: `/${locale}/accounting/reports/opos`,
      icon: <ListChecks className="w-6 h-6" />,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950",
    },
    {
      title: "SUSA",
      description:
        "Summen- und Saldenliste - Account-level debit/credit totals and balances for the period.",
      href: `/${locale}/accounting/reports/susa`,
      icon: <Calculator className="w-6 h-6" />,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-950",
    },
    {
      title: "UStVA",
      description:
        "Umsatzsteuervoranmeldung - VAT return preparation with ELSTER XML export.",
      href: `/${locale}/accounting/reports/vat`,
      icon: <Receipt className="w-6 h-6" />,
      color: "text-teal-600",
      bg: "bg-teal-50 dark:bg-teal-950",
    },
  ];

  return (
    <>
      <PageHeader
        title="Reports"
        description="BWA, Bilanz, GuV and other financial reports"
      />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <Link
              key={report.title}
              href={report.href}
              className="group bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-lg ${report.bg} flex items-center justify-center shrink-0`}
                >
                  <span className={report.color}>{report.icon}</span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {report.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {report.description}
                  </p>
                  <span className="inline-block mt-3 text-sm text-emerald-600 dark:text-emerald-400 font-medium group-hover:underline">
                    View Report
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
