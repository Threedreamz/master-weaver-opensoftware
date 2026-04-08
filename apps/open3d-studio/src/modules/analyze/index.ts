import type { Open3DModule } from '@mw/open3d-types';
import { AnalyzePanel } from './Panel';

const analyzeModule: Open3DModule = {
  id: 'analyze',
  name: 'Analyze',
  icon: 'Search',
  category: 'process',
  core: false,
  panelPosition: 'right',
  panelWidth: 320,
  accepts: ['model/stl', 'model/obj', 'model/gltf'],
  component: AnalyzePanel,
  pipelineSteps: [
    {
      type: 'analyze',
      name: 'Analyze Mesh',
      icon: 'Search',
      description: 'Compute mesh metrics',
    },
    {
      type: 'repair',
      name: 'Repair Mesh',
      icon: 'Wrench',
      description: 'Fix mesh issues',
    },
  ],
};

export default analyzeModule;
