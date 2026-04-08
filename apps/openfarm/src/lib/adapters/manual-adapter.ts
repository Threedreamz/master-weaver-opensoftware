import type { PrinterAdapter, PrinterState, PrintProgress } from "./base";

/**
 * Manual adapter for printers without network connectivity.
 * Status must be updated manually by the operator.
 */
export class ManualAdapter implements PrinterAdapter {
  readonly protocol = "manual";

  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}

  async getStatus(): Promise<PrinterState> {
    return { status: "online" };
  }

  async uploadFile(_filePath: string, _filename: string): Promise<string> {
    return "manual-export";
  }

  async startPrint(_fileRef: string): Promise<void> {}
  async pausePrint(): Promise<void> {}
  async resumePrint(): Promise<void> {}
  async cancelPrint(): Promise<void> {}

  async getProgress(): Promise<PrintProgress> {
    return { percent: 0 };
  }
}
