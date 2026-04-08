"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, DataTable, StatusBadge, type Column } from "@opensoftware/ui";
import { Truck, Plus, Star, Loader2, Trash2, X } from "lucide-react";
import { getSuppliers, createSupplier, deleteSupplier } from "./actions";

interface Supplier {
  id: number;
  supplierNumber: string;
  name: string;
  company: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  paymentTermsDays: number | null;
  rating: number | null;
  status: string | null;
}

function RatingStars({ rating }: { rating: number | null }) {
  const r = rating ?? 0;
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`${r} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i <= r
              ? "fill-amber-400 text-amber-400"
              : "text-gray-300 dark:text-gray-600"
          }`}
        />
      ))}
    </div>
  );
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPaymentDays, setFormPaymentDays] = useState("30");
  const [formRating, setFormRating] = useState("3");

  const loadSuppliers = useCallback(async () => {
    const data = await getSuppliers();
    setSuppliers(data as Supplier[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    const result = await createSupplier({
      name: formName,
      contactName: formContact || undefined,
      email: formEmail || undefined,
      phone: formPhone || undefined,
      paymentTermsDays: parseInt(formPaymentDays, 10) || 30,
      rating: parseInt(formRating, 10) || 3,
    });
    if (result.success) {
      setShowForm(false);
      setFormName("");
      setFormContact("");
      setFormEmail("");
      setFormPhone("");
      setFormPaymentDays("30");
      setFormRating("3");
      await loadSuppliers();
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this supplier?")) return;
    await deleteSupplier(id);
    await loadSuppliers();
  };

  const columns: Column<Supplier>[] = [
    { key: "supplierNumber", header: "No.", className: "w-24" },
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{row.name}</p>
          {row.company && (
            <p className="text-xs text-gray-500">{row.company}</p>
          )}
        </div>
      ),
    },
    { key: "contactName", header: "Contact" },
    { key: "email", header: "Email" },
    { key: "phone", header: "Phone" },
    {
      key: "paymentTermsDays",
      header: "Payment Terms",
      render: (row) => (
        <span className="text-sm">{row.paymentTermsDays ?? 30} days</span>
      ),
      className: "w-32",
    },
    {
      key: "rating",
      header: "Rating",
      render: (row) => <RatingStars rating={row.rating} />,
      className: "w-28",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status ?? "active"} />,
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
          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
          aria-label={`Delete supplier ${row.name}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
      className: "w-12",
    },
  ];

  if (loading) {
    return (
      <>
        <PageHeader title="Suppliers" description="Manage your supplier accounts" />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Manage your supplier accounts"
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-2"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancel" : "Add Supplier"}
          </button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Add Supplier Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              New Supplier
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Supplier name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={formContact}
                  onChange={(e) => setFormContact(e.target.value)}
                  placeholder="Contact name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+49 ..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Payment Terms (days)
                </label>
                <input
                  type="number"
                  value={formPaymentDays}
                  onChange={(e) => setFormPaymentDays(e.target.value)}
                  min={1}
                  max={365}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Rating (1-5)
                </label>
                <select
                  value={formRating}
                  onChange={(e) => setFormRating(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                >
                  {[1, 2, 3, 4, 5].map((v) => (
                    <option key={v} value={v}>
                      {v} Star{v !== 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleCreate}
                disabled={!formName.trim() || saving}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Supplier
              </button>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
          <DataTable
            columns={columns}
            data={suppliers}
            keyExtractor={(row) => row.id}
            emptyMessage="No suppliers yet. Click 'Add Supplier' to create one."
          />
        </div>
      </div>
    </>
  );
}
