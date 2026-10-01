// What `import dataset from 'virtual:btc-dataset'` holds (tsconfig maps the name here for types):
// the data set, made and checked at build time by `@btc/pipeline/shipped`.
import type { ShippedDataset } from '@btc/engine';

declare const dataset: ShippedDataset;
export default dataset;
