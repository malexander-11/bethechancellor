import {
  THIN_HEADROOM_GBPM,
  formatGbp,
  formatGbpBn,
  fromForecast,
  stageIndex,
  type ContextReading,
  type SourceRef,
} from '@btc/engine';
import { Fragment, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { EstimateRow, summariseReading } from '../components/AssumptionsTable';
import { InTray } from '../components/InTray';
import { JourneyLayout } from '../components/JourneyLayout';
import { LabelBadge } from '../components/LabelBadge';
import { ModeLine } from '../components/ModeLine';
import { Papers } from '../components/Motifs';
import { Marked } from '../components/PageIntro';
import { SourceList } from '../components/SourceLink';
import { TableScroll } from '../components/TableScroll';
import { ESTIMATE, context, levers, rules, vintage } from '../data';
import {
  BRIEFING_SOURCES,
  BRIEFING_WORDS as WORDS,
  fillIn,
  templateParts,
} from '../journey/briefingWords';
import { StepLink } from '../journey/links';
import { useMode } from '../journey/mode';
import { useOutcomeOf } from '../journey/outcome';
import { suggestSetting } from '../journey/suggest';
import { WorkingsOnly, useWorkings } from '../journey/workings';
import { permalinkQuery, reducer, useBudget } from '../state/budget';

const COUNT = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];

/** A sum as the government states it: under a billion in millions, "£850 million" (Phase 25). */
function sumInWords(gbpm: number): string {
  const abs = Math.abs(gbpm);
  return abs < 1000 ? `${formatGbp(abs)} million` : formatGbpBn(abs, 1);
}
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

const reading = (id: string): ContextReading | undefined =>
  context.readings.find((r) => r.id === id);

/** A template of the briefing's words with its placeholders filled, each by text or a node. */
function Filled({ template, values }: { template: string; values: Record<string, ReactNode> }) {
  return (
    <>
      {templateParts(template).map((part, i) =>
        'key' in part ? (
          <Fragment key={i}>{values[part.key] ?? `{${part.key}}`}</Fragment>
        ) : (
          <Marked key={i} text={part.text} />
        ),
      )}
    </>
  );
}

/** Each reference once, in the order first met. */
function distinct(refs: readonly SourceRef[]): SourceRef[] {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = JSON.stringify(ref);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Step 1: your briefing, in three parts (Phase 28, ADR-0030), as the player asked for it. Your
 * headroom: the one figure to plan on, and what Chancellors have kept since 2010. What headroom
 * is: the two rules, the word itself, what the government must borrow from lenders this year and
 * why they care. How it is calculated: the OBR's March forecast, less what dearer borrowing and
 * dearer prices have done to it, coming to today's estimate, and the advisers' advice to keep more
 * than the markets' thin line. What is already on the desk follows, in both modes. In advanced mode
 * (Phase 27, ADR-0028) three folds add the rules in the Charter's words, what changed since March
 * and why forecasts move; with the workings on, the table the estimate is made from. Nothing is
 * chosen here, and nothing is set as a target: the primary starts the game on the estimate.
 */
export function OutlookPage() {
  const { state, dispatch } = useBudget();
  const navigate = useNavigate();
  const workings = useWorkings();
  const basic = useMode() === 'basic';
  const outcomeOf = useOutcomeOf();
  // The starting position: today's estimate with no policy of the player's own, from the forecast.
  const pre = outcomeOf({ ...ESTIMATE });
  const path = fromForecast(pre);
  const { year } = path;
  // A fiscal year reads as one word: "2029-30" never breaks at its hyphen.
  const yearNode = <span className="brief__year">{year}</span>;
  const short = path.estimateGbpm < 0;
  const estimateText = formatGbpBn(path.estimateGbpm, 1, short);
  const figures = context.briefing;
  const lastYear = pre.paths.years.at(-1) ?? year;
  const typicalErrorGbpm =
    (vintage.uncertainty.receiptsMeanAbsFiveYearErrorPctGdp / 100) *
    (pre.paths.baseline.nominalGdpFy[lastYear] ?? 0);
  const gilts = reading('gilt-10y');
  const prices = context.readings.find((r) => r.leverCode === 'rpi');
  const decisions = context.decisionsSinceForecast;

  // The rows' sources, with the workings on: the March forecast's own table, then for each setting
  // the OBR's sensitivity that turns it into money and the reading it is taken from.
  const calcSources = distinct([
    vintage.checks.stabilityHeadroomGbpm.source,
    ...path.steps.flatMap((step) => {
      const lever = levers.find((l) => l.code === step.code);
      const id = lever?.costing.kind === 'sensitivity' ? lever.costing.sensitivityId : undefined;
      const sensitivity = vintage.sensitivities.find((s) => s.id === id);
      const read = context.readings.find((r) => r.leverCode === step.code);
      return [...(sensitivity ? [sensitivity.source] : []), ...(read ? [read.latest.source] : [])];
    }),
  ]);
  const stepName = (code: string) => {
    const words = WORDS.calc.steps[code];
    const lever = levers.find((l) => l.code === code);
    if (!words) return lever?.title ?? code;
    return (ESTIMATE[code] ?? 0) >= (lever?.control.default ?? 0) ? words.up : words.down;
  };

  const begin = () => {
    const started = reducer(state, { type: 'startGame' });
    const patch = { reached: Math.max(started.game?.reached ?? 0, stageIndex('pm')) };
    dispatch({ type: 'startGame' });
    dispatch({ type: 'updateGame', patch });
    const next = reducer(started, { type: 'updateGame', patch });
    navigate({ pathname: '/pm', search: `?${permalinkQuery(next)}` });
  };

  return (
    <JourneyLayout step="outlook">
      <section className="brief doc" aria-labelledby="brief-headroom">
        <h2 id="brief-headroom" className="section-label">
          <Papers /> {WORDS.headroom.heading}
        </h2>
        <p className="brief__figure">
          <Filled
            template={short ? WORDS.headroom.shortfall : WORDS.headroom.figure}
            values={{
              estimate: <strong>{formatGbpBn(Math.abs(path.estimateGbpm), 1)}</strong>,
              year: yearNode,
            }}
          />{' '}
          <LabelBadge badge="assumption" />
        </p>
        {figures ? (
          <p className="brief__line">
            <LabelBadge badge="direct" />{' '}
            {fillIn(WORDS.headroom.history, {
              since: figures.averageHeadroom.since,
              average: formatGbpBn(figures.averageHeadroom.gbpm, 0),
            })}{' '}
            <SourceList
              as="span"
              className="briefing__sources"
              refs={[figures.averageHeadroom.source]}
            />
          </p>
        ) : null}
      </section>

      <section className="brief doc" aria-labelledby="brief-what">
        <h2 id="brief-what" className="section-label">
          {WORDS.what.heading}
        </h2>
        <p className="brief__line">
          <Filled template={WORDS.what.rules} values={{ year: yearNode }} />
        </p>
        <p className="brief__line">
          <Marked text={WORDS.what.meaning} />
        </p>
        {figures ? (
          <p className="brief__line">
            <LabelBadge badge="direct" />{' '}
            <Marked
              text={fillIn(WORDS.what.gilts, { gilts: formatGbpBn(figures.giltSales.gbpm, 0) })}
            />{' '}
            <SourceList as="span" className="briefing__sources" refs={[figures.giltSales.source]} />
          </p>
        ) : null}
        <p className="brief__line">
          <LabelBadge badge="commentary" /> {WORDS.what.lenders}{' '}
          <SourceList as="span" className="briefing__sources" refs={BRIEFING_SOURCES.lenders} />
        </p>
        {basic ? null : (
          <details className="more">
            <summary>{WORDS.what.rulesFold}</summary>
            <dl className="more__body rules-key">
              {rules.rules.map((r) => (
                <div key={r.id}>
                  <dt>
                    {r.shortName.charAt(0).toUpperCase() + r.shortName.slice(1)}
                    {r.shortName.replace(/^the /, '').toLowerCase() !== r.name.toLowerCase() ? (
                      <span className="rules-key__official"> (officially the {r.name})</span>
                    ) : null}
                  </dt>
                  <dd>
                    {r.plainEnglish}
                    {workings ? (
                      <>
                        {' '}
                        <span className="source">The Charter says: “{r.charterText}”</span>{' '}
                        <SourceList as="span" className="briefing__sources" refs={[r.source]} />
                      </>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        )}
      </section>

      <section className="brief doc" aria-labelledby="brief-calc">
        <h2 id="brief-calc" className="section-label">
          {WORDS.calc.heading}
        </h2>
        <dl className="calc">
          <div className="calc__row">
            <dt>{WORDS.calc.forecast}</dt>
            <dd>
              <span className="calc__figure">{formatGbpBn(path.forecastGbpm, 1)}</span>{' '}
              <LabelBadge badge="direct" />
            </dd>
          </div>
          {path.steps.map((step) => (
            <div key={step.code} className="calc__row">
              <dt>{stepName(step.code)}</dt>
              <dd>
                <span className="calc__figure">{formatGbpBn(step.headroomGbpm, 1, true)}</span>{' '}
                <LabelBadge badge={step.badge} />
              </dd>
            </div>
          ))}
          <div className="calc__row calc__row--total">
            <dt>{WORDS.calc.estimate}</dt>
            <dd>
              <span className="calc__figure">{estimateText}</span> <LabelBadge badge="assumption" />
            </dd>
          </div>
        </dl>
        <SourceList className="briefing__sources" refs={calcSources} />
        <p className="brief__line">
          <LabelBadge badge="simulated" />{' '}
          {fillIn(WORDS.calc.advice, { thin: formatGbpBn(THIN_HEADROOM_GBPM, 0) })}{' '}
          <SourceList as="span" className="briefing__sources" refs={BRIEFING_SOURCES.advice} />
        </p>
        {basic ? null : (
          <>
            <details className="more">
              <summary>{WORDS.since.fold}</summary>
              <div className="more__body since">
                <p>
                  {gilts
                    ? `${fillIn(WORDS.since.rates, {
                        giltsNow: summariseReading(gilts.latest, gilts.unit),
                        giltsObr: summariseReading(gilts.obr, gilts.unit),
                      })} `
                    : null}
                  {prices
                    ? fillIn(WORDS.since.prices, {
                        pricesNow: summariseReading(prices.latest, prices.unit),
                        pricesObr: summariseReading(prices.obr, prices.unit),
                        pricesTo: Object.keys(prices.latest.series ?? {}).at(-1) ?? '',
                      })
                    : null}
                </p>
                <SourceList
                  className="briefing__sources"
                  refs={[
                    ...(gilts ? [gilts.latest.source, gilts.obr.source] : []),
                    ...(prices ? [prices.latest.source, prices.obr.source] : []),
                  ]}
                />
                {decisions.length > 0 ? (
                  <>
                    <p>
                      {fillIn(WORDS.since.decisions, {
                        count: COUNT[decisions.length] ?? String(decisions.length),
                      })}
                    </p>
                    <ul className="since__list">
                      {decisions.map((d) => (
                        <li key={d.id}>
                          {/* Two sentences, each one breath (Phase 25). */}
                          {d.title}: {sumInWords(d.amountGbpm)}. Paid for by {lowerFirst(d.paidFor)}
                          .
                          <SourceList as="span" className="briefing__sources" refs={d.sources} />
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
            </details>
            <details className="more">
              <summary>{WORDS.forecasts.fold}</summary>
              <aside className="note more__body" aria-label="Why forecasts move, by your adviser">
                <p>
                  <span className="kicker">{WORDS.forecasts.who}</span>{' '}
                  <LabelBadge badge="simulated" />
                </p>
                <p>{fillIn(WORDS.forecasts.error, { error: formatGbpBn(typicalErrorGbpm, 0) })}</p>
                <p>{WORDS.forecasts.others}</p>
                <p>{WORDS.forecasts.process}</p>
                <SourceList refs={BRIEFING_SOURCES.forecasts} />
              </aside>
            </details>
          </>
        )}
        <WorkingsOnly>
          <details className="more">
            <summary>{WORDS.workings}</summary>
            <div className="more__body">
              <p className="panel__hint">
                Each setting is the latest reading less the OBR’s March figure, rounded to the step
                the game uses. The OBR’s own sensitivities turn the settings into headroom.
              </p>
              <p className="panel__hint">
                <LabelBadge badge="assumption" /> The OBR’s figure is for Bank Rate and gilt yields
                moving together; we apply it to the rise in gilt yields alone, so the estimate leans
                cautious.{' '}
                <SourceList
                  as="span"
                  className="briefing__sources"
                  refs={[{ sourceId: 'obr-efo-2026-03', paragraph: '6.17' }]}
                />
              </p>
              <TableScroll label="How the estimate is made">
                <table className="measures">
                  <thead>
                    <tr>
                      <th>Reading</th>
                      <th>OBR in March</th>
                      <th>Latest</th>
                      <th>Setting used</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {context.readings.map((r) => (
                      <EstimateRow
                        key={r.id}
                        reading={r}
                        lever={r.leverCode ? levers.find((l) => l.code === r.leverCode) : undefined}
                      />
                    ))}
                  </tbody>
                </table>
              </TableScroll>
              <ul className="since__list">
                {context.readings.map((r) => {
                  const lever = r.leverCode
                    ? levers.find((l) => l.code === r.leverCode)
                    : undefined;
                  const s = lever ? suggestSetting(r, lever) : null;
                  return s ? (
                    <li key={r.id}>
                      <strong>{r.title}</strong>: {s.rationale}
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
          </details>
        </WorkingsOnly>
      </section>

      <InTray values={ESTIMATE} />

      <ModeLine kind="briefing" />
      <p className="actions">
        <button type="button" className="btn btn--primary" onClick={begin}>
          Set your priorities
        </button>
        <StepLink to="/" className="btn">
          Back
        </StepLink>
      </p>
    </JourneyLayout>
  );
}
