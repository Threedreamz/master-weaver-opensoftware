import type { Open3DModule } from '@mw/open3d-types';
import { ConverterPanel } from './Panel';

export const converterModule: Open3DModule = {
  id: 'converter',
  name: 'Converter',
  icon: 'ArrowRightLeft',
  category: 'core',
  core: true,
  panelPosition: 'right',
  panelWidth: 320,
  accepts: ['model/*'],
  produces: ['model/*'],
  component: ConverterPanel,
  pipelineSteps: [
    {
      type: 'convert',
      name: 'Convert Format',
      icon: 'ArrowRightLeft',
      description: 'Convert between 3D formats',
    },
  ],
};
