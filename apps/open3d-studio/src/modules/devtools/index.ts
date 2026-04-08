import type { Open3DModule } from '@mw/open3d-types';
import { DevToolsPanel } from './Panel';

export const devtoolsModule: Open3DModule = {
  id: 'devtools',
  name: 'Dev Tools',
  icon: 'Terminal',
  category: 'dev',
  core: false,
  panelPosition: 'right',
  panelWidth: 400,
  component: DevToolsPanel,
};
