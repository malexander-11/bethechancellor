// What `import dataset from 'virtual:btc-dataset'` holds (tsconfig maps the name here for types):
// the data set, made and checked at build time by apps/web/build/dataset.ts.
import type { ShippedDataset } from './shipped';

declare const dataset: ShippedDataset;
export default dataset;
