import type { MoveType } from "@opensoftware/slicer-core";

/**
 * Color map for move type visualization (Bambu/OrcaSlicer-style).
 */
export const MOVE_TYPE_COLORS: Record<MoveType, string> = {
  outer_wall: '#FF6B35',   // orange
  inner_wall: '#FFD700',   // gold
  infill: '#4A90D9',       // blue
  support: '#00CED1',      // cyan
  bridge: '#9370DB',       // purple
  travel: '#808080',       // gray (rendered dashed/thin)
  skirt: '#32CD32',        // green
  wipe: '#FF69B4',         // pink
  custom: '#FFFFFF',       // white
};

/**
 * Human-readable labels for each move type.
 */
export const MOVE_TYPE_LABELS: Record<MoveType, string> = {
  outer_wall: 'Outer Wall',
  inner_wall: 'Inner Wall',
  infill: 'Infill',
  support: 'Support',
  bridge: 'Bridge',
  travel: 'Travel',
  skirt: 'Skirt/Brim',
  wipe: 'Wipe',
  custom: 'Custom',
};

export type GcodeColorMode = 'type' | 'speed' | 'flowRate' | 'temperature';

/**
 * Color gradient endpoints for scalar color modes.
 */
export const SCALAR_GRADIENTS: Record<Exclude<GcodeColorMode, 'type'>, { low: string; high: string }> = {
  speed: { low: '#3B82F6', high: '#EF4444' },       // blue -> red
  flowRate: { low: '#10B981', high: '#F59E0B' },     // emerald -> amber
  temperature: { low: '#06B6D4', high: '#DC2626' },  // cyan -> red
};
