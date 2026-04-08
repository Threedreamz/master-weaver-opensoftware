"use client";

import { useState } from "react";
import { Printer, Plus, Pencil, Trash2, X } from "lucide-react";

interface PrinterDevice {
  id: string;
  name: string;
  vendor: string;
  model: string;
  protocol: string;
  host: string;
  port: number;
  apiKey: string;
  bedX: number;
  bedY: number;
  bedZ: number;
  nozzleDiameter: number;
  status: "online" | "offline" | "printing";
}

const VENDORS = ["Bambu Lab", "Creality", "Prusa", "Voron", "Other"];
const PROTOCOLS = [
  "Moonraker",
  "OctoPrint",
  "Bambu Cloud",
  "Bambu MQTT",
  "Formlabs",
];

const DEMO_PRINTERS: PrinterDevice[] = [
  {
    id: "p1",
    name: "Bambu X1C",
    vendor: "Bambu Lab",
    model: "X1 Carbon",
    protocol: "Bambu Cloud",
    host: "192.168.1.50",
    port: 8883,
    apiKey: "",
    bedX: 256,
    bedY: 256,
    bedZ: 256,
    nozzleDiameter: 0.4,
    status: "printing",
  },
  {
    id: "p2",
    name: "Voron 2.4",
    vendor: "Voron",
    model: "2.4r2 350mm",
    protocol: "Moonraker",
    host: "192.168.1.51",
    port: 7125,
    apiKey: "abc123",
    bedX: 350,
    bedY: 350,
    bedZ: 340,
    nozzleDiameter: 0.4,
    status: "online",
  },
  {
    id: "p3",
    name: "Prusa MK4",
    vendor: "Prusa",
    model: "MK4",
    protocol: "OctoPrint",
    host: "192.168.1.52",
    port: 5000,
    apiKey: "",
    bedX: 250,
    bedY: 210,
    bedZ: 220,
    nozzleDiameter: 0.4,
    status: "offline",
  },
];

function StatusBadge({
  status,
}: {
  status: "online" | "offline" | "printing";
}) {
  const colors = {
    online: "bg-green-500/20 text-green-400 border-green-500/30",
    offline: "bg-red-500/20 text-red-400 border-red-500/30",
    printing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors[status]}`}
    >
      {status}
    </span>
  );
}

function ProtocolBadge({ protocol }: { protocol: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-600 bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
      {protocol}
    </span>
  );
}

const emptyPrinter: Omit<PrinterDevice, "id" | "status"> = {
  name: "",
  vendor: "Bambu Lab",
  model: "",
  protocol: "Moonraker",
  host: "",
  port: 7125,
  apiKey: "",
  bedX: 250,
  bedY: 210,
  bedZ: 210,
  nozzleDiameter: 0.4,
};

export default function DevicesPage() {
  const [printers, setPrinters] = useState<PrinterDevice[]>(DEMO_PRINTERS);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyPrinter);

  const handleSave = () => {
    if (!form.name.trim()) return;

    if (editId) {
      setPrinters((prev) =>
        prev.map((p) =>
          p.id === editId ? { ...p, ...form } : p
        )
      );
    } else {
      const newPrinter: PrinterDevice = {
        ...form,
        id: `p${Date.now()}`,
        status: "offline",
      };
      setPrinters((prev) => [...prev, newPrinter]);
    }

    setShowForm(false);
    setEditId(null);
    setForm(emptyPrinter);
  };

  const handleEdit = (printer: PrinterDevice) => {
    setEditId(printer.id);
    setForm({
      name: printer.name,
      vendor: printer.vendor,
      model: printer.model,
      protocol: printer.protocol,
      host: printer.host,
      port: printer.port,
      apiKey: printer.apiKey,
      bedX: printer.bedX,
      bedY: printer.bedY,
      bedZ: printer.bedZ,
      nozzleDiameter: printer.nozzleDiameter,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setPrinters((prev) => prev.filter((p) => p.id !== id));
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditId(null);
    setForm(emptyPrinter);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Devices</h1>
        {!showForm && (
          <button
            onClick={() => {
              setForm(emptyPrinter);
              setEditId(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
          >
            <Plus size={16} />
            Add Printer
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-100">
              {editId ? "Edit Printer" : "Add Printer"}
            </h2>
            <button
              onClick={handleCancel}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="My Printer"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Vendor */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Vendor
              </label>
              <select
                value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              >
                {VENDORS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* Model */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Model
              </label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="X1 Carbon"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Protocol */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Protocol
              </label>
              <select
                value={form.protocol}
                onChange={(e) =>
                  setForm({ ...form, protocol: e.target.value })
                }
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              >
                {PROTOCOLS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Host */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Host / IP
              </label>
              <input
                type="text"
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                placeholder="192.168.1.50"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Port */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Port
              </label>
              <input
                type="number"
                value={form.port}
                onChange={(e) =>
                  setForm({ ...form, port: parseInt(e.target.value) || 0 })
                }
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* API Key */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                API Key (optional)
              </label>
              <input
                type="text"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                placeholder="Optional"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Bed Size */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Bed Size (X x Y x Z mm)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={form.bedX}
                  onChange={(e) =>
                    setForm({ ...form, bedX: parseInt(e.target.value) || 0 })
                  }
                  placeholder="X"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                />
                <input
                  type="number"
                  value={form.bedY}
                  onChange={(e) =>
                    setForm({ ...form, bedY: parseInt(e.target.value) || 0 })
                  }
                  placeholder="Y"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                />
                <input
                  type="number"
                  value={form.bedZ}
                  onChange={(e) =>
                    setForm({ ...form, bedZ: parseInt(e.target.value) || 0 })
                  }
                  placeholder="Z"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Nozzle Diameter */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Nozzle Diameter (mm)
              </label>
              <input
                type="number"
                step="0.1"
                value={form.nozzleDiameter}
                onChange={(e) =>
                  setForm({
                    ...form,
                    nozzleDiameter: parseFloat(e.target.value) || 0.4,
                  })
                }
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-5">
            <button
              onClick={handleCancel}
              className="rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name.trim()}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editId ? "Save Changes" : "Add Printer"}
            </button>
          </div>
        </div>
      )}

      {/* Printer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {printers.map((printer) => (
          <div
            key={printer.id}
            className="rounded-lg border border-zinc-700 bg-zinc-900 p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-zinc-500" />
                <h3 className="font-semibold text-zinc-100">{printer.name}</h3>
              </div>
              <StatusBadge status={printer.status} />
            </div>

            <div className="space-y-1.5 text-sm text-zinc-400 mb-4">
              <p>
                {printer.vendor} {printer.model}
              </p>
              <div>
                <ProtocolBadge protocol={printer.protocol} />
              </div>
              <p>
                Bed: {printer.bedX} x {printer.bedY} x {printer.bedZ} mm
              </p>
              <p>Nozzle: {printer.nozzleDiameter} mm</p>
            </div>

            <div className="flex items-center gap-2 border-t border-zinc-800 pt-3">
              <button
                onClick={() => handleEdit(printer)}
                className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                <Pencil size={12} />
                Edit
              </button>
              <button
                onClick={() => handleDelete(printer.id)}
                className="flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={12} />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {printers.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <Printer size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No printers configured</p>
          <p className="text-sm mt-1">
            Click &quot;Add Printer&quot; to connect your first device.
          </p>
        </div>
      )}
    </div>
  );
}
