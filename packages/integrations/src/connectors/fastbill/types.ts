// ==================== FastBill API Types ====================
// German invoicing / accounting (fastbill.com)
// API key authentication (email + API key as basic auth)

/** FastBill customer */
export interface FastbillCustomer {
  CUSTOMER_ID?: number;
  CUSTOMER_NUMBER?: string;
  DAYS_FOR_PAYMENT?: number;
  CREATED?: string;
  PAYMENT_TYPE?: FastbillPaymentType;
  BANK_NAME?: string;
  BANK_ACCOUNT_NUMBER?: string;
  BANK_CODE?: string;
  BANK_ACCOUNT_OWNER?: string;
  BANK_IBAN?: string;
  BANK_BIC?: string;
  SHOW_PAYMENT_NOTICE?: 0 | 1;
  CUSTOMER_TYPE?: "business" | "consumer";
  ORGANIZATION?: string;
  SALUTATION?: "mr" | "mrs" | "family" | "mr_and_mrs" | "";
  FIRST_NAME?: string;
  LAST_NAME?: string;
  ADDRESS?: string;
  ADDRESS_2?: string;
  ZIPCODE?: string;
  CITY?: string;
  COUNTRY_CODE?: string;
  SECONDARY_ADDRESS?: string;
  PHONE?: string;
  PHONE_2?: string;
  FAX?: string;
  MOBILE?: string;
  EMAIL?: string;
  WEBSITE?: string;
  VAT_ID?: string;
  CURRENCY_CODE?: string;
  LASTUPDATE?: string;
  TAGS?: string;
  DOCUMENT_HEADER?: string;
  COMMENT?: string;
}

export type FastbillPaymentType =
  | 1  // wire transfer
  | 2  // direct debit
  | 3  // cash
  | 4  // PayPal
  | 5  // advance payment
  | 6  // credit card;

/** FastBill invoice */
export interface FastbillInvoice {
  INVOICE_ID?: number;
  INVOICE_NUMBER?: string;
  INVOICE_TITLE?: string;
  CUSTOMER_ID: number;
  CUSTOMER_NUMBER?: string;
  CUSTOMER_COSTCENTER_ID?: number;
  ORGANIZATION?: string;
  SALUTATION?: string;
  FIRST_NAME?: string;
  LAST_NAME?: string;
  ADDRESS?: string;
  ADDRESS_2?: string;
  ZIPCODE?: string;
  CITY?: string;
  COUNTRY_CODE?: string;
  DELIVERY_DATE?: string;
  INVOICE_DATE?: string;
  DUE_DATE?: string;
  DAYS_FOR_PAYMENT?: number;
  PAYMENT_TYPE?: FastbillPaymentType;
  BANK_NAME?: string;
  BANK_ACCOUNT_NUMBER?: string;
  BANK_CODE?: string;
  BANK_BIC?: string;
  BANK_IBAN?: string;
  BANK_ACCOUNT_OWNER?: string;
  CURRENCY_CODE?: string;
  TEMPLATE_ID?: number;
  TYPE?: "outgoing" | "draft" | "credit";
  STATUS?: FastbillInvoiceStatus;
  IS_CANCELED?: 0 | 1;
  PAID_DATE?: string;
  SUB_TOTAL?: number;
  VAT_TOTAL?: number;
  TOTAL?: number;
  PAYMENTS?: FastbillPaymentInfo[];
  ITEMS?: FastbillInvoiceItem[];
  INTROTEXT?: string;
  NOTE?: string;
  CASH_DISCOUNT_PERCENT?: string;
  CASH_DISCOUNT_DAYS?: number;
  DOCUMENT_URL?: string;
}

export type FastbillInvoiceStatus = "draft" | "unpaid" | "overdue" | "paid" | "canceled";

export interface FastbillPaymentInfo {
  PAYMENT_ID: number;
  DATE: string;
  AMOUNT: number;
  NOTE?: string;
  TYPE?: string;
}

/** FastBill invoice item */
export interface FastbillInvoiceItem {
  INVOICE_ITEM_ID?: number;
  ARTICLE_NUMBER?: string;
  DESCRIPTION: string;
  QUANTITY: number;
  UNIT_PRICE: number;
  VAT_PERCENT: number;
  VAT_VALUE?: number;
  COMPLETE_NET?: number;
  COMPLETE_GROSS?: number;
  SORT_ORDER?: number;
  CATEGORY_ID?: number;
}

/** FastBill article / product */
export interface FastbillArticle {
  ARTICLE_ID?: number;
  ARTICLE_NUMBER?: string;
  TITLE: string;
  DESCRIPTION?: string;
  UNIT_PRICE: number;
  VAT_PERCENT?: number;
  IS_GROSS?: 0 | 1;
  CURRENCY_CODE?: string;
  TAGS?: string;
}

/** FastBill expense */
export interface FastbillExpense {
  EXPENSE_ID?: number;
  INVOICE_ID?: string;
  INVOICE_NUMBER?: string;
  INVOICE_DATE?: string;
  DUE_DATE?: string;
  ORGANIZATION?: string;
  CUSTOMER_ID?: number;
  COMMENT?: string;
  PAID_DATE?: string;
  SUB_TOTAL?: number;
  VAT_TOTAL?: number;
  TOTAL?: number;
  CURRENCY_CODE?: string;
  CATEGORY?: string;
  DOCUMENT_URL?: string;
  NOTE?: string;
  ITEMS?: FastbillExpenseItem[];
}

export interface FastbillExpenseItem {
  EXPENSE_ITEM_ID?: number;
  DESCRIPTION: string;
  UNIT_PRICE: number;
  VAT_PERCENT: number;
  VAT_VALUE?: number;
  QUANTITY?: number;
  CATEGORY_ID?: number;
}

/** FastBill revenue */
export interface FastbillRevenue {
  REVENUE_ID?: number;
  INVOICE_ID?: number;
  INVOICE_NUMBER?: string;
  CUSTOMER_ID?: number;
  ORGANIZATION?: string;
  SUB_TOTAL?: number;
  VAT_TOTAL?: number;
  TOTAL?: number;
  PAID_DATE?: string;
  INVOICE_DATE?: string;
  DUE_DATE?: string;
  CURRENCY_CODE?: string;
  TYPE?: string;
  COMMENT?: string;
  ITEMS?: FastbillRevenueItem[];
}

export interface FastbillRevenueItem {
  REVENUE_ITEM_ID?: number;
  DESCRIPTION: string;
  UNIT_PRICE: number;
  VAT_PERCENT: number;
  QUANTITY?: number;
}

// ==================== Request / Response ====================

export interface FastbillFilter {
  [key: string]: string | number | undefined;
}

export interface FastbillApiRequest {
  SERVICE: string;
  FILTER?: FastbillFilter;
  LIMIT?: number;
  OFFSET?: number;
  DATA?: Record<string, unknown>;
}

export interface FastbillApiResponse<T> {
  REQUEST: {
    SERVICE: string;
    LIMIT?: number;
    OFFSET?: number;
  };
  RESPONSE: T;
}

export interface FastbillClientConfig {
  /** FastBill account email address */
  email: string;
  /** FastBill API key */
  apiKey: string;
  /** Request timeout in ms */
  timeout?: number;
}
