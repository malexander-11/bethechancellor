import {
  ambitionStatus,
  changeRows,
  formatGbpBn,
  headroomWords,
  incidenceRows,
  preBudget,
  reactionPreview,
  receptions,
  reconcile,
  reconcileWords,
  signOffLine,
  stageIndex,
  THIN_HEADROOM_GBPM,
  typicalErrorGbpm,
} from '@btc/engine';
import type { ReactNode } from 'react';
import { HeadroomBar } from '../components/HeadroomBar';
import { JourneyLayout } from '../components/JourneyLayout';
import { ChangeList } from '../components/ChangeList';
import { promiseWords } from '../components/LeverControl';
import { Spoken } from '../components/Conversation';
import { Yardstick } from '../components/Yardstick';
import { finetuneName, incidence, levers, pm, reception, vintage } from '../data';
import { useStageGuard } from '../journey/guard';
import { StepLink } from '../journey/links';
import { useOutcomeOf } from '../journey/outcome';
import { isMissed, missedBy } from '../journey/rules';
import { useBudget } from '../state/budget';

/** Above this rise in the tax take, in points of GDP, the review says it (Phase 25): the markets' band. */
const TAX_TAKE_SAID_PP = 0.5;

/** A change in points of GDP as money in every £100 of national income: "74p", "£1.20". */
function inEvery100(pp: number): string {
  const pence = Math.round(pp * 100);
  return pence >= 100 ? `£${(pence / 100).toFixed(2)}` : `${pence}p`;
}

/** "a, b and c" */
function list(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** One section of the review: what it is called, what is in it, and where to change it. */
function Part({
  id,
  title,
  change,
  children,
}: {
  id: string;
  title: string;
  change: { to: string; label: string };
  children: ReactNode;
}) {
  return (
    <section className="review doc" aria-labelledby={`${id}-heading`}>
      <div className="review__head">
        <h2 id={`${id}-heading`} className="section-label">
          {title}
        </h2>
        <span className="review__change">
          <StepLink to={change.to}>{change.label}</StepLink>
        </span>
      </div>
      {children}
    </section>
  );
}

/**
 * Step 2: deliver the Budget (Phase 24, ADR-0025; the second of three steps since ADR-0045). The
 * Budget as it stands, read back before it is delivered: every tax and every other budget you
 * changed in the Chancellor's Budget, and where that leaves you against the rules and the
 * manifesto, in words (the bar above already says the figure). Every part has a way back to the
 * screen that set it, carrying the Budget, so nothing is final until the red button. Every figure
 * is the engine's for the target year. The Prime Minister signs off in one line when something
 * needs saying, and one reaction already in train is read out with no rating (Phase 25).
 */
export function ReviewPage() {
  const { state, dispatch, outcome } = useBudget();
  const outcomeOf = useOutcomeOf();
  const game = state.game;
  const guard = useStageGuard('review');
  if (guard || !game) return guard;

  const status = ambitionStatus(pm, outcome, levers);
  const rows = changeRows({ outcome, levers, names: finetuneName });
  const taxRows = rows.filter((r) => r.side === 'tax');
  const spendingRows = rows.filter((r) => r.side === 'spending');
  const missed = outcome.verdicts.filter(isMissed);
  const fiscalMissed = missed.filter((v) => v.kind !== 'welfareCap');
  const rulesLine =
    missed.length === 0
      ? 'You meet both fiscal rules.'
      : fiscalMissed.length === 0
        ? `You meet both fiscal rules, but miss ${list(missed.map(missedBy))}.`
        : `Missed on these numbers: ${list(missed.map(missedBy))}.`;
  // How the bar got from the Chancellor's Budget to here (Phase 25): the four parts sum to it
  // exactly.
  const r = reconcile(outcome, preBudget(outcomeOf, state.leverValues, levers));
  const money = (gbpm: number) => formatGbpBn(Math.abs(gbpm), 1);
  const fromTo = headroomWords(r);
  const how = reconcileWords(r);
  const { paid, benefited } = incidenceRows(outcome, levers, incidence, r.year);
  const payer = paid.find((row) => row.gbpm >= 50);
  const loser = benefited.find((row) => row.gbpm <= -50);
  const whoPays = payer
    ? `Who pays most: ${lowerFirst(payer.label)}, ${money(payer.gbpm)} in ${r.year}.`
    : loser
      ? `Who loses most: ${lowerFirst(loser.label)}, ${money(loser.gbpm)} less in ${r.year}.`
      : null;
  // The Prime Minister signs off (Phase 25): one line, by first match, naming what it is about; a
  // promise it names is not tagged again below it.
  const signOff = signOffLine({ pm, outcome, status, levers, outcomeOf });
  const named = new Set(signOff?.names ?? []);
  // The manifesto: broken by a lever (red), or kept in its words and strained (amber). A promise
  // with no lever of its own (the fiscal rules) is the rules line above it.
  const broken = status.promises.filter((p) => !p.kept && p.promise.judgedBy !== 'fiscalRules');
  const brokenIds = new Set(broken.map((p) => p.promise.id));
  const strained = status.strains.filter((s) => s.strained && !brokenIds.has(s.promise.id));
  const brokenTags = broken.filter((p) => !named.has(p.promise.id));
  const strainedTags = strained.filter((s) => !named.has(s.promise.id));
  // One reaction already in train, read out with no rating (Phase 25): the rest is Budget day's.
  const preview = reactionPreview(
    receptions({
      outcome,
      levers,
      reception,
      typicalErrorGbpm: typicalErrorGbpm(vintage, outcome),
      outcomeOf,
      incidence,
      status,
    }),
  );

  /** The red button: the game has reached Budget day; a link shared from there opens everything. */
  const deliver = () =>
    dispatch({
      type: 'updateGame',
      patch: { reached: Math.max(game.reached, stageIndex('budget-day')) },
    });

  return (
    <JourneyLayout step="review">
      <HeadroomBar outcome={outcome} status={status} />

      <Part id="tax" title="Tax" change={{ to: '/finetune/tax', label: 'Change' }}>
        {taxRows.length === 0 ? (
          <p className="panel__hint">No tax changed from the Chancellor’s Budget.</p>
        ) : (
          <ChangeList rows={taxRows} />
        )}
      </Part>

      <Part id="spending" title="Spending" change={{ to: '/finetune/spending', label: 'Change' }}>
        {spendingRows.length === 0 ? (
          <p className="panel__hint">No budget changed from the Chancellor’s Budget.</p>
        ) : (
          <ChangeList rows={spendingRows} />
        )}
      </Part>

      <Part
        id="position"
        title="Where that leaves you"
        change={{ to: '/finetune/tax', label: 'Change' }}
      >
        <p className="review__reconcile">
          {fromTo}
          {how.length > 0 ? ` ${capitalise(how.join('; '))}.` : ''}
        </p>
        {whoPays ? <p>{whoPays}</p> : null}
        {r.taxTakeChangePp > TAX_TAKE_SAID_PP ? (
          // The tax take in words, only when it rises by more than half a point (Phase 25).
          <p className="review__taxtake">
            Taxes take {inEvery100(r.taxTakeChangePp)} more in every £100 of national income in{' '}
            {r.year}. The OBR already forecasts the tax take at a historic high.{' '}
          </p>
        ) : null}
        <p className={missed.length > 0 ? 'review__missed' : undefined}>{rulesLine}</p>
        {fiscalMissed.length === 0 && r.endGbpm < THIN_HEADROOM_GBPM ? <Yardstick /> : null}
        {signOff ? <Spoken line={signOff.line} who="The Prime Minister" tone="pm" /> : null}
        {brokenTags.length > 0 || strainedTags.length > 0 ? (
          <ul className="review__list">
            {brokenTags.map((p) => (
              <li key={p.promise.id}>
                <span className="tag tag--warn">
                  Breaks {promiseWords({ manifesto: p.promise.origin === 'manifesto-2024' }).noun}:{' '}
                  {p.promise.title}
                </span>
              </li>
            ))}
            {strainedTags.map((p) => (
              <li key={p.promise.id}>
                <span className="tag tag--amber">
                  Strains{' '}
                  {
                    promiseWords({
                      manifesto: p.promise.origin === 'manifesto-2024',
                      scored: p.promise.strains.some(
                        (rule) => rule.scored && p.strainedBy.some((b) => b.code === rule.code),
                      ),
                    }).noun
                  }
                  : {p.promise.title}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {preview ? (
          <p className="review__reaction">
            <span className="kicker">{preview.audience}</span> {preview.reason.text}
          </p>
        ) : null}
      </Part>

      <p className="actions">
        <StepLink to="/budget-day" className="btn btn--primary btn--budget" onClick={deliver}>
          Deliver my Budget
        </StepLink>
        <StepLink to="/finetune/spending" className="btn">
          Back
        </StepLink>
      </p>
    </JourneyLayout>
  );
}
