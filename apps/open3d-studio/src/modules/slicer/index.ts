import type { Open3DModule } from '@mw/open3d-types';
import { SlicerPanel } from './Panel';

const slicerModule: Open3DModule = {
  id: 'slicer',
  name: 'Slicer',
  icon: 'Layers',
  category: 'process',
  core: false,
  panelPosition: 'right',
  panelWidth: 320,
  accepts: ['model/stl', 'model/obj'],
  component: SlicerPanel,
  pipelineSteps: [
    {
      type: 'slice',
      name: 'Slice Model',
      icon: 'Layers',
      description: 'Slice for 3D printing',
    },
  ],
};

export default slicerModule;
