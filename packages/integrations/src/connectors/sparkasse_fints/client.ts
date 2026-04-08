import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  FinTSSegment,
  FinTSSegmentId,
  FinTSMessage,
  FinTSDialogState,
  FinTSBankParameters,
  FinTSUserParameters,
  FinTSAccountInfo,
  FinTSBalance,
  FinTSMonetaryAmount,
  FinTSTransaction,
  FinTSTransactionsParams,
  FinTSClientConfig,
  FinTSDataElement,
  MT940Statement,
  MT940Transaction,
  MT940Balance,
} from "./types.js";

// ==================== Sparkasse FinTS/HBCI Client ====================

/**
 * Sparkasse FinTS 3.0 client.
 *
 * FinTS (Financial Transaction Services) is the German standard for
 * online banking communication, successor to HBCI. Communication is
 * based on exchanging structured messages containing segments.
 *
 * This client models the FinTS protocol layer, building and parsing
 * the segment-based messages required by Sparkassen endpoints.
 *
 * Note: FinTS uses HTTP POST with a custom binary/text format, not
 * JSON REST. The BaseIntegrationClient is used for HTTP transport
 * but message encoding/decoding is handled by this class.
 */
export class SparkasseFinTSClient extends BaseIntegrationClient {
  private dialogState: FinTSDialogState;
  private readonly bankCode: string;
  private readonly username: string;
  private readonly pin: string;
  private readonly productId: string;

  constructor(private config: FinTSClientConfig) {
    super({
      baseUrl: config.bankUrl,
      authType: "custom",
      credentials: {
        username: config.username,
        pin: config.pin,
      },
      rateLimit: { requestsPerMinute: 10 },
      timeout: 60_000,
      defaultHeaders: {
        "Content-Type": "text/plain; charset=ISO-8859-1",
      },
    });

    this.bankCode = config.bankCode;
    this.username = config.username;
    this.pin = config.pin;
    this.productId = config.productId ?? "0";

    this.dialogState = {
      dialogId: "0",
      messageNumber: 0,
      systemId: "0",
      phase: "INIT",
      supportedTanMethods: [],
    };
  }

  // ==================== Dialog Management ====================

  /**
   * Initialize a FinTS dialog session.
   * Must be called before any data operations.
   * Performs: identification, processing preparation, and synchronization.
   */
  async initializeDialog(): Promise<FinTSDialogState> {
    this.dialogState.messageNumber = 1;
    this.dialogState.phase = "INIT";

    const initSegments: FinTSSegment[] = [
      this.buildIdentificationSegment(),
      this.buildProcessingPreparationSegment(),
    ];

    const response = await this.sendFinTSMessage(initSegments);
    this.parseDialogInitResponse(response);

    // Synchronize to get a system ID if we don't have one
    if (this.dialogState.systemId === "0") {
      await this.synchronize();
    }

    this.dialogState.phase = "PROCESS";
    return { ...this.dialogState };
  }

  /**
   * End the current FinTS dialog session.
   */
  async endDialog(): Promise<void> {
    if (this.dialogState.dialogId === "0") return;

    const endSegment = this.buildSegment("HKEND", 1, [
      { type: "alphanumeric", value: this.dialogState.dialogId },
    ]);

    try {
      await this.sendFinTSMessage([endSegment]);
    } finally {
      this.dialogState.dialogId = "0";
      this.dialogState.messageNumber = 0;
      this.dialogState.phase = "INIT";
    }
  }

  /**
   * Synchronize with the bank server to obtain a system ID.
   */
  private async synchronize(): Promise<void> {
    const syncSegment = this.buildSegment("HKSYN", 4, [
      { type: "numeric", value: "0" }, // Mode: get new system ID
    ]);

    const response = await this.sendFinTSMessage([syncSegment]);
    const synResponse = this.findSegment(response, "HISYN");
    if (synResponse) {
      this.dialogState.systemId = this.extractDataElement(synResponse, 0) ?? "0";
    }
  }

  // ==================== Accounts ====================

  /**
   * Fetch SEPA account information.
   * Returns all accounts the user has access to.
   */
  async listAccounts(): Promise<FinTSAccountInfo[]> {
    await this.ensureDialog();

    const spaSegment = this.buildSegment("HKSPA", 1, [
      // Empty = request all accounts
    ]);

    const response = await this.sendFinTSMessage([spaSegment]);
    return this.parseAccountInfoResponse(response);
  }

  // ==================== Balances ====================

  /**
   * Get the balance for an account.
   * Uses HKSAL (Saldenabfrage) segment.
   */
  async getBalance(accountIban: string): Promise<FinTSBalance> {
    await this.ensureDialog();

    const salSegment = this.buildSegment("HKSAL", 7, [
      // Account reference as IBAN
      { type: "alphanumeric", value: accountIban },
      // All balances
      { type: "alphanumeric", value: "N" },
    ]);

    const response = await this.sendFinTSMessage([salSegment]);
    return this.parseBalanceResponse(response, accountIban);
  }

  /**
   * Get balances for all accounts.
   */
  async getAllBalances(): Promise<FinTSBalance[]> {
    const accounts = await this.listAccounts();
    const balances: FinTSBalance[] = [];

    for (const account of accounts) {
      try {
        const balance = await this.getBalance(account.iban);
        balances.push(balance);
      } catch (error) {
        // Some accounts may not support balance queries
        if (
          error instanceof IntegrationError &&
          error.code === "VALIDATION_ERROR"
        ) {
          continue;
        }
        throw error;
      }
    }

    return balances;
  }

  // ==================== Transactions ====================

  /**
   * Fetch account transactions (Kontoumsaetze).
   * Uses HKKAZ segment. Returns transactions in MT940/SWIFT format
   * which are then parsed into structured objects.
   */
  async listTransactions(
    params: FinTSTransactionsParams
  ): Promise<FinTSTransaction[]> {
    await this.ensureDialog();

    const dataElements: FinTSDataElement[] = [
      { type: "alphanumeric", value: params.accountIban },
    ];

    if (params.dateFrom) {
      dataElements.push({ type: "alphanumeric", value: this.formatFinTSDate(params.dateFrom) });
    }
    if (params.dateTo) {
      dataElements.push({ type: "alphanumeric", value: this.formatFinTSDate(params.dateTo) });
    }
    if (params.maxEntries != null) {
      dataElements.push({ type: "numeric", value: String(params.maxEntries) });
    }

    const kazSegment = this.buildSegment("HKKAZ", 7, dataElements);
    const allMT940Data: string[] = [];
    let touchdownPoint: string | undefined;

    // FinTS uses "touchdown" (Aufsetzpunkt) for pagination
    do {
      const segmentToSend = touchdownPoint
        ? this.buildSegment("HKKAZ", 7, [
            ...dataElements,
            { type: "alphanumeric", value: touchdownPoint },
          ])
        : kazSegment;

      const response = await this.sendFinTSMessage([segmentToSend]);
      const kazResponse = this.findSegment(response, "HIKAZ");

      if (kazResponse) {
        const mt940Data = this.extractDataElement(kazResponse, 0);
        if (mt940Data) {
          allMT940Data.push(mt940Data);
        }
      }

      touchdownPoint = this.extractTouchdownPoint(response, "HIKAZ");
    } while (touchdownPoint);

    // Parse all MT940 data into transaction objects
    const rawMT940 = allMT940Data.join("");
    if (!rawMT940) return [];

    const statements = this.parseMT940(rawMT940);
    return this.convertMT940ToTransactions(statements, params.accountIban);
  }

  // ==================== Connection Test ====================

  /**
   * Test the FinTS connection by initializing a dialog and ending it.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.initializeDialog();
      await this.endDialog();
      return true;
    } catch {
      return false;
    }
  }

  // ==================== FinTS Message Building ====================

  /**
   * Build a FinTS segment with the given parameters.
   */
  private buildSegment(
    id: FinTSSegmentId | string,
    version: number,
    dataElements: FinTSDataElement[]
  ): FinTSSegment {
    return {
      id,
      segmentNumber: this.getNextSegmentNumber(),
      version,
      dataElements,
    };
  }

  private buildIdentificationSegment(): FinTSSegment {
    return this.buildSegment("HKIDN", 2, [
      { type: "numeric", value: this.bankCode },
      { type: "alphanumeric", value: this.username },
      { type: "alphanumeric", value: this.dialogState.systemId },
      { type: "numeric", value: "1" }, // Status: 1 = new
    ]);
  }

  private buildProcessingPreparationSegment(): FinTSSegment {
    return this.buildSegment("HKVVB", 3, [
      { type: "numeric", value: "0" },   // BPD version
      { type: "numeric", value: "0" },   // UPD version
      { type: "numeric", value: "0" },   // Dialog language: 0 = default
      { type: "alphanumeric", value: this.productId },
      { type: "alphanumeric", value: "1.0" }, // Product version
    ]);
  }

  /**
   * Encode a FinTS message from segments into the wire format.
   * Format: HNHBK (header) + encrypted envelope + HNHBS (trailer)
   */
  private encodeMessage(segments: FinTSSegment[]): string {
    const messageNumber = this.dialogState.messageNumber++;

    // Build segment strings
    const segmentStrings = segments.map((seg) => this.encodeSegment(seg));

    // Build signature segments wrapping the data
    const signatureHead = this.buildSignatureHead(messageNumber);
    const signatureData = segmentStrings.join("");

    // Build the complete message body
    const body = this.encodeSegment(signatureHead) + signatureData;

    // Calculate total message length (header + body + trailer)
    // Header: HNHBK, Trailer: HNHBS
    const trailerStr = `HNHBS:${segments.length + 3}:1+${messageNumber}'`;
    const headerPlaceholder = `HNHBK:1:3+000000000000+300+${this.dialogState.dialogId}+${messageNumber}'`;
    const totalLength = headerPlaceholder.length + body.length + trailerStr.length;
    const paddedLength = String(totalLength).padStart(12, "0");
    const header = `HNHBK:1:3+${paddedLength}+300+${this.dialogState.dialogId}+${messageNumber}'`;

    return header + body + trailerStr;
  }

  private encodeSegment(segment: FinTSSegment): string {
    const header = `${segment.id}:${segment.segmentNumber}:${segment.version}`;
    const elements = segment.dataElements
      .map((de) => this.escapeFinTS(de.value))
      .join("+");

    return elements ? `${header}+${elements}'` : `${header}'`;
  }

  private buildSignatureHead(messageNumber: number): FinTSSegment {
    return this.buildSegment("HNVSK", 3, [
      { type: "numeric", value: "998" },      // Security profile
      { type: "numeric", value: "1" },         // Security function
      { type: "alphanumeric", value: String(messageNumber) },
      { type: "alphanumeric", value: this.dialogState.systemId },
    ]);
  }

  // ==================== FinTS Transport ====================

  /**
   * Send a FinTS message and receive the response.
   * Uses HTTP POST with the FinTS wire format.
   */
  private async sendFinTSMessage(
    segments: FinTSSegment[]
  ): Promise<FinTSSegment[]> {
    const encoded = this.encodeMessage(segments);

    // Use raw fetch via the base client's request method
    // FinTS uses text/plain, not JSON
    const response = await this.request<string>({
      method: "POST",
      path: "/",
      body: encoded,
      headers: {
        "Content-Type": "text/plain; charset=ISO-8859-1",
        Accept: "text/plain",
      },
    });

    return this.parseFinTSResponse(String(response.data));
  }

  // ==================== FinTS Response Parsing ====================

  /**
   * Parse a raw FinTS response into segments.
   */
  private parseFinTSResponse(raw: string): FinTSSegment[] {
    const segments: FinTSSegment[] = [];

    // Split by segment delimiter (apostrophe at end of segment)
    const segmentStrings = raw.split("'").filter((s) => s.trim().length > 0);

    for (const segStr of segmentStrings) {
      const parsed = this.parseSegmentString(segStr);
      if (parsed) {
        segments.push(parsed);
      }
    }

    // Check for error responses in HIRMG/HIRMS
    this.checkResponseErrors(segments);

    return segments;
  }

  private parseSegmentString(raw: string): FinTSSegment | null {
    // FinTS segments: ID:Number:Version+DE1+DE2+...
    const parts = raw.split("+");
    const header = parts[0];
    if (!header) return null;

    const headerParts = header.split(":");
    if (headerParts.length < 3) return null;

    const id = headerParts[0] as FinTSSegmentId;
    const segmentNumber = parseInt(headerParts[1] ?? "0", 10);
    const version = parseInt(headerParts[2] ?? "0", 10);
    const referenceSegment = headerParts[3]
      ? parseInt(headerParts[3], 10)
      : undefined;

    const dataElements: FinTSDataElement[] = parts.slice(1).map((value) => ({
      type: "alphanumeric" as const,
      value: this.unescapeFinTS(value),
    }));

    return {
      id,
      segmentNumber,
      version,
      referenceSegment,
      dataElements,
      rawData: raw,
    };
  }

  /**
   * Check HIRMG (global) and HIRMS (segment) response segments for errors.
   * FinTS error codes: 9xxx = error, 3xxx = warning, 0xxx = info
   */
  private checkResponseErrors(segments: FinTSSegment[]): void {
    for (const segment of segments) {
      if (segment.id !== "HIRMG" && segment.id !== "HIRMS") continue;

      for (const de of segment.dataElements) {
        const code = de.value.substring(0, 4);
        const codeNum = parseInt(code, 10);

        if (codeNum >= 9000 && codeNum <= 9999) {
          // PIN wrong
          if (code === "9931" || code === "9942") {
            throw new IntegrationError(
              "AUTH_ERROR",
              `FinTS authentication failed (${code}): ${de.value}`
            );
          }
          throw new IntegrationError(
            "SERVER_ERROR",
            `FinTS error (${code}): ${de.value}`
          );
        }
      }
    }
  }

  private parseDialogInitResponse(segments: FinTSSegment[]): void {
    // Extract dialog ID from HNHBK header
    const header = this.findSegment(segments, "HNHBK");
    if (header && header.dataElements.length >= 3) {
      this.dialogState.dialogId = this.extractDataElement(header, 2) ?? "0";
    }

    // Extract BPD from response
    const bpd = this.findSegment(segments, "HIBPA");
    if (bpd) {
      this.dialogState.bankParameterData = {
        bankCode: this.bankCode,
        bankName: this.extractDataElement(bpd, 1) ?? "",
        bpdVersion: parseInt(this.extractDataElement(bpd, 0) ?? "0", 10),
        hbciVersion: 300,
        supportedLanguages: [1], // German
        supportedSecurityMethods: [],
        maxTransactionsPerMessage: parseInt(this.extractDataElement(bpd, 4) ?? "0", 10),
      };
    }

    // Extract TAN methods from HITANS
    const hitans = this.findSegment(segments, "HITANS");
    if (hitans) {
      // Parse supported TAN methods from the segment data
      this.dialogState.supportedTanMethods = this.parseTanMethods(hitans);
    }
  }

  private parseTanMethods(segment: FinTSSegment): Array<
    "chipTAN_optisch" | "chipTAN_USB" | "chipTAN_QR" | "pushTAN" | "smsTAN" | "photoTAN" | "appTAN"
  > {
    const methods: Array<
      "chipTAN_optisch" | "chipTAN_USB" | "chipTAN_QR" | "pushTAN" | "smsTAN" | "photoTAN" | "appTAN"
    > = [];

    for (const de of segment.dataElements) {
      const lower = de.value.toLowerCase();
      if (lower.includes("chiptan") && lower.includes("optisch")) methods.push("chipTAN_optisch");
      else if (lower.includes("chiptan") && lower.includes("usb")) methods.push("chipTAN_USB");
      else if (lower.includes("chiptan") && lower.includes("qr")) methods.push("chipTAN_QR");
      else if (lower.includes("pushtan")) methods.push("pushTAN");
      else if (lower.includes("smstan") || lower.includes("mobiletan")) methods.push("smsTAN");
      else if (lower.includes("phototan")) methods.push("photoTAN");
      else if (lower.includes("apptan")) methods.push("appTAN");
    }

    return methods;
  }

  // ==================== Account Parsing ====================

  private parseAccountInfoResponse(segments: FinTSSegment[]): FinTSAccountInfo[] {
    const accounts: FinTSAccountInfo[] = [];
    const spaSegments = segments.filter((s) => s.id === "HISPA");

    for (const segment of spaSegments) {
      // Each HISPA segment contains one or more accounts
      // Data elements: IBAN, BIC, account number, sub-account, bank code, owner, type, currency, product
      for (let i = 0; i < segment.dataElements.length; i += 9) {
        const iban = this.extractDataElement(segment, i) ?? "";
        const bic = this.extractDataElement(segment, i + 1) ?? "";
        const accountNumber = this.extractDataElement(segment, i + 2) ?? "";
        const subAccountNumber = this.extractDataElement(segment, i + 3);
        const bankCodeVal = this.extractDataElement(segment, i + 4) ?? this.bankCode;
        const ownerName = this.extractDataElement(segment, i + 5) ?? "";
        const accountType = parseInt(this.extractDataElement(segment, i + 6) ?? "1", 10);
        const currency = this.extractDataElement(segment, i + 7) ?? "EUR";
        const productName = this.extractDataElement(segment, i + 8);

        if (iban) {
          accounts.push({
            accountNumber,
            subAccountNumber: subAccountNumber || undefined,
            bankCode: bankCodeVal,
            iban,
            bic,
            ownerName,
            accountType,
            currency,
            productName: productName || undefined,
            allowedTransactions: ["HKSAL", "HKKAZ", "HKSPA"],
          });
        }
      }
    }

    return accounts;
  }

  // ==================== Balance Parsing ====================

  private parseBalanceResponse(
    segments: FinTSSegment[],
    accountIban: string
  ): FinTSBalance {
    const salSegment = this.findSegment(segments, "HISAL");
    if (!salSegment) {
      throw new IntegrationError(
        "SERVER_ERROR",
        "No balance response segment (HISAL) found"
      );
    }

    // HISAL data elements: booked balance, pending balance, credit limit, available, date, time
    const bookedRaw = this.extractDataElement(salSegment, 0) ?? "";
    const pendingRaw = this.extractDataElement(salSegment, 1);
    const creditLimitRaw = this.extractDataElement(salSegment, 2);
    const availableRaw = this.extractDataElement(salSegment, 3);
    const dateRaw = this.extractDataElement(salSegment, 4) ?? "";
    const timeRaw = this.extractDataElement(salSegment, 5);

    return {
      accountIban,
      bookedBalance: this.parseMonetaryAmount(bookedRaw),
      pendingBalance: pendingRaw ? this.parseMonetaryAmount(pendingRaw) : undefined,
      creditLimit: creditLimitRaw ? this.parseMonetaryAmount(creditLimitRaw) : undefined,
      availableBalance: availableRaw ? this.parseMonetaryAmount(availableRaw) : undefined,
      balanceDate: this.parseFinTSDate(dateRaw),
      balanceTime: timeRaw || undefined,
    };
  }

  private parseMonetaryAmount(raw: string): FinTSMonetaryAmount {
    // Format: "C:1234,56:EUR" or "D:789,01:EUR"
    const parts = raw.split(":");
    const creditDebit = (parts[0] === "D" ? "D" : "C") as "C" | "D";
    const valueStr = (parts[1] ?? "0").replace(",", ".");
    const currency = parts[2] ?? "EUR";

    return {
      value: parseFloat(valueStr),
      currency,
      creditDebit,
    };
  }

  // ==================== MT940 Parsing ====================

  /**
   * Parse MT940 (SWIFT) formatted bank statement data.
   * MT940 is the standard format returned by FinTS for transaction data.
   */
  private parseMT940(raw: string): MT940Statement[] {
    const statements: MT940Statement[] = [];

    // Split into individual statements (separated by :20: tag)
    const statementBlocks = raw.split(/(?=:20:)/).filter((b) => b.trim());

    for (const block of statementBlocks) {
      const statement = this.parseMT940Statement(block);
      if (statement) {
        statements.push(statement);
      }
    }

    return statements;
  }

  private parseMT940Statement(block: string): MT940Statement | null {
    const lines = block.split(/\r?\n/);
    let transactionReference = "";
    let relatedReference: string | undefined;
    let accountIdentification = "";
    let statementNumber = "";
    let sequenceNumber: string | undefined;
    let openingBalance: MT940Balance | null = null;
    let closingBalance: MT940Balance | null = null;
    let closingAvailableBalance: MT940Balance | undefined;
    const transactions: MT940Transaction[] = [];

    let currentTransaction: Partial<MT940Transaction> | null = null;
    let purposeLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;

      if (line.startsWith(":20:")) {
        transactionReference = line.substring(4);
      } else if (line.startsWith(":21:")) {
        relatedReference = line.substring(4);
      } else if (line.startsWith(":25:")) {
        accountIdentification = line.substring(4);
      } else if (line.startsWith(":28C:")) {
        const seqParts = line.substring(5).split("/");
        statementNumber = seqParts[0] ?? "";
        sequenceNumber = seqParts[1];
      } else if (line.startsWith(":60F:") || line.startsWith(":60M:")) {
        openingBalance = this.parseMT940Balance(line.substring(5));
      } else if (line.startsWith(":62F:") || line.startsWith(":62M:")) {
        closingBalance = this.parseMT940Balance(line.substring(5));
      } else if (line.startsWith(":64:")) {
        closingAvailableBalance = this.parseMT940Balance(line.substring(4));
      } else if (line.startsWith(":61:")) {
        // Finish previous transaction
        if (currentTransaction) {
          transactions.push({
            ...currentTransaction as MT940Transaction,
            purposeLines: [...purposeLines],
          });
        }
        currentTransaction = this.parseMT940TransactionLine(line.substring(4));
        purposeLines = [];
      } else if (line.startsWith(":86:")) {
        purposeLines.push(line.substring(4));
      } else if (
        currentTransaction &&
        !line.startsWith(":") &&
        line.trim()
      ) {
        // Continuation line for :86:
        purposeLines.push(line);
      }
    }

    // Finish last transaction
    if (currentTransaction) {
      transactions.push({
        ...currentTransaction as MT940Transaction,
        purposeLines: [...purposeLines],
      });
    }

    if (!openingBalance || !closingBalance) return null;

    return {
      transactionReference,
      relatedReference,
      accountIdentification,
      statementNumber,
      sequenceNumber,
      openingBalance,
      closingBalance,
      closingAvailableBalance,
      transactions,
    };
  }

  private parseMT940Balance(raw: string): MT940Balance {
    // Format: C|D YYMMDD CUR Amount
    // Example: C260320EUR12345,67
    const creditDebit = (raw[0] === "D" ? "D" : "C") as "C" | "D";
    const dateStr = raw.substring(1, 7);
    const currency = raw.substring(7, 10);
    const amountStr = raw.substring(10).replace(",", ".");

    return {
      creditDebit,
      date: this.parseMT940Date(dateStr),
      currency,
      amount: parseFloat(amountStr),
    };
  }

  private parseMT940TransactionLine(raw: string): Partial<MT940Transaction> {
    // Format: YYMMDD [MMDD] C|D [letter] Amount TransType Reference [//BankRef] [\nSupplementary]
    const valueDateStr = raw.substring(0, 6);
    const bookingDateStr = raw.substring(6, 10);

    // Find credit/debit indicator
    let pos = 10;
    let creditDebit: "C" | "D" = "C";
    if (raw[pos] === "R") pos++; // Reversal indicator
    if (raw[pos] === "C" || raw[pos] === "D") {
      creditDebit = raw[pos] as "C" | "D";
      pos++;
    }
    // Skip optional letter (e.g., 'C' for reversal of credit)
    if (raw[pos] && /[A-Z]/.test(raw[pos]!) && raw[pos] !== "N") pos++;

    // Parse amount (ends at next letter)
    let amountStr = "";
    while (pos < raw.length && (raw[pos] === "," || raw[pos] === "." || /\d/.test(raw[pos]!))) {
      amountStr += raw[pos];
      pos++;
    }

    // Transaction type (e.g., "N051")
    const transactionType = raw.substring(pos, pos + 4);
    pos += 4;

    // Reference
    const remaining = raw.substring(pos);
    const bankRefMatch = remaining.match(/^(.+?)(?:\/\/(.+))?$/);
    const reference = bankRefMatch?.[1] ?? remaining;
    const bankReference = bankRefMatch?.[2];

    return {
      valueDate: this.parseMT940Date(valueDateStr),
      bookingDate: this.parseMT940Date(bookingDateStr),
      creditDebit,
      amount: parseFloat(amountStr.replace(",", ".")),
      transactionType,
      reference: reference.trim(),
      bankReference: bankReference?.trim(),
      purposeLines: [],
    };
  }

  /**
   * Convert parsed MT940 statements into FinTSTransaction objects.
   */
  private convertMT940ToTransactions(
    statements: MT940Statement[],
    accountIban: string
  ): FinTSTransaction[] {
    const transactions: FinTSTransaction[] = [];

    for (const statement of statements) {
      for (const mt940tx of statement.transactions) {
        const purposeFields = this.parsePurposeLines(mt940tx.purposeLines);

        transactions.push({
          accountIban,
          amount: {
            value: mt940tx.amount,
            currency: statement.openingBalance.currency,
            creditDebit: mt940tx.creditDebit,
          },
          bookingDate: mt940tx.bookingDate,
          valueDate: mt940tx.valueDate,
          bookingText: purposeFields.bookingText,
          primaNotaNumber: purposeFields.primaNotaNumber,
          purpose: purposeFields.purposeLines,
          counterpartyName: purposeFields.counterpartyName,
          counterpartyIban: purposeFields.counterpartyIban,
          counterpartyBic: purposeFields.counterpartyBic,
          endToEndReference: purposeFields.endToEndReference,
          mandateReference: purposeFields.mandateReference,
          creditorId: purposeFields.creditorId,
          transactionCode: mt940tx.transactionType,
          gvcCode: purposeFields.gvcCode,
          gvcText: purposeFields.gvcText,
        });
      }
    }

    return transactions;
  }

  /**
   * Parse MT940 :86: purpose lines.
   * German banks use structured fields like ?20-?29 for purpose,
   * ?30 for BIC, ?31 for IBAN, ?32-?33 for counterparty name, etc.
   */
  private parsePurposeLines(lines: string[]): {
    bookingText?: string;
    primaNotaNumber?: string;
    purposeLines: string[];
    counterpartyName?: string;
    counterpartyIban?: string;
    counterpartyBic?: string;
    endToEndReference?: string;
    mandateReference?: string;
    creditorId?: string;
    gvcCode?: string;
    gvcText?: string;
  } {
    const joined = lines.join("");
    const result: ReturnType<typeof this.parsePurposeLines> = {
      purposeLines: [],
    };

    // Extract structured fields using ?XX notation
    const fieldPattern = /\?(\d{2})([^?]*)/g;
    let match: RegExpExecArray | null;

    while ((match = fieldPattern.exec(joined)) !== null) {
      const fieldCode = match[1]!;
      const fieldValue = match[2]!.trim();

      switch (fieldCode) {
        case "00": // Booking text (Buchungstext)
          result.bookingText = fieldValue;
          break;
        case "10": // Prima nota number
          result.primaNotaNumber = fieldValue;
          break;
        case "20": case "21": case "22": case "23": case "24":
        case "25": case "26": case "27": case "28": case "29":
          result.purposeLines.push(fieldValue);
          break;
        case "30": // BIC of counterparty
          result.counterpartyBic = fieldValue;
          break;
        case "31": // IBAN of counterparty
          result.counterpartyIban = fieldValue;
          break;
        case "32": case "33": // Counterparty name
          result.counterpartyName = result.counterpartyName
            ? `${result.counterpartyName} ${fieldValue}`
            : fieldValue;
          break;
        case "34": // GVC code
          result.gvcCode = fieldValue;
          break;
      }
    }

    // Extract EREF, MREF, CRED from purpose lines
    const purposeJoined = result.purposeLines.join(" ");
    const erefMatch = purposeJoined.match(/EREF\+([^\s+]+)/);
    if (erefMatch) result.endToEndReference = erefMatch[1];

    const mrefMatch = purposeJoined.match(/MREF\+([^\s+]+)/);
    if (mrefMatch) result.mandateReference = mrefMatch[1];

    const credMatch = purposeJoined.match(/CRED\+([^\s+]+)/);
    if (credMatch) result.creditorId = credMatch[1];

    return result;
  }

  // ==================== Helpers ====================

  private findSegment(
    segments: FinTSSegment[],
    id: FinTSSegmentId | string
  ): FinTSSegment | undefined {
    return segments.find((s) => s.id === id);
  }

  private extractDataElement(
    segment: FinTSSegment,
    index: number
  ): string | undefined {
    return segment.dataElements[index]?.value;
  }

  private extractTouchdownPoint(
    segments: FinTSSegment[],
    responseSegmentId: string
  ): string | undefined {
    // Touchdown point is indicated in HIRMS with code 3040
    const hirms = segments.filter((s) => s.id === "HIRMS");
    for (const segment of hirms) {
      for (const de of segment.dataElements) {
        if (de.value.startsWith("3040")) {
          // The touchdown point follows the status code
          const parts = de.value.split(":");
          return parts[parts.length - 1];
        }
      }
    }
    return undefined;
  }

  private getNextSegmentNumber(): number {
    return this.dialogState.messageNumber + 2; // Account for header segments
  }

  private escapeFinTS(value: string): string {
    return value
      .replace(/\?/g, "??")
      .replace(/\+/g, "?+")
      .replace(/:/g, "?:")
      .replace(/'/g, "?'")
      .replace(/@/g, "?@");
  }

  private unescapeFinTS(value: string): string {
    return value
      .replace(/\?\+/g, "+")
      .replace(/\?:/g, ":")
      .replace(/\?'/g, "'")
      .replace(/\?@/g, "@")
      .replace(/\?\?/g, "?");
  }

  private formatFinTSDate(isoDate: string): string {
    // ISO 8601 to FinTS format YYYYMMDD
    return isoDate.replace(/-/g, "");
  }

  private parseFinTSDate(fintsDate: string): string {
    // YYYYMMDD to ISO 8601
    if (fintsDate.length === 8) {
      return `${fintsDate.substring(0, 4)}-${fintsDate.substring(4, 6)}-${fintsDate.substring(6, 8)}`;
    }
    return fintsDate;
  }

  private parseMT940Date(dateStr: string): string {
    // YYMMDD to ISO 8601
    if (dateStr.length === 6) {
      const year = parseInt(dateStr.substring(0, 2), 10);
      const fullYear = year > 80 ? 1900 + year : 2000 + year;
      return `${fullYear}-${dateStr.substring(2, 4)}-${dateStr.substring(4, 6)}`;
    }
    // MMDD (booking date) - use current year
    if (dateStr.length === 4) {
      const currentYear = new Date().getFullYear();
      return `${currentYear}-${dateStr.substring(0, 2)}-${dateStr.substring(2, 4)}`;
    }
    return dateStr;
  }

  private async ensureDialog(): Promise<void> {
    if (this.dialogState.phase !== "PROCESS" || this.dialogState.dialogId === "0") {
      await this.initializeDialog();
    }
  }
}
