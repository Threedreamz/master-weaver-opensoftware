"use client";

import { useState, useEffect } from "react";
import { PageHeader, DataTable, StatusBadge, EmptyState, type Column } from "@opensoftware/ui";
import { MessageSquarePlus, Inbox } from "lucide-react";
import { getInquiries, createInquiry, updateInquiryStatus } from "./actions";

type Inquiry = {
  id: number;
  number: string;
  subject: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  message: string | null;
  customerType: string | null;
  source: string | null;
  status: string | null;
  assignedTo: string | null;
  notes: string | null;
  customerId: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const STATUS_MAP: Record<string, string> = {
  neu: "blue",
  in_bearbeitung: "yellow",
  angebot_erstellt: "purple",
  abgeschlossen: "green",
  abgelehnt: "red",
};

const STATUS_LABELS: Record<string, string> = {
  neu: "Neu",
  in_bearbeitung: "In Bearbeitung",
  angebot_erstellt: "Angebot erstellt",
  abgeschlossen: "Abgeschlossen",
  abgelehnt: "Abgelehnt",
};

const SOURCE_LABELS: Record<string, string> = {
  website: "Website",
  email: "E-Mail",
  phone: "Telefon",
  manual: "Manuell",
};

function InquiryStatusBadge({ status }: { status: string }) {
  const color = STATUS_MAP[status] || "gray";
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    green: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    gray: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[color]}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
    source: "manual" as "website" | "email" | "phone" | "manual",
  });

  useEffect(() => {
    loadInquiries();
  }, []);

  async function loadInquiries() {
    setLoading(true);
    const data = await getInquiries();
    setInquiries(data as Inquiry[]);
    setLoading(false);
  }

  async function handleCreate() {
    if (!formData.subject.trim()) return;
    const result = await createInquiry(formData);
    if (result.success) {
      setShowForm(false);
      setFormData({ subject: "", name: "", email: "", phone: "", company: "", message: "", source: "manual" });
      loadInquiries();
    }
  }

  async function handleStatusChange(id: number, status: "neu" | "in_bearbeitung" | "angebot_erstellt" | "abgeschlossen" | "abgelehnt") {
    const result = await updateInquiryStatus(id, status);
    if (result.success) loadInquiries();
  }

  const columns: Column<Inquiry>[] = [
    { key: "number", header: "Number" },
    { key: "subject", header: "Subject" },
    {
      key: "customer",
      header: "Customer / Name",
      render: (row) => (
        <div>
          <span className="font-medium">{row.name || "-"}</span>
          {row.company && <span className="text-gray-500 dark:text-gray-400 ml-1">({row.company})</span>}
        </div>
      ),
    },
    {
      key: "source",
      header: "Source",
      render: (row) => SOURCE_LABELS[row.source || "manual"] || row.source,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <select
          value={row.status || "neu"}
          onChange={(e) => handleStatusChange(row.id, e.target.value as "neu" | "in_bearbeitung" | "angebot_erstellt" | "abgeschlossen" | "abgelehnt")}
          className="bg-transparent border-0 text-sm cursor-pointer focus:ring-0 p-0"
          aria-label={`Change status for inquiry ${row.number}`}
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString("de-DE") : "-",
    },
  ];

  return (
    <>
      <PageHeader
        title="Inquiries"
        description="Track and manage customer inquiries"
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors"
          >
            <MessageSquarePlus className="w-4 h-4" />
            New Inquiry
          </button>
        }
      />

      {showForm && (
        <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
          <h3 className="text-sm font-medium mb-3 text-gray-900 dark:text-white">New Inquiry</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label htmlFor="inq-subject" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Subject *</label>
              <input
                id="inq-subject"
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Inquiry subject"
              />
            </div>
            <div>
              <label htmlFor="inq-name" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Name</label>
              <input
                id="inq-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Contact name"
              />
            </div>
            <div>
              <label htmlFor="inq-company" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Company</label>
              <input
                id="inq-company"
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Company name"
              />
            </div>
            <div>
              <label htmlFor="inq-email" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Email</label>
              <input
                id="inq-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label htmlFor="inq-phone" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Phone</label>
              <input
                id="inq-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="+49..."
              />
            </div>
            <div>
              <label htmlFor="inq-source" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Source</label>
              <select
                id="inq-source"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value as "website" | "email" | "phone" | "manual" })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="manual">Manuell</option>
                <option value="website">Website</option>
                <option value="email">E-Mail</option>
                <option value="phone">Telefon</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="inq-message" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Message</label>
              <textarea
                id="inq-message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Inquiry details..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!formData.subject.trim()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create Inquiry
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : inquiries.length === 0 ? (
        <EmptyState
          icon={<Inbox className="w-12 h-12" />}
          title="No inquiries yet"
          description="Create your first inquiry to start tracking customer requests."
        />
      ) : (
        <DataTable
          columns={columns}
          data={inquiries}
          keyExtractor={(row) => row.id}
        />
      )}
    </>
  );
}
