// Types & config
export {
  LayerType,
  ColorCorrection,
  createDefaultLithoConfig,
  createDefaultLuminanceConfig,
} from './types';
export type {
  LuminanceConfig,
  FilamentDefinition,
  FilamentProperties,
  FilamentLibrary,
  LithoConfig,
  IntensityChannels,
  LithoMesh,
  LithoResult,
} from './types';

// Filaments
export { BAMBU_CMYK_FILAMENTS } from './filaments';

// Color mixing (Beer-Lambert CMYK)
export {
  hexToRgb,
  calculateColorThicknesses,
  extractChannelsLuminance,
  extractChannelsLinear,
} from './color-mixing';

// Image analysis
export { pixelate, calculateBlockSize } from './image-analyzer';
export type { PixelatedImage } from './image-analyzer';

// Mesh generation
export {
  createLayerMesh,
  createBasePlate,
  generateLithophane,
  meshToSTLBinary,
} from './mesh-generator';

// Multi-material assembly
export { assembleLithophane3MF } from './assembly';
export type { Material3MF, Model3MF, Assembly3MF } from './assembly';
