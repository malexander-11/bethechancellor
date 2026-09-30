/**
 * The data the browser gets, made in Node when the app is built or served and when the tests
 * start. Everything under data/ is read and checked against its schemas here, the game as shipped
 * is validated, and what no screen shows is left out. The browser only parses JSON: it carries no
 * schemas and no validator, and a data set that does not hold together fails the build rather than
 * the player's page.
 */
import { validateDataset, type Lever, type SourceDoc } from '@btc/engine';
import { loadDataset } from '@btc/pipeline/dataset';
import { liveView } from '@btc/pipeline/live';
import type { ShippedDataset } from '../src/data/shipped';

/** A lever as the screens use it. */
function shippedLever(lever: Lever): Lever {
  // Where its figure sits in the published tables, and the policy it is measured from: read by the
  // pipeline's checks only.
  const costing: Record<string, unknown> = { ...lever.costing };
  delete costing.rawSource;
  delete costing.baselinePolicy;
  const shipped: Record<string, unknown> = { ...lever, costing };
  // Its headline stands in for its description wherever it has one.
  if (lever.headline) delete shipped.description;
  return shipped as Lever;
}

/** A source as the About page lists it; its hash, file and notes serve the pipeline. */
function shippedSource(source: SourceDoc): SourceDoc {
  const { id, org, title, edition, url, landingUrl, retrievedOn } = source;
  return { id, org, title, edition, url, landingUrl, retrievedOn } as SourceDoc;
}

/**
 * The passage a figure is read from, which the pipeline checks against the document: no screen
 * quotes it, so it stays in data/.
 */
function withoutQuotes(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutQuotes);
  if (value === null || typeof value !== 'object') return value;
  const entries = Object.entries(value).filter(
    ([key]) => !(key === 'quote' && 'sourceId' in value),
  );
  return Object.fromEntries(entries.map(([key, v]) => [key, withoutQuotes(v)]));
}

export function shippedDataset(): ShippedDataset {
  const live = liveView(loadDataset());
  const problems = validateDataset(live);
  if (problems.length > 0) {
    throw new Error(`the game's data does not hold together:\n - ${problems.join('\n - ')}`);
  }
  const context = live.contexts.at(-1);
  if (!context) throw new Error('data/context holds no file');
  const shipped: ShippedDataset = {
    sources: { ...live.sources, sources: live.sources.sources.map(shippedSource) },
    vintage: live.vintage,
    rules: live.rules,
    households: live.households,
    context,
    advisers: live.advisers,
    briefings: live.briefings,
    reception: live.reception,
    pm: live.pm,
    ministers: live.ministers,
    interventions: live.interventions,
    options: live.options,
    finetune: live.finetune,
    electorate: live.electorate,
    speech: live.speech,
    incidence: live.incidence,
    verdicts: live.verdicts,
    guide: live.guide,
    glossary: live.glossary,
    levers: live.levers.map(shippedLever),
  };
  return withoutQuotes(shipped) as ShippedDataset;
}
