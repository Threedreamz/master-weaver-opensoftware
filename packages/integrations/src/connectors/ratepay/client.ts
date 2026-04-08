import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  RatepayClientConfig,
  RatepayPaymentInitResponse,
  RatepayPaymentRequestParams,
  RatepayPaymentRequestResponse,
  RatepayPaymentConfirmParams,
  RatepayPaymentConfirmResponse,
  RatepayPaymentChangeParams,
  RatepayPaymentChangeResponse,
  RatepayCalculationRequest,
  RatepayCalculationResponse,
  RatepayConfigurationResponse,
  RatepayCustomer,
  RatepayBasket,
  RatepayBasketItem,
  RatepayAddress,
  RatepayInstallmentDetails,
  RatepaySubOperation,
  RatepayPaymentMethod,
} from "./types.js";

const RATEPAY_PRODUCTION_URL = "https://gateway.ratepay.com/api/xml/1_0";
const RATEPAY_SANDBOX_URL = "https://gateway-int.ratepay.com/api/xml/1_0";

/**
 * Ratepay XML API client.
 *
 * Supports: payment init, request, confirm, change (refund/cancellation),
 * installment calculation, and configuration queries.
 *
 * Auth: Profile ID + Security Code sent in each XML request.
 * Protocol: XML request/response (not JSON).
 */
export class RatepayClient extends BaseIntegrationClient {
  private profileId: string;
  private securityCode: string;

  constructor(config: RatepayClientConfig) {
    const baseUrl = config.sandbox ? RATEPAY_SANDBOX_URL : RATEPAY_PRODUCTION_URL;

    super({
      baseUrl,
      authType: "custom",
      credentials: {},
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
    });

    this.profileId = config.profileId;
    this.securityCode = config.securityCode;
  }

  // ==================== XML Builder Helpers ====================

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  private buildHead(
    operation: string,
    transactionId?: string,
    subtype?: string,
    orderId?: string
  ): string {
    return `
    <head>
      <system-id>OpenSoftware</system-id>
      <operation${subtype ? ` subtype="${this.escapeXml(subtype)}"` : ""}>${this.escapeXml(operation)}</operation>
      <credential>
        <profile-id>${this.escapeXml(this.profileId)}</profile-id>
        <securitycode>${this.escapeXml(this.securityCode)}</securitycode>
      </credential>
      ${transactionId ? `<transaction-id>${this.escapeXml(transactionId)}</transaction-id>` : ""}
      ${orderId ? `<external><order-id>${this.escapeXml(orderId)}</order-id></external>` : ""}
    </head>`;
  }

  private buildCustomerXml(customer: RatepayCustomer): string {
    const addresses = customer.addresses
      .map(
        (addr: RatepayAddress) => `
      <address type="${this.escapeXml(addr.type)}">
        ${addr.firstName ? `<first-name>${this.escapeXml(addr.firstName)}</first-name>` : ""}
        ${addr.lastName ? `<last-name>${this.escapeXml(addr.lastName)}</last-name>` : ""}
        ${addr.company ? `<company>${this.escapeXml(addr.company)}</company>` : ""}
        <street>${this.escapeXml(addr.street)}</street>
        ${addr.streetNumber ? `<street-number>${this.escapeXml(addr.streetNumber)}</street-number>` : ""}
        ${addr.streetAdditional ? `<street-additional>${this.escapeXml(addr.streetAdditional)}</street-additional>` : ""}
        <zip-code>${this.escapeXml(addr.zipCode)}</zip-code>
        <city>${this.escapeXml(addr.city)}</city>
        <country-code>${this.escapeXml(addr.countryCode)}</country-code>
      </address>`
      )
      .join("");

    const bankAccount = customer.bankAccount
      ? `<bank-account>
          ${customer.bankAccount.owner ? `<owner>${this.escapeXml(customer.bankAccount.owner)}</owner>` : ""}
          <iban>${this.escapeXml(customer.bankAccount.iban)}</iban>
          ${customer.bankAccount.bic ? `<bic>${this.escapeXml(customer.bankAccount.bic)}</bic>` : ""}
        </bank-account>`
      : "";

    return `
    <customer>
      <first-name>${this.escapeXml(customer.firstName)}</first-name>
      <last-name>${this.escapeXml(customer.lastName)}</last-name>
      ${customer.gender ? `<gender>${this.escapeXml(customer.gender)}</gender>` : ""}
      ${customer.dateOfBirth ? `<date-of-birth>${this.escapeXml(customer.dateOfBirth)}</date-of-birth>` : ""}
      ${customer.email ? `<contacts><email>${this.escapeXml(customer.email)}</email>${customer.phone ? `<phone><direct-dial>${this.escapeXml(customer.phone)}</direct-dial></phone>` : ""}</contacts>` : ""}
      ${customer.ipAddress ? `<ip-address>${this.escapeXml(customer.ipAddress)}</ip-address>` : ""}
      ${addresses}
      ${bankAccount}
    </customer>`;
  }

  private buildBasketXml(basket: RatepayBasket): string {
    const items = basket.items
      .map(
        (item: RatepayBasketItem) => `
      <item article-number="${this.escapeXml(item.articleNumber)}" quantity="${item.quantity}" unit-price-gross="${item.unitPriceGross}" tax-rate="${item.taxRate}">
        ${item.uniqueArticleNumber ? `<unique-article-number>${this.escapeXml(item.uniqueArticleNumber)}</unique-article-number>` : ""}
        ${item.description ? `<description>${this.escapeXml(item.description)}</description>` : ""}
        ${item.discount ? `<discount>${item.discount}</discount>` : ""}
      </item>`
      )
      .join("");

    return `
    <shopping-basket amount="${basket.amount}" currency="${this.escapeXml(basket.currency)}">
      ${items}
    </shopping-basket>`;
  }

  private buildInstallmentXml(details: RatepayInstallmentDetails): string {
    return `
    <installment-details>
      ${details.installmentNumber ? `<installment-number>${details.installmentNumber}</installment-number>` : ""}
      ${details.installmentAmount ? `<installment-amount>${details.installmentAmount}</installment-amount>` : ""}
      ${details.lastInstallmentAmount ? `<last-installment-amount>${details.lastInstallmentAmount}</last-installment-amount>` : ""}
      ${details.interestRate ? `<interest-rate>${details.interestRate}</interest-rate>` : ""}
      ${details.paymentFirstday ? `<payment-firstday>${details.paymentFirstday}</payment-firstday>` : ""}
    </installment-details>`;
  }

  // ==================== XML Request Executor ====================

  /**
   * Send an XML request to the Ratepay gateway and parse the XML response.
   */
  private async xmlRequest<T>(xmlBody: string): Promise<ApiResponse<T>> {
    const fullXml = `<?xml version="1.0" encoding="UTF-8"?>\n<request xmlns="urn:ratepay/payment/1_0" version="1.0">\n${xmlBody}\n</request>`;

    const response = await this.request<string>({
      method: "POST",
      path: "",
      body: fullXml,
      headers: {
        "Content-Type": "application/xml",
        Accept: "application/xml",
      },
    });

    // Parse the XML response into a simplified object
    const parsed = this.parseXmlResponse<T>(response.data as unknown as string);
    return { data: parsed, status: response.status, headers: response.headers };
  }

  /**
   * Simplified XML response parser for Ratepay's predictable response format.
   */
  private parseXmlResponse<T>(xml: string): T {
    const getTag = (tag: string, content: string): string | undefined => {
      const match = content.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`));
      return match?.[1];
    };

    const getAttr = (tag: string, attr: string, content: string): string | undefined => {
      const tagMatch = content.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"[^>]*>`));
      return tagMatch?.[1];
    };

    const resultCode = getAttr("result", "code", xml);
    const resultText = getTag("result", xml);
    const reasonCode = getAttr("reason", "code", xml);
    const reasonText = getTag("reason", xml);
    const transactionId = getTag("transaction-id", xml);
    const transactionShortId = getTag("transaction-short-id", xml);
    const descriptor = getTag("descriptor", xml);

    const result: Record<string, unknown> = {
      resultCode: resultCode === "350" ? "OK" : resultCode === "150" ? "NOK" : "ERROR",
      resultText: resultText ?? undefined,
      reasonCode: reasonCode ? parseInt(reasonCode, 10) : undefined,
      reasonText: reasonText ?? undefined,
      transactionId: transactionId ?? undefined,
      transactionShortId: transactionShortId ?? undefined,
      descriptor: descriptor ?? undefined,
    };

    return result as T;
  }

  // ==================== Payment Init ====================

  /**
   * Initialize a payment transaction.
   * Must be called before PAYMENT_REQUEST.
   * Returns a transactionId used in subsequent calls.
   */
  async paymentInit(
    orderId?: string
  ): Promise<ApiResponse<RatepayPaymentInitResponse>> {
    const xml = `${this.buildHead("PAYMENT_INIT", undefined, undefined, orderId)}`;
    return this.xmlRequest<RatepayPaymentInitResponse>(xml);
  }

  // ==================== Payment Request ====================

  /**
   * Submit a payment request for the chosen method (invoice, installment, direct debit).
   * Ratepay performs a risk check and returns approval or denial.
   */
  async paymentRequest(
    params: Omit<RatepayPaymentRequestParams, "profileId" | "securityCode">
  ): Promise<ApiResponse<RatepayPaymentRequestResponse>> {
    const paymentXml = `<payment method="${this.escapeXml(params.method)}">
      ${params.installmentDetails ? this.buildInstallmentXml(params.installmentDetails) : ""}
      ${params.deviceToken ? `<device-token>${this.escapeXml(params.deviceToken)}</device-token>` : ""}
    </payment>`;

    const xml = `
      ${this.buildHead("PAYMENT_REQUEST", params.transactionId, undefined, params.orderId)}
      <content>
        ${this.buildCustomerXml(params.customer)}
        ${this.buildBasketXml(params.basket)}
        ${paymentXml}
      </content>`;

    return this.xmlRequest<RatepayPaymentRequestResponse>(xml);
  }

  // ==================== Payment Confirm ====================

  /**
   * Confirm a payment after the order has been finalized.
   * Call this after a successful PAYMENT_REQUEST.
   */
  async paymentConfirm(
    transactionId: string,
    orderId?: string
  ): Promise<ApiResponse<RatepayPaymentConfirmResponse>> {
    const xml = this.buildHead("PAYMENT_CONFIRM", transactionId, undefined, orderId);
    return this.xmlRequest<RatepayPaymentConfirmResponse>(xml);
  }

  // ==================== Payment Change (Refund / Cancel) ====================

  /**
   * Modify a payment: credit, return, cancellation, partial-cancellation, full-cancellation.
   */
  async paymentChange(
    transactionId: string,
    subOperation: RatepaySubOperation,
    basket?: RatepayBasket,
    invoiceId?: string
  ): Promise<ApiResponse<RatepayPaymentChangeResponse>> {
    const xml = `
      ${this.buildHead("PAYMENT_CHANGE", transactionId, subOperation)}
      <content>
        ${basket ? this.buildBasketXml(basket) : ""}
        ${invoiceId ? `<invoice-id>${this.escapeXml(invoiceId)}</invoice-id>` : ""}
      </content>`;

    return this.xmlRequest<RatepayPaymentChangeResponse>(xml);
  }

  // ==================== Installment Calculation ====================

  /**
   * Calculate available installment plans for a given amount.
   */
  async calculateInstallment(
    amount: number,
    currency: string,
    calculationType: "calculation-by-rate" | "calculation-by-time",
    installmentRate?: number,
    installmentMonth?: number,
    paymentFirstday?: number
  ): Promise<ApiResponse<RatepayCalculationResponse>> {
    const xml = `
      ${this.buildHead("CALCULATION_REQUEST")}
      <content>
        <installment-calculation type="${this.escapeXml(calculationType)}">
          <amount>${amount}</amount>
          <currency>${this.escapeXml(currency)}</currency>
          ${installmentRate ? `<rate>${installmentRate}</rate>` : ""}
          ${installmentMonth ? `<month>${installmentMonth}</month>` : ""}
          ${paymentFirstday ? `<payment-firstday>${paymentFirstday}</payment-firstday>` : ""}
        </installment-calculation>
      </content>`;

    return this.xmlRequest<RatepayCalculationResponse>(xml);
  }

  // ==================== Configuration ====================

  /**
   * Retrieve the configuration for the profile (allowed methods, limits, etc.).
   */
  async getConfiguration(): Promise<ApiResponse<RatepayConfigurationResponse>> {
    const xml = this.buildHead("CONFIGURATION_REQUEST");
    return this.xmlRequest<RatepayConfigurationResponse>(xml);
  }

  // ==================== Connection Test ====================

  /**
   * Verify credentials by requesting the profile configuration.
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.getConfiguration();
      return response.data.resultCode === "OK";
    } catch {
      return false;
    }
  }
}
