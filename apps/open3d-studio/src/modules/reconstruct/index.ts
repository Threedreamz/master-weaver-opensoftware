import type { Open3DModule } from '@mw/open3d-types';
import { ReconstructPanel } from './Panel';

const reconstructModule: Open3DModule = {
  id: 'reconstruct',
  name: 'Reconstruct',
  icon: 'Camera',
  category: 'ai',
  core: false,
  panelPosition: 'right',
  panelWidth: 340,
  component: ReconstructPanel,
  pipelineSteps: [
    {
      type: 'custom-lrp',
      name: 'Reconstruct 3D',
      icon: 'Camera',
      description: '3D from photos',
    },
  ],
};

export default reconstructModule;
