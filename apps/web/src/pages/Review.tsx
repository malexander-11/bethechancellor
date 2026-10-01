import {
  ambitionStatus,
  budgetTheme,
  changeRows,
  formatGbpBn,
  headroomWords,
  incidenceRows,
  leverStanding,
  optionPrice,
  preBudget,
  rankedPriorities,
  reactionPreview,
  receptions,
  reconcile,
  reconcileWords,
  signOffLine,
  stageIndex,
  THIN_HEADROOM_GBPM,
  typicalErrorGbpm,
  type Lever,
  type OptionReport,
  type PriorityReport,
} from '@btc/engine';
import type { ReactNode } from 'react';
import { HeadroomBar } from '../components/HeadroomBar';
import { inTrayText, leftAsIs } from '../components/InTray';
import { JourneyLayout } from '../components/JourneyLayout';
import { ChangeList } from '../components/ChangeList';
import { promiseWords } from '../components/LeverControl';
import { Spoken } from '../components/Conversation';
import { Yardstick } from '../components/Yardstick';
import {
  context,
  finetuneName,
  incidence,
  interventions,
  levers,
  options,
  pm,
  reception,
  vintage,
} from '../data';
import { useStageGuard } from '../journey/guard';
import { StepLink } from '../journey/links';
import { useOutcomeOf } from '../journey/outcome';
import { priceWords } from '../journey/prices';
import { isMissed, missedBy } from '../journey/rules';
import { useBudget } from '../state/budget';
import { deliverPath } from './Deliver';

const byCode = new Map(levers.map((l) => [l.code, l] as const));
const RANK = ['1st', '2nd', '3rd'];
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

/**
 * The Director of Public Spending's line on a priority short of delivery (Phase 25), as an amber
 * line under the priority: its name is already above it, so the line says "It".
 */
function shortfallLine(p: PriorityReport): { text: string; badge: 'simulated' } | null {
  const when =
    p.status === 'notFunded'
      ? 'priority-unfunded'
      : p.status === 'started' || p.status === 'settledLower'
        ? 'priority-part-funded'
        : null;
  const line = when ? interventions.interventions.find((x) => x.when === when)?.line : undefined;
  if (!line) return null;
  return { text: (line.short ?? line.text).replace('{name}', 'It'), badge: line.badge };
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
  change: { to: string; label: string } | { to: string; label: string }[];
  children: ReactNode;
}) {
  const links = Array.isArray(change) ? change : [change];
  return (
    <section className="review doc" aria-labelledby={`${id}-heading`}>
      <div className="review__head">
        <h2 id={`${id}-heading`} className="section-label">
          {title}
        </h2>
        <span className="review__change">
          {links.map((link, i) => (
            <span key={link.to}>
              {i > 0 ? ' · ' : ''}
              <StepLink to={link.to}>{link.label}</StepLink>
            </span>
          ))}
        </span>
      </div>
      {children}
    </section>
  );
}

/**
 * Step 5: deliver the Budget (Phase 24, ADR-0025). The Budget as it stands, read back before it is
 * delivered: what you prioritised, the flagship policies you chose and what each costs, every tax
 * and every other budget you moved, and where that leaves you against the rules and the manifesto,
 * in words (the bar above already says the figure). Every part has a way back to the screen that
 * set it, carrying the Budget, so nothing is final until the red button. Every figure is the
 * engine's for the target year. The Prime Minister signs off in one line when something needs
 * saying, and one reaction already in train is read out with no rating (Phase 25).
 */
export function ReviewPage() {
  const { state, dispatch, outcome } = useBudget();
  const outcomeOf = useOutcomeOf();
  const game = state.game;
  const guard = useStageGuard('review');
  if (guard || !game) return guard;

  const status = ambitionStatus(game, pm, options, outcome, levers);
  const ranked = rankedPriorities(game, pm);
  const value = (lever: Lever) => state.leverValues[lever.code] ?? lever.control.default;

  // Every tax and every budget moved, except those a flagship policy already accounts for: they
  // are read back under their own names above. A lever moved against its flagship is not the
  // flagship; it reads back as the cut it is (Phase 25).
  const counts = (o: OptionReport) => o.state === 'on' || o.state === 'adjusted';
  const owned = new Set<string>(
    status.priorities.flatMap((p) =>
      p.options.filter(counts).flatMap((o) => Object.keys(o.option.values)),
    ),
  );
  const rows = changeRows({ outcome, levers, names: finetuneName, exclude: owned });
  const taxRows = rows.filter((r) => r.side === 'tax');
  const spendingRows = rows.filter((r) => r.side === 'spending');
  const missed = outcome.verdicts.filter(isMissed);
  const fiscalMissed = missed.filter((v) => v.kind !== 'welfareCap');
  const rulesLine =
    missed.length === 0
      ? 'You meet both fiscal rules.'
      : fiscalMissed.length === 0
        ? `You meet both fiscal rules, but miss ${list(missed.map(missedBy))}.`
        : `Missed on today’s estimate: ${list(missed.map(missedBy))}.`;
  // How the bar got from the estimate to here (Phase 25): the four parts sum to it exactly.
  const r = reconcile(outcome, preBudget(outcomeOf, state.leverValues, levers));
  const money = (gbpm: number) => formatGbpBn(Math.abs(gbpm), 1);
  const fromTo = headroomWords(r);
  const how = reconcileWords(r);
  const { paid, benefited } = incidenceRows(outcome, levers, incidence, r.year);
  // The bills and cliff edges on the desk that this Budget leaves as it found them (Phase 25).
  const stillOnDesk = context.inTray.filter((item) => leftAsIs(item, state.leverValues));
  const payer = paid.find((row) => row.gbpm >= 50);
  const loser = benefited.find((row) => row.gbpm <= -50);
  const whoPays = payer
    ? `Who pays most: ${lowerFirst(payer.label)}, ${money(payer.gbpm)} in ${r.year}.`
    : loser
      ? `Who loses most: ${lowerFirst(loser.label)}, ${money(loser.gbpm)} less in ${r.year}.`
      : null;
  // One price per flagship (Phase 25): what it does to the headroom, the card's own figure.
  const priceOf = (o: OptionReport) =>
    priceWords(
      optionPrice({
        outcomeOf,
        levers,
        current: state.leverValues,
        values: o.option.values,
        on: true,
      }),
      Object.keys(o.option.values),
      true,
    );
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
      pm,
      incidence,
      game,
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

      <Part id="priorities" title="Your priorities" change={{ to: '/pm', label: 'Change' }}>
        {ranked.length === 0 ? (
          <p className="panel__hint">None agreed with the Prime Minister.</p>
        ) : (
          <>
            <p className="theme__title">{budgetTheme(pm, game.priorities)}</p>
            <ol className="review__list">
              {ranked.map((p, i) => (
                <li key={p.id}>
                  <span className="review__rank">{RANK[i] ?? `${i + 1}th`}</span> {p.title}
                </li>
              ))}
            </ol>
          </>
        )}
      </Part>

      <Part
        id="deliver"
        title="Flagship policies"
        change={status.priorities.map((p) => ({
          to: deliverPath(p.rank),
          label: `Change ${p.priority.noun}`,
        }))}
      >
        {status.priorities.length === 0 ? (
          <p className="panel__hint">Nothing: no priorities were agreed.</p>
        ) : (
          <ul className="review__list">
            {status.priorities.map((p) => {
              const on = p.options.filter(counts);
              const against = p.options.filter((o) => o.state === 'against');
              const short = shortfallLine(p);
              return (
                <li key={p.priority.id}>
                  <strong>{p.priority.title}</strong>
                  {on.length > 0 || against.length > 0 ? (
                    <ul>
                      {on.map((o) => {
                        const price = priceOf(o);
                        return (
                          <li key={o.option.id}>
                            {o.option.title}
                            {o.state === 'adjusted' ? ' (settled lower)' : ''} ·{' '}
                            <span className={`amount amount--${price.tone}`}>
                              {lowerFirst(price.text)}
                            </span>
                          </li>
                        );
                      })}
                      {against.flatMap((o) =>
                        Object.keys(o.option.values).flatMap((code) => {
                          const lever = byCode.get(code);
                          if (!lever || value(lever) === lever.control.default) return [];
                          const at = leverStanding(lever, value(lever));
                          return [
                            <li key={`${o.option.id}-${code}`} className="review__against">
                              {lever.category === 'tax'
                                ? 'Works against this priority'
                                : 'Cuts against this priority'}
                              : {finetuneName(code) ?? lever.shortTitle}
                              {at ? ` · ${at}` : ''}
                            </li>,
                          ];
                        }),
                      )}
                    </ul>
                  ) : null}
                  {short ? <p className="review__short">{short.text}</p> : null}
                </li>
              );
            })}
          </ul>
        )}
      </Part>

      <Part id="tax" title="Tax" change={{ to: '/finetune/tax', label: 'Change' }}>
        {taxRows.length === 0 ? (
          <p className="panel__hint">No tax changed.</p>
        ) : (
          <ChangeList rows={taxRows} />
        )}
      </Part>

      <Part id="spending" title="Spending" change={{ to: '/finetune/spending', label: 'Change' }}>
        {spendingRows.length === 0 ? (
          <p className="panel__hint">No other budget changed.</p>
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
        {missed.length === 0 && r.endGbpm < THIN_HEADROOM_GBPM ? <Yardstick /> : null}
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
        {stillOnDesk.length > 0 ? (
          <>
            <p className="review__tray">Still on your desk:</p>
            <ul className="review__list">
              {stillOnDesk.map((item) => (
                <li key={item.id}>{inTrayText(item, outcomeOf, state.leverValues)}</li>
              ))}
            </ul>
          </>
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
