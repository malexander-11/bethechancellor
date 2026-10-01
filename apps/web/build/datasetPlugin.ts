import path from 'node:path';
import type { ShippedDataset } from '@btc/engine';
import type { Plugin } from 'vite';

const ID = 'virtual:btc-dataset';
const RESOLVED = `\0${ID}`;

/**
 * The data set is made by the engine and the pipeline, which are TypeScript that Node cannot load
 * as they stand, so tsx loads them: once, and only when the data is first asked for.
 */
async function made() {
  const { tsImport } = await import('tsx/esm/api');
  const module = (await tsImport('@btc/pipeline/shipped', import.meta.url)) as {
    shippedDataset: () => ShippedDataset;
  };
  return module.shippedDataset();
}

/**
 * `import dataset from 'virtual:btc-dataset'`: the shipped data set (`@btc/pipeline/shipped`) as one JSON
 * string, which the browser parses faster than it would the same object written out as code.
 * Served, a change under data/ reloads the page with the data made again.
 */
export function datasetPlugin({ dataDir }: { dataDir: string }): Plugin {
  let code: string | undefined;
  return {
    name: 'btc-dataset',
    resolveId(id) {
      return id === ID ? RESOLVED : undefined;
    },
    async load(id) {
      if (id !== RESOLVED) return undefined;
      code ??= `export default JSON.parse(${JSON.stringify(JSON.stringify(await made()))});\n`;
      return code;
    },
    configureServer(server) {
      server.watcher.add(dataDir);
      server.watcher.on('change', (file) => {
        if (!file.startsWith(dataDir + path.sep)) return;
        code = undefined;
        const module = server.moduleGraph.getModuleById(RESOLVED);
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: 'full-reload' });
      });
    },
  };
}
