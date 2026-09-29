import {
  formatGbpBn,
  fromForecast,
  stageIndex,
  type Badge,
  type ContextReading,
  type SourceRef,
} from '@btc/engine';
import { Fragment, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { EstimateRow } from '../components/AssumptionsTable';
import { JourneyLayout } from '../components/JourneyLayout';
import { LabelBadge } from '../components/LabelBadge';
import { Papers } from '../components/Motifs';
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
import { useOutcomeOf } from '../journey/outcome';
import { suggestSetting } from '../journey/suggest';
import { WorkingsOnly, useWorkings } from '../journey/workings';
import { permalinkQuery, reducer, useBudget } from '../state/budget';

const reading = (id: string): ContextReading | undefined =>
  context.readings.find((r) => r.id === id);

/** A template of the briefing's words with its placeholders filled, each by text or a node. */
function Filled({ template, values }: { template: string; values: Record<string, ReactNode> }) {
  return (
    <>
      {templateParts(template).map((part, i) => (
        <Fragment key={i}>
          {'key' in part ? (values[part.key] ?? `{${part.key}}`) : part.text}
        </Fragment>
      ))}
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
 * Step 1: your briefing, in three parts (Phase 28, ADR-0030), in the player's own words. Your
 * headroom: the one figure to plan on, what Chancellors have kept since 2010 and why, and what
 * reaching that record would take. What headroom is: the two rules, the word itself, what the
 * government must sell to lenders this year and why they care, and the debt rule one fold away. How
 * it is calculated: what dearer borrowing and dearer prices have done since March, then the OBR's
 * March forecast less each of them, coming to today's estimate. The page is the same in both modes
 * and reads as plain copy (ADR-0031): each figure's badge, like its source, waits for the workings,
 * and with them on the table the estimate is made from. Nothing is chosen here and nothing is
 * scored: the primary starts the game on the estimate.
 */
export function OutlookPage() {
  const { state, dispatch } = useBudget();
  const navigate = useNavigate();
  const workings = useWorkings();
  const outcomeOf = useOutcomeOf();
  // The starting position: today's estimate with no policy of the player's own, from the forecast.
  const pre = outcomeOf({ ...ESTIMATE });
  const path = fromForecast(pre);
  const { year } = path;
  // A fiscal year reads as one word: "2029-30" never breaks at its hyphen.
  const yearOf = (fy: string) => <span className="brief__year">{fy}</span>;
  const short = path.estimateGbpm < 0;
  const estimateText = formatGbpBn(path.estimateGbpm, 1, short);
  const figures = context.briefing;
  // What reaching the record would take: the record less the estimate, both on show beside it.
  const gapGbpm = figures ? figures.averageHeadroom.gbpm - path.estimateGbpm : 0;
  // The debt rule, in the fold beneath the rules: its own year, and the Charter's words.
  const debtRule = rules.rules.find((r) => r.kind === 'stockFalling');
  const debtYear = pre.verdicts.find((v) => v.kind === 'stockFalling')?.targetYear ?? year;
  // What the calculation's opening line rests on: the gilt yield and prices against what the OBR
  // assumed, and the OBR tying RPI to debt interest.
  const gilts = reading('gilt-10y');
  const cpi = reading('cpi-latest');
  const introSources = distinct([
    ...(gilts ? [gilts.latest.source, gilts.obr.source] : []),
    ...(cpi ? [cpi.latest.source, cpi.obr.source] : []),
    ...BRIEFING_SOURCES.calc,
  ]);
  // Each figure's badge waits for the workings, as its source does: with them off the briefing
  // reads as plain copy (ADR-0031).
  const tag = (badge: Badge) => (workings ? <LabelBadge badge={badge} /> : null);

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
              year: yearOf(year),
            }}
          />{' '}
          {tag('assumption')}
        </p>
        {figures ? (
          <p className="brief__line">
            {tag('direct')}{' '}
            {fillIn(WORDS.headroom.history, {
              since: figures.averageHeadroom.since,
              average: formatGbpBn(figures.averageHeadroom.gbpm, 0),
            })}{' '}
            <SourceList
              as="span"
              className="briefing__sources"
              refs={[figures.averageHeadroom.source]}
            />{' '}
            {tag('commentary')} {WORDS.headroom.safety}{' '}
            <SourceList as="span" className="briefing__sources" refs={BRIEFING_SOURCES.safety} />
          </p>
        ) : null}
        {figures && gapGbpm > 0 ? (
          <p className="brief__line">
            {tag('simulated')} {fillIn(WORDS.headroom.buffer, { gap: formatGbpBn(gapGbpm, 0) })}{' '}
            <SourceList as="span" className="briefing__sources" refs={BRIEFING_SOURCES.buffer} />
          </p>
        ) : null}
      </section>

      <section className="brief doc" aria-labelledby="brief-what">
        <h2 id="brief-what" className="section-label">
          {WORDS.what.heading}
        </h2>
        <p className="brief__line">
          <Filled template={WORDS.what.rules} values={{ year: yearOf(year) }} />
        </p>
        <p className="brief__line">{WORDS.what.meaning}</p>
        {/* What lenders must buy and why they care, as one paragraph; each part keeps its badge. */}
        <p className="brief__line">
          {figures ? (
            <>
              {tag('direct')}{' '}
              {fillIn(WORDS.what.gilts, { gilts: formatGbpBn(figures.giltSales.gbpm, 0) })}{' '}
              <SourceList
                as="span"
                className="briefing__sources"
                refs={[figures.giltSales.source]}
              />{' '}
            </>
          ) : null}
          {tag('commentary')} {WORDS.what.lenders}{' '}
          <SourceList as="span" className="briefing__sources" refs={BRIEFING_SOURCES.lenders} />
        </p>
        <details className="more">
          <summary>{WORDS.what.debtRule.heading}</summary>
          <div className="more__body">
            <p>
              <Filled template={WORDS.what.debtRule.text} values={{ year: yearOf(debtYear) }} />
            </p>
            {workings && debtRule ? (
              <p>
                <span className="source">The Charter says: “{debtRule.charterText}”</span>{' '}
                <SourceList as="span" className="briefing__sources" refs={[debtRule.source]} />
              </p>
            ) : null}
          </div>
        </details>
      </section>

      <section className="brief doc" aria-labelledby="brief-calc">
        <h2 id="brief-calc" className="section-label">
          {WORDS.calc.heading}
        </h2>
        <p className="brief__line">
          {WORDS.calc.intro}{' '}
          <SourceList as="span" className="briefing__sources" refs={introSources} />
        </p>
        <dl className="calc">
          <div className="calc__row">
            <dt>{WORDS.calc.forecast}</dt>
            <dd>
              <span className="calc__figure">{formatGbpBn(path.forecastGbpm, 1)}</span>
              {tag('direct')}
            </dd>
          </div>
          {path.steps.map((step) => (
            <div key={step.code} className="calc__row">
              <dt>{stepName(step.code)}</dt>
              <dd>
                <span className="calc__figure">{formatGbpBn(step.headroomGbpm, 1, true)}</span>
                {tag(step.badge)}
              </dd>
            </div>
          ))}
          <div className="calc__row calc__row--total">
            <dt>{WORDS.calc.estimate}</dt>
            <dd>
              <span className="calc__figure">{estimateText}</span>
              {tag('assumption')}
            </dd>
          </div>
        </dl>
        <SourceList className="briefing__sources" refs={calcSources} />
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
