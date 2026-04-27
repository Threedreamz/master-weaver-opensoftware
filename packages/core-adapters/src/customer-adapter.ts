import type {
  CanonicalCustomer,
  CustomerQuery,
} from "@opensoftware/core-types";

/**
 * Page of canonical customers + opaque cursor for the next page.
 * Cursor format is adapter-internal — clients pass it back unchanged.
 */
export interface CustomerPage {
  items: CanonicalCustomer[];
  nextCursor: string | null;
}

/**
 * Every module that owns customer-like records (openaccounting, openmailer, …)
 * implements this against its local DB. The admin panel reads via
 * `coreClient.customers.list()` which fans out to each subscribed adapter.
 *
 * TLocal — the module's native row type (e.g. AcctCustomer, MailerContact).
 */
export interface CustomerAdapter<TLocal> {
  /** Translate a native row to canonical wire format. */
  toCanonical(local: TLocal): CanonicalCustomer;

  /**
   * Translate a canonical record back to the native shape, for upsert.
   * Adapters MAY drop canonical fields they don't store — but MUST preserve
   * `id`, `email`, and any field used as a unique key locally.
   */
  fromCanonical(canonical: CanonicalCustomer): TLocal;

  list(query: CustomerQuery): Promise<CustomerPage>;
  get(id: string): Promise<CanonicalCustomer | null>;
  upsert(canonical: CanonicalCustomer): Promise<CanonicalCustomer>;
  delete(id: string): Promise<void>;
}
