import { createFileConfig, createExternalDeps } from 'ssh-dev-scripts/src/rollup.config';
export default createFileConfig({ input: 'src/deep-state.ts', external: createExternalDeps({ '@babel/runtime': 'version' }) });
