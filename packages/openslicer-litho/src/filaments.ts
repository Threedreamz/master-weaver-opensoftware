import { type FilamentLibrary, LayerType } from './types';

/**
 * Bambu Lab PLA CMYK filament set.
 * Transmission distances derived from physical measurements of filament light transmission.
 */
export const BAMBU_CMYK_FILAMENTS: FilamentLibrary = {
  [LayerType.CYAN]: {
    name: 'Bambu PLA Cyan',
    hex: '#0086D6',
    transmissionDistance: 8.0,
  },
  [LayerType.MAGENTA]: {
    name: 'Bambu PLA Magenta',
    hex: '#EC008C',
    transmissionDistance: 4.0,
  },
  [LayerType.YELLOW]: {
    name: 'Bambu PLA Yellow',
    hex: '#F4EE2A',
    transmissionDistance: 6.0,
  },
  [LayerType.WHITE]: {
    name: 'Bambu PLA White',
    hex: '#FFFFFF',
    transmissionDistance: 5.0,
  },
};
