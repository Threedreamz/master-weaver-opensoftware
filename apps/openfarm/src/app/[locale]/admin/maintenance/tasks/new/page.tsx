import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { getPrinters } from "@/db/queries/printers";
import { createMaintenanceTaskAction } from "./actions";

interface NewMaintenanceTaskPageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewMaintenanceTaskPage({ params }: NewMaintenanceTaskPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tc = await getTranslations("common");
  const printers = await getPrinters();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/admin/maintenance`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          {tc("back")}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Maintenance Task</h1>
      </div>

      <form action={createMaintenanceTaskAction} className="space-y-8">
        <input type="hidden" name="locale" value={locale} />

        {/* Task Details */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Task Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Task Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                placeholder="e.g. Nozzle cleaning, Belt tension check"
              />
            </div>

            <div>
              <label htmlFor="printerId" className="block text-sm font-medium text-gray-700 mb-1">
                Printer <span className="text-red-500">*</span>
              </label>
              <select
                id="printerId"
                name="printerId"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                <option value="">-- Select Printer --</option>
                {printers.map((printer) => (
                  <option key={printer.id} value={printer.id}>
                    {printer.name} [{printer.technology.toUpperCase()}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                id="type"
                name="type"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                <option value="">-- Select Type --</option>
                <option value="routine">Routine</option>
                <option value="preventive">Preventive</option>
                <option value="corrective">Corrective</option>
                <option value="calibration">Calibration</option>
              </select>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                <option value="normal">Normal</option>
                <option value="low">Low</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label htmlFor="intervalHours" className="block text-sm font-medium text-gray-700 mb-1">
                Interval (hours)
              </label>
              <input
                type="number"
                id="intervalHours"
                name="intervalHours"
                min="1"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                placeholder="e.g. 500"
              />
            </div>

            <div>
              <label htmlFor="dueAt" className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                id="dueAt"
                name="dueAt"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
          <textarea
            id="description"
            name="description"
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
            placeholder="Describe the maintenance task, steps required, tools needed..."
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center rounded-lg bg-amber-500 px-6 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
          >
            {tc("save")}
          </button>
          <Link
            href={`/${locale}/admin/maintenance`}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {tc("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}
