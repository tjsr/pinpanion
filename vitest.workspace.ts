import * as config from './vitest.config.ts';

import { defineWorkspace } from 'vitest/config';
import path from 'node:path';

process.env.PROJECT_ROOT = 'h:/dev/workspaces/pinny/pinnysets/';

export default defineWorkspace([
  { ...config.default,
    test: {
      ...config.default.test,
      setupFiles: [path.join(process.env.PROJECT_ROOT || process.cwd(), 'test/vitest.setup.ts')],
    },
  },
]
);
