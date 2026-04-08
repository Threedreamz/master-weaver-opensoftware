import type { Open3DModule } from '@mw/open3d-types';
import { SimulatePanel } from './Panel';

const simulateModule: Open3DModule = {
  id: 'simulate',
  name: 'Simulate',
  icon: 'Zap',
  category: 'simulate',
  core: false,
  panelPosition: 'right',
  panelWidth: 340,
  component: SimulatePanel,
  pipelineSteps: [
    {
      type: 'custom-lrp',
      name: 'FEA Analysis',
      icon: 'Zap',
      description: 'Stress simulation',
    },
    {
      type: 'custom-lrp',
      name: 'CAM Toolpath',
      icon: 'Factory',
      description: 'CNC toolpath generation',
    },
  ],
};

export default simulateModule;
