import { createFileConfig, createExternalDeps } from 'ssh-dev-scripts/src/rollup.config';
export default createFileConfig({ external: createExternalDeps({ '@babel/runtime': 'version' }) });
