/**
 * HTTP client for OpenAccounting integration API.
 * OpenAccounting runs on port 4162.
 */

const ACCOUNTING_URL =
  process.env.OPENACCOUNTING_URL || "http://localhost:4162";

export interface AccountingCustomer {
  id: number;
  customerNumber: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  type: "B2B" | "B2C" | null;
  status: "active" | "inactive" | null;
}

export interface CreateOrderRequest {
  customerId: number;
  items: Array<{
    beschreibung: string;
    menge: number;
    einheit: string;
    einzelpreis: number;
    gesamtpreis: number;
  }>;
  netAmount: number;
  taxRate: number;
  taxAmount: number;
  grossAmount: number;
  notes?: string;
}

export interface CreateInvoiceRequest {
  orderId?: number;
  customerId: number;
  items: Array<{
    beschreibung: string;
    menge: number;
    einheit: string;
    einzelpreis: number;
    gesamtpreis: number;
  }>;
  netAmount: number;
  taxRate: number;
  taxAmount: number;
  grossAmount: number;
}

export async function getCustomers(): Promise<AccountingCustomer[]> {
  const res = await fetch(`${ACCOUNTING_URL}/api/integration/customers`);
  if (!res.ok) throw new Error(`Accounting API error: ${res.status}`);
  const data = await res.json();
  return data.customers;
}

export async function createOrder(
  order: CreateOrderRequest,
): Promise<{ id: number; number: string }> {
  const res = await fetch(`${ACCOUNTING_URL}/api/integration/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  if (!res.ok) throw new Error(`Create order failed: ${res.status}`);
  const data = await res.json();
  return data.order;
}

export async function updateOrderStatus(
  orderId: number,
  status: string,
): Promise<void> {
  const res = await fetch(
    `${ACCOUNTING_URL}/api/integration/orders/${orderId}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
  if (!res.ok) throw new Error(`Order status update failed: ${res.status}`);
}

export async function createInvoice(
  invoice: CreateInvoiceRequest,
): Promise<{ id: number; invoiceNumber: string }> {
  const res = await fetch(`${ACCOUNTING_URL}/api/integration/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(invoice),
  });
  if (!res.ok) throw new Error(`Create invoice failed: ${res.status}`);
  const data = await res.json();
  return data.invoice;
}
