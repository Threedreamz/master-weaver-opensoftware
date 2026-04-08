"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@opensoftware/ui";
import {
  Building2,
  Search,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Shield,
  Loader2,
} from "lucide-react";
import {
  checkVatNumber,
  getRegisterLinks,
  type ViesResult,
  type RegisterLink,
} from "./actions";

const EU_COUNTRIES = [
  { code: "DE", name: "Germany" },
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "BG", name: "Bulgaria" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "EE", name: "Estonia" },
  { code: "ES", name: "Spain" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GR", name: "Greece" },
  { code: "HR", name: "Croatia" },
  { code: "HU", name: "Hungary" },
  { code: "IE", name: "Ireland" },
  { code: "IT", name: "Italy" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "LV", name: "Latvia" },
  { code: "MT", name: "Malta" },
  { code: "NL", name: "Netherlands" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "SE", name: "Sweden" },
  { code: "SI", name: "Slovenia" },
  { code: "SK", name: "Slovakia" },
];

export default function BusinessCheckerPage() {
  const [countryCode, setCountryCode] = useState("DE");
  const [vatNumber, setVatNumber] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ViesResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registerLinks, setRegisterLinks] = useState<RegisterLink[]>([]);

  useEffect(() => {
    getRegisterLinks().then(setRegisterLinks);
  }, []);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vatNumber.trim()) return;

    setChecking(true);
    setError(null);
    setResult(null);

    const res = await checkVatNumber(countryCode, vatNumber.trim());
    setChecking(false);

    if (res.success && res.data) {
      setResult(res.data);
    } else {
      setError(res.error ?? "Validation failed");
    }
  };

  return (
    <>
      <PageHeader
        title="Business Checker"
        description="Verify businesses via EU VAT validation and German public registers"
      />

      {/* VAT Validation Section */}
      <div className="mb-8 p-6 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-600" />
          VAT Number Validation
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Check if a VAT ID is valid using the official EU VIES system. Works for all 27 EU member states.
        </p>

        <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-40">
            <label htmlFor="bc-country" className="block text-xs font-medium text-gray-500 mb-1">
              Country
            </label>
            <select
              id="bc-country"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {EU_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label htmlFor="bc-vat" className="block text-xs font-medium text-gray-500 mb-1">
              VAT Number
            </label>
            <input
              id="bc-vat"
              type="text"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              placeholder="e.g. 811128135 (Siemens AG)"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={checking || !vatNumber.trim()}
              className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
            >
              {checking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Check VAT
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* VAT Result */}
      {result && (
        <div className={`mb-8 p-6 rounded-lg border ${
          result.valid
            ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
            : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
        }`}>
          <div className="flex items-start gap-3">
            {result.valid ? (
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {result.valid ? "Valid VAT Number" : "Invalid VAT Number"}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-mono">
                {result.countryCode}{result.vatNumber}
              </p>

              {result.name && (
                <div className="mt-3">
                  <span className="text-xs font-medium text-gray-500">Company Name</span>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{result.name}</p>
                </div>
              )}

              {result.address && (
                <div className="mt-2">
                  <span className="text-xs font-medium text-gray-500">Address</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{result.address.trim()}</p>
                </div>
              )}

              {result.valid && !result.name && result.countryCode === "DE" && (
                <p className="mt-3 text-xs text-gray-500 italic">
                  Germany does not disclose company names via VIES due to privacy regulations. Use the Handelsregister or Unternehmensregister links below for full details.
                </p>
              )}

              <p className="mt-3 text-xs text-gray-400">
                Checked: {new Date(result.requestDate).toLocaleString("de-DE")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Register Links */}
      <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Public Register Search
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Search official German and EU registers for detailed company information, financial statements, and insolvency data.
          </p>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {registerLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                  {link.name}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">{link.description}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 flex-shrink-0 ml-4" />
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
