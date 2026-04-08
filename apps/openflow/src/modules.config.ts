export const ENABLED_MODULES = {
  // OpenFlow is the core module — always enabled
} as const;

export type ModuleName = keyof typeof ENABLED_MODULES;
export function isModuleEnabled(module: ModuleName): boolean {
  return (ENABLED_MODULES as Record<string, boolean>)[module] ?? false;
}
