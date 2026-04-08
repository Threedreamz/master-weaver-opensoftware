export enum LayerType {
  CYAN = 'cyan',
  YELLOW = 'yellow',
  MAGENTA = 'magenta',
  WHITE = 'white',
  CLEAR = 'clear',
  BASE = 'base',
}

export enum ColorCorrection {
  LINEAR = 'linear',
  LUMINANCE = 'luminance',
}

export interface LuminanceConfig {
  /** Target thickness multiplier for CMY layers (default 0.05) */
  cymTargetThickness: number;
  /** Target thickness multiplier for white/intensity layer (default 0.2) */
  whiteTargetThickness: number;
}

export interface FilamentDefinition {
  manufacturer: string;
  filamentType: string;
  colorName: string;
  hexValue: string;
  transmissionDistance: number;
}

export interface FilamentProperties {
  name: string;
  hex: string;
  transmissionDistance: number;
}

export type FilamentLibrary = Record<
  LayerType.CYAN | LayerType.MAGENTA | LayerType.YELLOW | LayerType.WHITE,
  FilamentProperties
>;

export interface LithoConfig {
  /** Height of the base plate in mm (default 0.2) */
  baseHeight: number;
  /** Size of each pixel in mm (default 1.0) */
  pixelSize: number;
  /** Height quantization step in mm. 0 for continuous height */
  heightStepMm: number;
  /** Whether the lithophane is viewed from the top (default true) */
  faceUp: boolean;
  /** Minimum height for intensity/white layers in mm (default 0.2) */
  intensityMinHeight: number;
  /** Color correction method */
  colorCorrection: ColorCorrection;
  /** Luminance-based thickness configuration */
  luminanceConfig: LuminanceConfig;
  /** CMYK filament definitions */
  filaments: FilamentLibrary;
}

export interface IntensityChannels {
  cChannel: Float32Array;
  mChannel: Float32Array;
  yChannel: Float32Array;
  wChannel: Float32Array;
  width: number;
  height: number;
}

export interface LithoMesh {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

export interface LithoResult {
  baseMesh: LithoMesh;
  cyanMesh: LithoMesh;
  yellowMesh: LithoMesh;
  magentaMesh: LithoMesh;
  whiteMesh: LithoMesh;
  width: number;
  height: number;
}

export function createDefaultLuminanceConfig(): LuminanceConfig {
  return {
    cymTargetThickness: 0.05,
    whiteTargetThickness: 0.2,
  };
}

/**
 * Create a default LithoConfig with Bambu CMYK filaments.
 * Pass a custom FilamentLibrary to override.
 */
export function createDefaultLithoConfig(filaments?: FilamentLibrary): LithoConfig {
  // Default filaments are provided by the caller or via the filaments module.
  // We accept them as a parameter to avoid circular imports (types -> filaments -> types).
  // Usage: createDefaultLithoConfig(BAMBU_CMYK_FILAMENTS)
  const defaultFilaments: FilamentLibrary = filaments ?? {
    [LayerType.CYAN]: { name: 'Bambu PLA Cyan', hex: '#0086D6', transmissionDistance: 8.0 },
    [LayerType.MAGENTA]: { name: 'Bambu PLA Magenta', hex: '#EC008C', transmissionDistance: 4.0 },
    [LayerType.YELLOW]: { name: 'Bambu PLA Yellow', hex: '#F4EE2A', transmissionDistance: 6.0 },
    [LayerType.WHITE]: { name: 'Bambu PLA White', hex: '#FFFFFF', transmissionDistance: 5.0 },
  };
  return {
    baseHeight: 0.2,
    pixelSize: 1.0,
    heightStepMm: 0,
    faceUp: true,
    intensityMinHeight: 0.2,
    colorCorrection: ColorCorrection.LINEAR,
    luminanceConfig: createDefaultLuminanceConfig(),
    filaments: defaultFilaments,
  };
}
