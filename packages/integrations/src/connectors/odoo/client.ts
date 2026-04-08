import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  OdooPartner,
  OdooInvoice,
  OdooJournalEntry,
  OdooProduct,
  OdooPayment,
  OdooJsonRpcResponse,
  OdooDomainFilter,
  OdooSearchReadParams,
  OdooClientConfig,
} from "./types.js";

/**
 * Odoo JSON-RPC API client.
 *
 * Open-source ERP platform with partners, invoices, journal entries,
 * products, and payments.
 *
 * Uses JSON-RPC protocol with API key authentication. All model
 * operations go through the `/jsonrpc` endpoint.
 */
export class OdooClient extends BaseIntegrationClient {
  private database: string;
  private uid: number;
  private apiKey: string;
  private rpcId = 0;

  constructor(config: OdooClientConfig) {
    super({
      baseUrl: config.serverUrl.replace(/\/$/, ""),
      authType: "custom",
      credentials: {},
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 200 },
      defaultHeaders: {
        "Content-Type": "application/json",
      },
    });
    this.database = config.database;
    this.uid = config.uid;
    this.apiKey = config.apiKey;
  }

  private nextRpcId(): number {
    return ++this.rpcId;
  }

  /**
   * Execute an Odoo JSON-RPC call.
   */
  private async rpcCall<T = unknown>(
    model: string,
    method: string,
    args: unknown[],
    kwargs?: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    const response = await this.post<OdooJsonRpcResponse<T>>("/jsonrpc", {
      jsonrpc: "2.0",
      method: "call",
      id: this.nextRpcId(),
      params: {
        service: "object",
        method: "execute_kw",
        args: [this.database, this.uid, this.apiKey, model, method, args, kwargs ?? {}],
      },
    });

    if (response.data.error) {
      throw new Error(
        `Odoo RPC Error: ${response.data.error.data?.message ?? response.data.error.message}`
      );
    }

    return {
      data: response.data.result as T,
      status: response.status,
      headers: response.headers,
    };
  }

  /**
   * Generic search_read operation on any model.
   */
  async searchRead<T = Record<string, unknown>>(
    model: string,
    params?: OdooSearchReadParams
  ): Promise<ApiResponse<T[]>> {
    return this.rpcCall<T[]>(model, "search_read", [params?.domain ?? []], {
      fields: params?.fields ?? [],
      limit: params?.limit ?? 80,
      offset: params?.offset ?? 0,
      order: params?.order ?? "id desc",
    });
  }

  /**
   * Generic read operation on any model.
   */
  async read<T = Record<string, unknown>>(
    model: string,
    ids: number[],
    fields?: string[]
  ): Promise<ApiResponse<T[]>> {
    return this.rpcCall<T[]>(model, "read", [ids], {
      fields: fields ?? [],
    });
  }

  /**
   * Generic create operation.
   */
  async create(
    model: string,
    values: Record<string, unknown>
  ): Promise<ApiResponse<number>> {
    return this.rpcCall<number>(model, "create", [values]);
  }

  /**
   * Generic write (update) operation.
   */
  async write(
    model: string,
    ids: number[],
    values: Record<string, unknown>
  ): Promise<ApiResponse<boolean>> {
    return this.rpcCall<boolean>(model, "write", [ids, values]);
  }

  /**
   * Generic unlink (delete) operation.
   */
  async unlink(model: string, ids: number[]): Promise<ApiResponse<boolean>> {
    return this.rpcCall<boolean>(model, "unlink", [ids]);
  }

  // ==================== Partners ====================

  /** Search and read partners. */
  async listPartners(
    params?: OdooSearchReadParams
  ): Promise<ApiResponse<OdooPartner[]>> {
    return this.searchRead<OdooPartner>("res.partner", params);
  }

  /** Get partners by IDs. */
  async getPartners(
    ids: number[],
    fields?: string[]
  ): Promise<ApiResponse<OdooPartner[]>> {
    return this.read<OdooPartner>("res.partner", ids, fields);
  }

  /** Create a partner. */
  async createPartner(
    partner: Partial<OdooPartner>
  ): Promise<ApiResponse<number>> {
    return this.create("res.partner", partner as Record<string, unknown>);
  }

  /** Update a partner. */
  async updatePartner(
    id: number,
    partner: Partial<OdooPartner>
  ): Promise<ApiResponse<boolean>> {
    return this.write("res.partner", [id], partner as Record<string, unknown>);
  }

  /** Delete partners. */
  async deletePartners(ids: number[]): Promise<ApiResponse<boolean>> {
    return this.unlink("res.partner", ids);
  }

  // ==================== Invoices ====================

  /** Search and read invoices (account.move). */
  async listInvoices(
    params?: OdooSearchReadParams
  ): Promise<ApiResponse<OdooInvoice[]>> {
    const domain: OdooDomainFilter[] = params?.domain ?? [];
    // Default: only show invoices/bills, not journal entries
    if (!domain.some(([field]) => field === "move_type")) {
      domain.push(["move_type", "in", ["out_invoice", "out_refund", "in_invoice", "in_refund"]]);
    }
    return this.searchRead<OdooInvoice>("account.move", { ...params, domain });
  }

  /** Get invoices by IDs. */
  async getInvoices(
    ids: number[],
    fields?: string[]
  ): Promise<ApiResponse<OdooInvoice[]>> {
    return this.read<OdooInvoice>("account.move", ids, fields);
  }

  /** Create an invoice. */
  async createInvoice(
    invoice: Partial<OdooInvoice>
  ): Promise<ApiResponse<number>> {
    return this.create("account.move", invoice as Record<string, unknown>);
  }

  /** Update an invoice. */
  async updateInvoice(
    id: number,
    invoice: Partial<OdooInvoice>
  ): Promise<ApiResponse<boolean>> {
    return this.write("account.move", [id], invoice as Record<string, unknown>);
  }

  /** Confirm (post) a draft invoice. */
  async confirmInvoice(id: number): Promise<ApiResponse<unknown>> {
    return this.rpcCall("account.move", "action_post", [[id]]);
  }

  /** Cancel an invoice. */
  async cancelInvoice(id: number): Promise<ApiResponse<unknown>> {
    return this.rpcCall("account.move", "button_cancel", [[id]]);
  }

  /** Reset an invoice to draft. */
  async resetToDraft(id: number): Promise<ApiResponse<unknown>> {
    return this.rpcCall("account.move", "button_draft", [[id]]);
  }

  // ==================== Journal Entries ====================

  /** Search and read journal entries. */
  async listJournalEntries(
    params?: OdooSearchReadParams
  ): Promise<ApiResponse<OdooJournalEntry[]>> {
    const domain: OdooDomainFilter[] = params?.domain ?? [];
    if (!domain.some(([field]) => field === "move_type")) {
      domain.push(["move_type", "=", "entry"]);
    }
    return this.searchRead<OdooJournalEntry>("account.move", { ...params, domain });
  }

  /** Create a journal entry. */
  async createJournalEntry(
    entry: Partial<OdooJournalEntry>
  ): Promise<ApiResponse<number>> {
    return this.create("account.move", {
      ...entry,
      move_type: "entry",
    } as Record<string, unknown>);
  }

  // ==================== Products ====================

  /** Search and read products. */
  async listProducts(
    params?: OdooSearchReadParams
  ): Promise<ApiResponse<OdooProduct[]>> {
    return this.searchRead<OdooProduct>("product.product", params);
  }

  /** Get products by IDs. */
  async getProducts(
    ids: number[],
    fields?: string[]
  ): Promise<ApiResponse<OdooProduct[]>> {
    return this.read<OdooProduct>("product.product", ids, fields);
  }

  /** Create a product. */
  async createProduct(
    product: Partial<OdooProduct>
  ): Promise<ApiResponse<number>> {
    return this.create("product.product", product as Record<string, unknown>);
  }

  /** Update a product. */
  async updateProduct(
    id: number,
    product: Partial<OdooProduct>
  ): Promise<ApiResponse<boolean>> {
    return this.write("product.product", [id], product as Record<string, unknown>);
  }

  /** Delete products. */
  async deleteProducts(ids: number[]): Promise<ApiResponse<boolean>> {
    return this.unlink("product.product", ids);
  }

  // ==================== Payments ====================

  /** Search and read payments. */
  async listPayments(
    params?: OdooSearchReadParams
  ): Promise<ApiResponse<OdooPayment[]>> {
    return this.searchRead<OdooPayment>("account.payment", params);
  }

  /** Get payments by IDs. */
  async getPayments(
    ids: number[],
    fields?: string[]
  ): Promise<ApiResponse<OdooPayment[]>> {
    return this.read<OdooPayment>("account.payment", ids, fields);
  }

  /** Create a payment. */
  async createPayment(
    payment: Partial<OdooPayment>
  ): Promise<ApiResponse<number>> {
    return this.create("account.payment", payment as Record<string, unknown>);
  }

  /** Confirm a draft payment. */
  async confirmPayment(id: number): Promise<ApiResponse<unknown>> {
    return this.rpcCall("account.payment", "action_post", [[id]]);
  }

  /** Cancel a payment. */
  async cancelPayment(id: number): Promise<ApiResponse<unknown>> {
    return this.rpcCall("account.payment", "action_cancel", [[id]]);
  }
}
