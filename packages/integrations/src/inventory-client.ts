/**
 * HTTP client for OpenInventory integration API.
 * OpenInventory runs on port 4170.
 */

const INVENTORY_URL =
  process.env.OPENINVENTORY_URL || "http://localhost:4170";

export interface InventoryArticle {
  id: number;
  artikelnummer: string;
  bezeichnung: string;
  beschreibung: string | null;
  kategorie: string | null;
  kategorieId: number | null;
  einheit: string | null;
  mindestbestand: number | null;
  lagerbestand: number | null;
  lagerort: string | null;
  preisProEinheit: number | null;
  lieferantId: number | null;
  notizen: string | null;
  status: "aktiv" | "inaktiv" | "ausgelaufen" | null;
  createdAt: string | null;
}

export interface StockMovement {
  artikelId: number;
  typ: "zugang" | "abgang" | "korrektur" | "inventur";
  menge: number;
  referenzTyp?: string;
  referenzId?: number;
  notizen?: string;
}

export interface ProductionOrder {
  id: number;
  number: string;
  orderId: number | null;
  customerName: string | null;
  customerCompany: string | null;
  items: Array<{ beschreibung: string; menge: number }> | null;
  currentStep: string | null;
  status: "neu" | "in_bearbeitung" | "abgeschlossen" | "storniert" | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export async function getArticles(): Promise<InventoryArticle[]> {
  const res = await fetch(`${INVENTORY_URL}/api/integration/articles`);
  if (!res.ok) throw new Error(`Inventory API error: ${res.status}`);
  const data = await res.json();
  return data.articles;
}

export async function getLowStockArticles(): Promise<InventoryArticle[]> {
  const res = await fetch(
    `${INVENTORY_URL}/api/integration/articles/low-stock`,
  );
  if (!res.ok) throw new Error(`Inventory API error: ${res.status}`);
  const data = await res.json();
  return data.articles;
}

export async function createStockMovement(
  movement: StockMovement,
): Promise<void> {
  const res = await fetch(
    `${INVENTORY_URL}/api/integration/stock-movements`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(movement),
    },
  );
  if (!res.ok) throw new Error(`Stock movement failed: ${res.status}`);
}

export async function getProductionOrders(): Promise<ProductionOrder[]> {
  const res = await fetch(
    `${INVENTORY_URL}/api/integration/production-orders`,
  );
  if (!res.ok) throw new Error(`Inventory API error: ${res.status}`);
  const data = await res.json();
  return data.orders;
}

export async function updateProductionOrderStatus(
  id: number,
  status: string,
): Promise<void> {
  const res = await fetch(
    `${INVENTORY_URL}/api/integration/production-orders/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
  if (!res.ok)
    throw new Error(`Production order update failed: ${res.status}`);
}
