import type { Open3DModule } from '@mw/open3d-types';
import { UploadPanel } from './Panel';

export const uploadModule: Open3DModule = {
  id: 'upload',
  name: 'Upload',
  icon: 'Upload',
  category: 'core',
  core: true,
  panelPosition: 'overlay',
  panelWidth: 400,
  produces: ['model/*'],
  component: UploadPanel,
};
