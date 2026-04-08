import type { Open3DModule } from '@mw/open3d-types';
import { GeneratePanel } from './Panel';

const generateModule: Open3DModule = {
  id: 'generate',
  name: 'AI Generate',
  icon: 'Sparkles',
  category: 'ai',
  core: false,
  panelPosition: 'right',
  panelWidth: 360,
  produces: ['model/glb', 'model/obj'],
  component: GeneratePanel,
  pipelineSteps: [
    {
      type: 'generate-3d',
      name: 'Generate 3D',
      icon: 'Sparkles',
      description: 'AI image/text to 3D model',
    },
  ],
};

export default generateModule;
