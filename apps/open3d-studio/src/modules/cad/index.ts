import type { Open3DModule } from '@mw/open3d-types';
import { CADPanel } from './Panel';

const cadModule: Open3DModule = {
  id: 'cad',
  name: 'CAD',
  icon: 'Box',
  category: 'process',
  core: false,
  panelPosition: 'right',
  panelWidth: 320,
  produces: ['model/stl', 'model/obj'],
  component: CADPanel,
  pipelineSteps: [
    {
      type: 'custom-lrp',
      name: 'CAD Generate',
      icon: 'Box',
      description: 'Generate parametric shapes',
    },
  ],
};

export default cadModule;
