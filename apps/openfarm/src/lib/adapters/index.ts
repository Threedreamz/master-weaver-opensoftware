import type { PrinterAdapter, PrinterAdapterConfig } from "./base";
import { MoonrakerAdapter } from "./moonraker-adapter";
import { OctoPrintAdapter } from "./octoprint-adapter";
import { BambuAdapter } from "./bambu-adapter";
import { BambuCloudAdapter } from "./bambu-cloud-adapter";
import { FormlabsLocalAdapter } from "./formlabs-local-adapter";
import { FormlabsCloudAdapter } from "./formlabs-cloud-adapter";
import { SLS4AllAdapter } from "./sls4all-adapter";
import { ManualAdapter } from "./manual-adapter";

export type { PrinterAdapter, PrinterAdapterConfig, PrinterState, PrintProgress } from "./base";
export { PrinterConnectionError } from "./base";
export { bambuLogin, bambuListDevices } from "./bambu-cloud-adapter";
export type { BambuDevice } from "./bambu-cloud-adapter";

export type PrinterProtocol =
  | "moonraker" | "octoprint" | "bambu_mqtt" | "bambu_cloud"
  | "formlabs_local" | "formlabs_cloud" | "sls4all" | "manual";

export function createPrinterAdapter(protocol: PrinterProtocol, config: PrinterAdapterConfig): PrinterAdapter {
  switch (protocol) {
    case "moonraker": return new MoonrakerAdapter(config);
    case "octoprint": return new OctoPrintAdapter(config);
    case "bambu_mqtt": return new BambuAdapter(config);
    case "bambu_cloud": return new BambuCloudAdapter(config);
    case "formlabs_local": return new FormlabsLocalAdapter(config);
    case "formlabs_cloud": return new FormlabsCloudAdapter(config);
    case "sls4all": return new SLS4AllAdapter(config);
    case "manual": return new ManualAdapter();
    default: throw new Error(`Unknown printer protocol: ${protocol}`);
  }
}
