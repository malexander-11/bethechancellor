import { formatGbpBn, fromForecast, stageIndex } from '@btc/engine';
import { Fragment, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { JourneyLayout } from '../components/JourneyLayout';
import { Papers } from '../components/Motifs';
import { ESTIMATE, context, levers } from '../data';
import { BRIEFING_WORDS as WORDS, fillIn, templateParts } from '../journey/briefingWords';
import { StepLink } from '../journey/links';
import { useOutcomeOf } from '../journey/outcome';
import { permalinkQuery, reducer, useBudget } from '../state/budget';

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

/**
 * Step 1: your briefing, in three parts (Phase 28, ADR-0030), in the player's own words. Your
 * headroom: the one figure to plan on, what Chancellors have kept since 2010 and why, and that this
 * Budget will likely need to add to it. What headroom is: the two rules, the debt rule in full, the
 * word itself, and what the government must sell to lenders this year and why they care. How
 * it is calculated: what dearer borrowing and dearer prices have done since March, then the OBR's
 * March forecast less each of them, coming to today's estimate. The page is the same in both modes
 * and reads as plain copy (ADR-0031), with no badges (ADR-0034) and no sources: the About page
 * lists them, and the Methodology page says how the estimate is made. Nothing is chosen here and
 * nothing is scored: the primary starts the game on the estimate.
 */
export function OutlookPage() {
  const { state, dispatch } = useBudget();
  const navigate = useNavigate();
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
  // The line on a sensible buffer holds only while the estimate is below the record beside it.
  const belowRecord = figures ? path.estimateGbpm < figures.averageHeadroom.gbpm : false;
  // The debt rule, beneath the rules, has its own year.
  const debtYear = pre.verdicts.find((v) => v.kind === 'stockFalling')?.targetYear ?? year;
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
          />
        </p>
        {figures ? (
          <p className="brief__line">
            {fillIn(WORDS.headroom.history, {
              since: figures.averageHeadroom.since,
              average: formatGbpBn(figures.averageHeadroom.gbpm, 0),
            })}{' '}
            {WORDS.headroom.safety}{' '}
          </p>
        ) : null}
        {belowRecord ? <p className="brief__line">{WORDS.headroom.buffer} </p> : null}
      </section>

      <section className="brief doc" aria-labelledby="brief-what">
        <h2 id="brief-what" className="section-label">
          {WORDS.what.heading}
        </h2>
        <p className="brief__line">
          <Filled template={WORDS.what.rules} values={{ year: yearOf(year) }} />
        </p>
        {/* The debt rule in the running text (it was one fold away until 2026-09-30), in plain type:
            the second of the two rules above, in the player's words. */}
        <p className="brief__line">
          <Filled template={WORDS.what.debtRule.text} values={{ year: yearOf(debtYear) }} />
        </p>
        <p className="brief__line">{WORDS.what.meaning}</p>
        {/* What lenders must buy and why they care, as one paragraph, each part with its sources. */}
        <p className="brief__line">
          {figures ? (
            <>{fillIn(WORDS.what.gilts, { gilts: formatGbpBn(figures.giltSales.gbpm, 0) })} </>
          ) : null}
          {WORDS.what.lenders}{' '}
        </p>
      </section>

      <section className="brief doc" aria-labelledby="brief-calc">
        <h2 id="brief-calc" className="section-label">
          {WORDS.calc.heading}
        </h2>
        <p className="brief__line">{WORDS.calc.intro} </p>
        <dl className="calc">
          <div className="calc__row">
            <dt>{WORDS.calc.forecast}</dt>
            <dd>
              <span className="calc__figure">{formatGbpBn(path.forecastGbpm, 1)}</span>
            </dd>
          </div>
          {path.steps.map((step) => (
            <div key={step.code} className="calc__row">
              <dt>{stepName(step.code)}</dt>
              <dd>
                <span className="calc__figure">{formatGbpBn(step.headroomGbpm, 1, true)}</span>
              </dd>
            </div>
          ))}
          <div className="calc__row calc__row--total">
            <dt>{WORDS.calc.estimate}</dt>
            <dd>
              <span className="calc__figure">{estimateText}</span>
            </dd>
          </div>
        </dl>
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
