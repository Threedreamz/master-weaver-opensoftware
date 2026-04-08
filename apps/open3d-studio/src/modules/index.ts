import { uploadModule } from './upload/index.js';
import { viewerControlsModule } from './viewer-controls/index.js';
import { converterModule } from './converter/index.js';
import { slicerModule } from './slicer/index.js';
import { cadModule } from './cad/index.js';
import { generateModule } from './generate/index.js';
import { reconstructModule } from './reconstruct/index.js';
import { analyzeModule } from './analyze/index.js';
import { simulateModule } from './simulate/index.js';
import { devtoolsModule } from './devtools/index.js';

import type { Open3DModule } from '@mw/open3d-types';

/** All available modules for Open3D Studio */
export const allModules: Open3DModule[] = [
  // Core modules (always enabled, cannot be disabled)
  uploadModule,
  viewerControlsModule,
  converterModule,
  // Process modules (optional)
  slicerModule,
  cadModule,
  analyzeModule,
  // AI modules (optional)
  generateModule,
  reconstructModule,
  // Simulation modules (optional)
  simulateModule,
  // Dev modules (optional)
  devtoolsModule,
];

export {
  uploadModule,
  viewerControlsModule,
  converterModule,
  slicerModule,
  cadModule,
  generateModule,
  reconstructModule,
  analyzeModule,
  simulateModule,
  devtoolsModule,
};
