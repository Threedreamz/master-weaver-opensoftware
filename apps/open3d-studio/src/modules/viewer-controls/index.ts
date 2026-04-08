import type { Open3DModule } from '@mw/open3d-types';
import { ViewerControlsPanel } from './Panel';

export const viewerControlsModule: Open3DModule = {
  id: 'viewer-controls',
  name: 'View',
  icon: 'Eye',
  category: 'core',
  core: true,
  panelPosition: 'right',
  panelWidth: 280,
  component: ViewerControlsPanel,
};
