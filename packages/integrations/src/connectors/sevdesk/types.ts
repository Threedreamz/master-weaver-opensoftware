// ==================== sevDesk API Types ====================
// German cloud accounting / invoicing (sevdesk.de)
// API key authentication via token query parameter

/** sevDesk contact */
export interface SevdeskContact {
  id?: number;
  objectName?: "Contact";
  create?: string;
  update?: string;
  name?: string;
  status?: number;
  customerNumber?: string;
  surename?: string; // sevDesk uses "surename" spelling
  familyname?: string;
  titel?: string;
  category?: SevdeskObjectRef;
  description?: string;
  academicTitle?: string;
  gender?: string;
  name2?: string;
  birthday?: string;
  vatNumber?: string;
  bankAccount?: string;
  bankNumber?: string;
  defaultCashbackTime?: number;
  defaultCashbackPercent?: number;
  defaultTimeToPay?: number;
  taxNumber?: string;
  taxSet?: SevdeskObjectRef;
}

/** sevDesk contact address */
export interface SevdeskContactAddress {
  id?: number;
  objectName?: "ContactAddress";
  contact: SevdeskObjectRef;
  street?: string;
  zip?: string;
  city?: string;
  country?: SevdeskObjectRef;
  category?: SevdeskObjectRef;
}

/** sevDesk object reference (used throughout API) */
export interface SevdeskObjectRef {
  id: number;
  objectName: string;
}

/** sevDesk invoice */
export interface SevdeskInvoice {
  id?: number;
  objectName?: "Invoice";
  create?: string;
  update?: string;
  invoiceNumber?: string;
  contact: SevdeskObjectRef;
  invoiceDate: string;
  header?: string;
  headText?: string;
  footText?: string;
  timeToPay?: number;
  discount?: number;
  address?: string;
  addressCountry?: SevdeskObjectRef;
  payDate?: string;
  deliveryDate?: string;
  deliveryDateUntil?: string;
  status?: SevdeskInvoiceStatus;
  smallSettlement?: boolean;
  taxRate?: number;
  taxText?: string;
  taxType?: "default" | "eu" | "noteu" | "custom" | "ss";
  taxSet?: SevdeskObjectRef;
  paymentMethod?: SevdeskObjectRef;
  sendDate?: string;
  invoiceType?: "RE" | "WKR" | "SR" | "MA" | "TR" | "ER";
  currency?: string;
  showNet?: boolean;
  sendType?: "VPR" | "VPDF" | "VM" | "VP";
  origin?: SevdeskObjectRef;
  mapAll?: boolean;
}

export type SevdeskInvoiceStatus = 100 | 200 | 1000;
// 100 = draft, 200 = open/delivered, 1000 = paid

/** sevDesk invoice position (line item) */
export interface SevdeskInvoicePosition {
  id?: number;
  objectName?: "InvoicePos";
  create?: string;
  update?: string;
  invoice?: SevdeskObjectRef;
  part?: SevdeskObjectRef;
  quantity: number;
  price: number;
  name: string;
  unity: SevdeskObjectRef;
  positionNumber?: number;
  text?: string;
  discount?: number;
  taxRate: number;
  temporary?: boolean;
  sumNet?: number;
  sumGross?: number;
  sumDiscount?: number;
  sumTax?: number;
  sumNetAccounting?: number;
  sumTaxAccounting?: number;
  sumGrossAccounting?: number;
  priceNet?: number;
  priceGross?: number;
  priceTax?: number;
}

/** sevDesk voucher (Beleg) */
export interface SevdeskVoucher {
  id?: number;
  objectName?: "Voucher";
  create?: string;
  update?: string;
  voucherDate: string;
  supplier?: SevdeskObjectRef;
  supplierName?: string;
  description?: string;
  payDate?: string;
  status?: SevdeskVoucherStatus;
  taxType?: "default" | "eu" | "noteu" | "custom" | "ss";
  creditDebit?: "C" | "D";
  voucherType?: "VOU" | "RV";
  currency?: string;
  propertyForeignCurrencyDeadline?: string;
  propertyExchangeRate?: number;
  document?: SevdeskObjectRef;
  costCentre?: SevdeskObjectRef;
}

export type SevdeskVoucherStatus = 50 | 100 | 150 | 1000;
// 50 = draft, 100 = unpaid, 150 = partially paid, 1000 = paid

/** sevDesk voucher position */
export interface SevdeskVoucherPosition {
  id?: number;
  objectName?: "VoucherPos";
  voucher: SevdeskObjectRef;
  accountingType: SevdeskObjectRef;
  estimatedAccountingType?: SevdeskObjectRef;
  taxRate: number;
  net: boolean;
  sumNet?: number;
  sumGross?: number;
  comment?: string;
}

/** sevDesk transaction (bank import) */
export interface SevdeskTransaction {
  id?: number;
  objectName?: "CheckAccountTransaction";
  create?: string;
  update?: string;
  valueDate: string;
  entryDate?: string;
  amount: number;
  payeeName?: string;
  checkAccount: SevdeskObjectRef;
  status?: number;
  enshrined?: boolean;
  sourceTransaction?: SevdeskObjectRef;
  targetTransaction?: SevdeskObjectRef;
}

/** sevDesk check account (bank account) */
export interface SevdeskCheckAccount {
  id?: number;
  objectName?: "CheckAccount";
  create?: string;
  update?: string;
  name: string;
  type: "online" | "offline";
  importType?: "CSV" | "MT940";
  currency?: string;
  status?: number;
  bankServer?: string;
  bankName?: string;
  bankCode?: string;
  accountNumber?: string;
  iban?: string;
  bic?: string;
  autoMapTransactions?: number;
  defaultAccount?: boolean;
}

// ==================== Request / Response ====================

export interface SevdeskListParams {
  limit?: number;
  offset?: number;
  embed?: string[];
  countAll?: boolean;
}

export interface SevdeskListResponse<T> {
  objects: T[];
  total?: number;
}

export interface SevdeskSingleResponse<T> {
  objects: T;
}

export interface SevdeskClientConfig {
  /** sevDesk API token */
  apiToken: string;
  /** Request timeout in ms */
  timeout?: number;
}
