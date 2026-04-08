"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  EmptyState,
  type Column,
} from "@opensoftware/ui";
import { Users, Plus, Search, X, Trash2 } from "lucide-react";
import {
  getCustomers,
  createCustomer,
  deleteCustomer,
  type CustomerRow,
} from "./actions";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    type: "B2C" as "B2B" | "B2C",
    street: "",
    zip: "",
    city: "",
    country: "DE",
    vatId: "",
    notes: "",
  });

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    const data = await getCustomers(q);
    setCustomers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load(search || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await createCustomer(formData);
    setSaving(false);

    if (result.success) {
      setShowForm(false);
      setFormData({
        name: "",
        company: "",
        email: "",
        phone: "",
        type: "B2C",
        street: "",
        zip: "",
        city: "",
        country: "DE",
        vatId: "",
        notes: "",
      });
      load(search || undefined);
    } else {
      setError(result.error || "Failed to create customer");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this customer? This action cannot be undone.")) return;
    const result = await deleteCustomer(id);
    if (result.success) {
      load(search || undefined);
    }
  };

  const columns: Column<CustomerRow>[] = [
    {
      key: "customerNumber",
      header: "Customer No.",
      className: "w-32 font-mono text-xs",
    },
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {row.name}
        </span>
      ),
    },
    {
      key: "company",
      header: "Company",
      render: (row) => row.company || "-",
    },
    {
      key: "email",
      header: "Email",
      render: (row) =>
        row.email ? (
          <a
            href={`mailto:${row.email}`}
            className="text-emerald-600 hover:underline"
          >
            {row.email}
          </a>
        ) : (
          "-"
        ),
    },
    {
      key: "type",
      header: "Type",
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            row.type === "B2B"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          {row.type}
        </span>
      ),
      className: "w-20",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status || "active"} />,
      className: "w-24",
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(row.id);
          }}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
          aria-label={`Delete customer ${row.name}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
      className: "w-12",
    },
  ];

  return (
    <>
      <PageHeader
        title="Customers"
        description="Manage your customer accounts"
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-2"
          >
            {showForm ? (
              <>
                <X className="w-4 h-4" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add Customer
              </>
            )}
          </button>
        }
      />

      {/* Search bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, company, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            aria-label="Search customers"
          />
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 p-6 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            New Customer
          </h3>
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="cust-name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Name *
              </label>
              <input
                id="cust-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="cust-company"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Company
              </label>
              <input
                id="cust-company"
                type="text"
                value={formData.company}
                onChange={(e) =>
                  setFormData({ ...formData, company: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="cust-email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Email
              </label>
              <input
                id="cust-email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="cust-phone"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Phone
              </label>
              <input
                id="cust-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="cust-type"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Type
              </label>
              <select
                id="cust-type"
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as "B2B" | "B2C",
                  })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="B2C">B2C</option>
                <option value="B2B">B2B</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="cust-vatid"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                VAT ID
              </label>
              <input
                id="cust-vatid"
                type="text"
                value={formData.vatId}
                onChange={(e) =>
                  setFormData({ ...formData, vatId: e.target.value })
                }
                placeholder="DE123456789"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="cust-street"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Street
              </label>
              <input
                id="cust-street"
                type="text"
                value={formData.street}
                onChange={(e) =>
                  setFormData({ ...formData, street: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="cust-zip"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                ZIP
              </label>
              <input
                id="cust-zip"
                type="text"
                value={formData.zip}
                onChange={(e) =>
                  setFormData({ ...formData, zip: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="cust-city"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                City
              </label>
              <input
                id="cust-city"
                type="text"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <label
              htmlFor="cust-notes"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Notes
            </label>
            <textarea
              id="cust-notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Create Customer"}
            </button>
          </div>
        </form>
      )}

      {/* Table or empty state */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : customers.length === 0 && !search ? (
        <EmptyState
          icon={<Users className="w-12 h-12" />}
          title="No customers yet"
          description="Add your first customer to start managing accounts and invoices."
          action={
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
            >
              Add Customer
            </button>
          }
        />
      ) : customers.length === 0 && search ? (
        <div className="text-center py-12 text-gray-500">
          No customers matching &quot;{search}&quot;
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
          <DataTable
            columns={columns}
            data={customers}
            keyExtractor={(row) => row.id}
          />
        </div>
      )}
    </>
  );
}
