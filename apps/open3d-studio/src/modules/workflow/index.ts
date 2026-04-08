import type { Open3DModule } from '@mw/open3d-types';
import { WorkflowPanel } from './Panel';

export const workflowModule: Open3DModule = {
  id: 'workflow',
  name: 'Workflows',
  icon: 'GitBranch',
  category: 'dev',
  core: false,
  panelPosition: 'right',
  panelWidth: 380,
  component: WorkflowPanel,
  pipelineSteps: [
    {
      type: 'workflow-run',
      name: 'Run Workflow',
      icon: 'Play',
      description: 'Execute a saved workflow or preset pipeline',
    },
  ],
};
