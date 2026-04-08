/**
 * Filament color mapping for AMS / multi-material visualization.
 * Maps material types to representative hex colors.
 */

const MATERIAL_COLORS: Record<string, string> = {
  PLA: "#4A90D9",
  PETG: "#FF6B35",
  ABS: "#DC2626",
  TPU: "#22C55E",
  ASA: "#A855F7",
  PA: "#F59E0B",
  PC: "#06B6D4",
};

/** Default color when material type is unknown or unset */
const DEFAULT_COLOR = "#9CA3AF"; // zinc-400

/**
 * Returns a hex color string for the given material type.
 * Case-insensitive lookup; returns a neutral gray for unknown types.
 */
export function getFilamentColor(materialType: string | null | undefined): string {
  if (!materialType) return DEFAULT_COLOR;
  return MATERIAL_COLORS[materialType.toUpperCase()] ?? DEFAULT_COLOR;
}

/** All known material types with their colors (for UI pickers) */
export const FILAMENT_COLOR_MAP = MATERIAL_COLORS;
