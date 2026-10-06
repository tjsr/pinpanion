import * as config from './vitest.config.ts';

import { defineWorkspace } from 'vitest/config';
import { findFileUpwards } from './test/testutils.ts';

const setupPath = findFileUpwards('test/vitest.setup.ts');

export default defineWorkspace([
  {
    ...config.default,
    test: {
      ...config.default.test,
      setupFiles: [setupPath],
    },
  },
]);
