// ==================== SAP Business One Types ====================
// SAP B1 Service Layer OData entities

/** Session returned by the Login endpoint */
export interface SapSession {
  SessionId: string;
  Version: string;
  SessionTimeout: number;
}

/** SAP B1 OData collection response wrapper */
export interface SapODataCollection<T> {
  "odata.metadata": string;
  value: T[];
  "odata.nextLink"?: string;
}

/** Standard SAP B1 error envelope */
export interface SapErrorResponse {
  error: {
    code: string;
    message: {
      lang: string;
      value: string;
    };
  };
}

// ==================== Business Partners ====================

export type BPType = "cCustomer" | "cSupplier" | "cLead";

export interface BusinessPartner {
  CardCode: string;
  CardName: string;
  CardType: BPType;
  GroupCode: number;
  FederalTaxID?: string;
  Phone1?: string;
  Phone2?: string;
  Fax?: string;
  EmailAddress?: string;
  Website?: string;
  Currency?: string;
  CurrentAccountBalance?: number;
  OpenDeliveryNotesBalance?: number;
  OpenOrdersBalance?: number;
  Valid?: "tYES" | "tNO";
  Frozen?: "tYES" | "tNO";
  BPAddresses?: BPAddress[];
  ContactEmployees?: ContactEmployee[];
}

export interface BPAddress {
  AddressName: string;
  Street: string;
  Block?: string;
  ZipCode?: string;
  City?: string;
  County?: string;
  Country?: string;
  State?: string;
  AddressType: "bo_ShipTo" | "bo_BillTo";
}

export interface ContactEmployee {
  Name: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
  Title?: string;
  Position?: string;
  E_Mail?: string;
  Phone1?: string;
  Phone2?: string;
  MobilePhone?: string;
}

export interface BusinessPartnerCreatePayload {
  CardCode?: string;
  CardName: string;
  CardType: BPType;
  GroupCode?: number;
  FederalTaxID?: string;
  Phone1?: string;
  EmailAddress?: string;
  Currency?: string;
  BPAddresses?: BPAddress[];
  ContactEmployees?: ContactEmployee[];
}

// ==================== Journal Entries ====================

export interface JournalEntry {
  JdtNum: number;
  Number: number;
  Series?: number;
  DueDate: string;
  TaxDate?: string;
  ReferenceDate: string;
  Memo?: string;
  Reference?: string;
  Reference2?: string;
  TransactionCode?: string;
  ProjectCode?: string;
  JournalEntryLines: JournalEntryLine[];
}

export interface JournalEntryLine {
  LineID?: number;
  AccountCode: string;
  Debit?: number;
  Credit?: number;
  ShortName?: string;
  CostingCode?: string;
  CostingCode2?: string;
  CostingCode3?: string;
  ProjectCode?: string;
  TaxDate?: string;
  LineMemo?: string;
}

export interface JournalEntryCreatePayload {
  ReferenceDate: string;
  DueDate: string;
  TaxDate?: string;
  Memo?: string;
  Reference?: string;
  Reference2?: string;
  TransactionCode?: string;
  ProjectCode?: string;
  JournalEntryLines: JournalEntryLine[];
}

// ==================== Invoices ====================

export interface Invoice {
  DocEntry: number;
  DocNum: number;
  DocType: "dDocument_Items" | "dDocument_Service";
  DocDate: string;
  DocDueDate: string;
  TaxDate?: string;
  CardCode: string;
  CardName?: string;
  DocCurrency?: string;
  DocTotal: number;
  DocTotalFc?: number;
  VatSum: number;
  DiscountPercent?: number;
  Comments?: string;
  PaymentGroupCode?: number;
  DocumentStatus?: "bost_Open" | "bost_Close" | "bost_Paid" | "bost_Delivered";
  Cancelled?: "tYES" | "tNO";
  DocumentLines: InvoiceLine[];
}

export interface InvoiceLine {
  LineNum?: number;
  ItemCode?: string;
  ItemDescription?: string;
  Quantity: number;
  UnitPrice: number;
  Currency?: string;
  DiscountPercent?: number;
  TaxCode?: string;
  AccountCode?: string;
  WarehouseCode?: string;
  CostingCode?: string;
  ProjectCode?: string;
  LineTotal?: number;
}

export interface InvoiceCreatePayload {
  DocType?: "dDocument_Items" | "dDocument_Service";
  DocDate: string;
  DocDueDate: string;
  TaxDate?: string;
  CardCode: string;
  DocCurrency?: string;
  DiscountPercent?: number;
  Comments?: string;
  PaymentGroupCode?: number;
  DocumentLines: InvoiceLine[];
}

// ==================== Items ====================

export interface Item {
  ItemCode: string;
  ItemName: string;
  ItemType: "itItems" | "itLabor" | "itTravel" | "itFixedAssets";
  ItemsGroupCode: number;
  BarCode?: string;
  SalesItem?: "tYES" | "tNO";
  PurchaseItem?: "tYES" | "tNO";
  InventoryItem?: "tYES" | "tNO";
  QuantityOnStock?: number;
  QuantityOrderedFromVendors?: number;
  QuantityOrderedByCustomers?: number;
  ManageBatchNumbers?: "tYES" | "tNO";
  ManageSerialNumbers?: "tYES" | "tNO";
  Valid?: "tYES" | "tNO";
  Frozen?: "tYES" | "tNO";
  ItemPrices?: ItemPrice[];
  ItemWarehouseInfoCollection?: ItemWarehouseInfo[];
}

export interface ItemPrice {
  PriceList: number;
  Price: number;
  Currency?: string;
}

export interface ItemWarehouseInfo {
  WarehouseCode: string;
  InStock?: number;
  Committed?: number;
  Ordered?: number;
}

export interface ItemCreatePayload {
  ItemCode: string;
  ItemName: string;
  ItemType?: "itItems" | "itLabor" | "itTravel" | "itFixedAssets";
  ItemsGroupCode?: number;
  BarCode?: string;
  SalesItem?: "tYES" | "tNO";
  PurchaseItem?: "tYES" | "tNO";
  InventoryItem?: "tYES" | "tNO";
  ItemPrices?: ItemPrice[];
}

// ==================== Chart of Accounts ====================

export interface ChartOfAccount {
  Code: string;
  Name: string;
  Balance: number;
  CashAccount?: "tYES" | "tNO";
  ActiveAccount?: "tYES" | "tNO";
  FatherAccountKey?: string;
  AccountLevel?: number;
  AccountType:
    | "at_Revenues"
    | "at_Expenses"
    | "at_Other"
    | "at_FixedAssets"
    | "at_CurrentAssets"
    | "at_LongTermLiab"
    | "at_OtherCurrentLiab"
    | "at_Equity";
  ExternalCode?: string;
}

export interface ChartOfAccountCreatePayload {
  Code: string;
  Name: string;
  AccountType: ChartOfAccount["AccountType"];
  FatherAccountKey?: string;
  CashAccount?: "tYES" | "tNO";
  ActiveAccount?: "tYES" | "tNO";
  ExternalCode?: string;
}

// ==================== Query Params ====================

export interface SapQueryParams {
  $filter?: string;
  $select?: string;
  $orderby?: string;
  $top?: string;
  $skip?: string;
  $inlinecount?: "allpages" | "none";
}

// ==================== Client Config ====================

export interface SapBusinessOneConfig {
  /** SAP B1 Service Layer base URL, e.g. https://myserver:50000/b1s/v1 */
  serviceLayerUrl: string;
  /** SAP B1 company database name */
  companyDb: string;
  /** SAP B1 username */
  username: string;
  /** SAP B1 password */
  password: string;
  /** Request timeout in ms (default 30000) */
  timeout?: number;
}
