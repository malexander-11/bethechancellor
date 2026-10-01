import {
  ambitionStatus,
  choiceName,
  decisionUnits,
  formatGbpBn,
  groupItems,
  rankedPriorities,
  setByFlagship,
  stageIndex,
  type FinetuneDecision,
  type FinetuneItem,
  type FinetuneSection,
  type FinetuneSideId,
  type LeverEffect,
} from '@btc/engine';
import { useState, type ReactNode } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { HeadroomBar } from '../components/HeadroomBar';
import { JourneyLayout } from '../components/JourneyLayout';
import {
  ChoiceCard,
  type CardContext,
  type CardRow,
  type CardUnit,
} from '../components/ChoiceCard';
import { plannedWords, sizeWords } from '../components/LeverControl';
import type { Held } from '../components/LeverRow';
import { adviserById, finetune, levers, options, pm } from '../data';
import { UNCHANGED_BELOW_GBPM } from '../journey/effects';
import { useStageGuard } from '../journey/guard';
import { chosenByLever, redLinesOf } from '../journey/levers';
import { StepLink } from '../journey/links';
import { useLeverHints } from '../journey/prices';
import { useBudget } from '../state/budget';
import { deliverPath } from './Deliver';

const byCode = new Map(levers.map((l) => [l.code, l] as const));

/** The route of one of the two screens. */
export function finetunePath(side: FinetuneSideId): string {
  return `/finetune/${side}`;
}

/**
 * Each screen's one sentence on interest (Phase 25): a card gives the lever's own figure, and the
 * headroom it would leave moves by the interest on borrowing too, said once here rather than on
 * every card.
 */
const INTEREST: Record<FinetuneSideId, string> = {
  tax: 'Headroom also moves with the interest on borrowing, so it can move more than a tax raises.',
  spending:
    'Headroom also moves with the interest on borrowing, so it can move more than a budget saves.',
};

/**
 * Where a screen says whose view a chosen row gives (Phase 25). The spending screen says it once,
 * after its lead. The tax screen's lead is the user's one sentence, so its rows name the adviser on
 * each line instead.
 */
const ADVISER_IN_LEAD: Record<FinetuneSideId, boolean> = { tax: false, spending: true };

/** The levers among these that are off where they rest. */
function movedAmong(items: readonly FinetuneItem[], values: Record<string, number>) {
  return items.filter((item) => {
    const lever = byCode.get(item.code);
    return (
      lever !== undefined && (values[item.code] ?? lever.control.default) !== lever.control.default
    );
  });
}

/**
 * What moved levers do in the target year, in words: on the tax screen what they raise (or cost),
 * on the spending screen what they cost (or save), day-to-day and investment together. Nothing
 * when it rounds to nothing.
 */
function movedMoney(
  moved: readonly FinetuneItem[],
  side: FinetuneSideId,
  effects: readonly LeverEffect[],
  year: string,
): string {
  let gbpm = 0;
  for (const item of moved) {
    const e = effects.find((x) => x.code === item.code);
    if (!e) continue;
    gbpm +=
      side === 'tax'
        ? (e.receipts[year] ?? 0)
        : (e.currentSpending[year] ?? 0) + (e.capitalSpending[year] ?? 0);
  }
  if (Math.abs(gbpm) < UNCHANGED_BELOW_GBPM) return '';
  const amount = formatGbpBn(Math.abs(gbpm), 1);
  if (side === 'tax') return `${gbpm > 0 ? 'raises' : 'costs'} ${amount}`;
  return `${gbpm > 0 ? 'costs' : 'saves'} ${amount}`;
}

/**
 * The head of a section (a tax, or what the money is for): once any of its levers is chosen, how
 * many and what they do in the target year. At rest it says nothing: its decisions say what they
 * hold (ADR-0035, ADR-0037).
 */
export function groupCount(
  items: readonly FinetuneItem[],
  side: FinetuneSideId,
  values: Record<string, number>,
  effects: readonly LeverEffect[],
  year: string,
): string {
  const moved = movedAmong(items, values);
  if (moved.length === 0) return '';
  const money = movedMoney(moved, side, effects, year);
  const head = `${moved.length} chosen`;
  return money ? `${head} · ${money}` : head;
}

/** A decision that is one lever with a scale of sizes, not ticks: the headline rate, say. */
function scaleOf(decision: FinetuneDecision) {
  const only = decision.items.length === 1 ? decision.items[0] : undefined;
  const lever = only ? byCode.get(only.code) : undefined;
  return lever && lever.control.kind !== 'toggle' ? lever : undefined;
}

/**
 * The line beside a decision's title (ADR-0035). At rest, a decision that is one scale says where
 * the lever is planned to be ("20% as planned"), any other how many choices it holds ("4
 * choices"); once moved, where the scale now stands or how many are chosen, and what that raises
 * or costs on the tax screen ("22% · raises £19.8bn", "1 chosen · raises £2.4bn"), or costs or
 * saves on the spending screen ("1 chosen · costs £2.4bn").
 */
export function decisionStatus(
  decision: FinetuneDecision,
  side: FinetuneSideId,
  values: Record<string, number>,
  effects: readonly LeverEffect[],
  year: string,
): string {
  const scale = scaleOf(decision);
  const moved = movedAmong(decision.items, values);
  if (moved.length === 0) {
    if (scale) return plannedWords(scale);
    const n = decision.items.length;
    return `${n} ${n === 1 ? 'choice' : 'choices'}`;
  }
  const money = movedMoney(moved, side, effects, year);
  const head = scale
    ? sizeWords(scale, values[scale.code] ?? scale.control.default)
    : `${moved.length} chosen`;
  return money ? `${head} · ${money}` : head;
}

/**
 * Which decisions are open when a screen opens (ADR-0035): only those holding a lever that had
 * moved by then, a flagship's among them, so everything chosen is in view and the rest is a list
 * of questions. One predicate, so "the first open" or "all open" would be one line.
 */
function opensOnArrival(decision: FinetuneDecision, start: Record<string, number>): boolean {
  return decision.items.some((item) => start[item.code] !== undefined);
}

/**
 * Step 4 (Phase 24, ADR-0025; policies since Phase 26, ADR-0027): fine-tune tax, then spending.
 * Each lever offers its policies: one each way where it moves both ways, in one to three sizes,
 * under a plain title with one adviser's line and the numbers in view. The bar keeps score.
 *
 * Both screens go section by section, the tax screen tax by tax (ADR-0035), the spending screen by
 * what the money is for (ADR-0037): each section the decisions about it, closed until opened, a
 * decision holding a lever chosen before the screen opened open from the start. Opening one shows
 * every choice in it, a lever that moves both ways as one scale of levels with the plan among
 * them, and ticks that contradict each other as one choice among radios (ADR-0036). A lever a
 * flagship the player chose holds is one line, with the way back to that flagship. Every policy
 * lever the game has is here (Phase 26): there is no desk behind it, and no shortlist in front of
 * it, in either mode (ADR-0041).
 */
export function FinetunePage() {
  const { side: param } = useParams();
  const { search } = useLocation();
  // A link with no game is sent to the briefing, measures and all, by the guard.
  const guard = useStageGuard('finetune');
  if (guard) return guard;
  if (param !== 'tax' && param !== 'spending') {
    return <Navigate to={{ pathname: finetunePath('tax'), search }} replace />;
  }
  // One screen per side, remounted on the way from one to the other, so each visit begins with a
  // fresh reading of which levers have moved.
  return <FinetuneScreen key={param} side={param} />;
}

function FinetuneScreen({ side }: { side: FinetuneSideId }) {
  const { state, dispatch, outcome } = useBudget();
  const hintOf = useLeverHints();
  // The Budget as it stood when the screen was opened: a decision holding a lever chosen then is
  // open, and a lever a flagship held then is a line.
  const [start] = useState(() => state.leverValues);
  const spec = finetune[side];
  const [held] = useState(() => {
    const status0 = state.game ? ambitionStatus(state.game, pm, options, outcome, levers) : null;
    return new Map(
      [...setByFlagship(status0, state.leverValues, levers)].map(([code, h]): [string, Held] => [
        code,
        { title: h.option.title, to: deliverPath(h.rank) },
      ]),
    );
  });
  const game = state.game;
  if (!game) return null;

  const status = ambitionStatus(game, pm, options, outcome, levers);
  const ranked = rankedPriorities(game, pm);
  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const year = stability?.targetYear ?? '2029-30';
  const moved = new Set(outcome.leverEffects.map((e) => e.code));
  const chosen = chosenByLever(status);
  const redLinesFor = redLinesOf(state.leverValues);
  const who = adviserById.get(spec.adviser)?.role ?? spec.adviser;
  const index = side === 'tax' ? 1 : 2;

  // What every card on the screen reads alike (ADR-0037).
  const named = ADVISER_IN_LEAD[side];
  const cards: CardContext = {
    summaryYear: year,
    hintOf,
    redLinesFor,
    chosen,
    moved,
    held,
    adviser: named ? undefined : who,
  };
  // Inside a decision a lever goes by its short name, every way it moves on one scale (ADR-0035).
  const rowOf = (item: FinetuneItem): CardRow => ({
    item,
    ways: item.policies,
    name: choiceName(item),
  });
  // A decision opened: one card, a row a choice, ticks that contradict each other one set of
  // radios with "As planned" first (ADR-0036), and one fold for the rest (ADR-0037).
  const decisionBody = (decision: FinetuneDecision) => (
    <ChoiceCard
      title={decision.title}
      context={cards}
      units={decisionUnits(decision).map((unit): CardUnit =>
        unit.kind === 'item'
          ? { kind: 'row', row: rowOf(unit.item) }
          : { kind: 'set', name: unit.name, rows: unit.items.map(rowOf) },
      )}
    />
  );

  /**
   * One section: a tax (ADR-0035), or what the money is for (ADR-0037): its decisions, each a
   * disclosure with a status and one card inside.
   */
  const section = (group: FinetuneSection) => {
    const id = `tune-${group.id}`;
    const items = groupItems(group);
    const count = groupCount(items, side, state.leverValues, outcome.leverEffects, year);
    const heading = (
      <h2 id={id} className="section-label who__title">
        {group.label}
        {count ? (
          <>
            {' '}
            <span className="who__count">{count}</span>
          </>
        ) : null}
      </h2>
    );
    return (
      <section key={group.id} className="who tune" aria-labelledby={id}>
        {heading}
        <div className="tune__decisions">
          {group.decisions.map((decision) => (
            <Decision
              key={decision.id}
              id={decision.id}
              title={decision.title}
              status={decisionStatus(decision, side, state.leverValues, outcome.leverEffects, year)}
              open={opensOnArrival(decision, start)}
            >
              {() => decisionBody(decision)}
            </Decision>
          ))}
        </div>
      </section>
    );
  };

  /** On to step 5: the review, and the red button. */
  const leave = () =>
    dispatch({
      type: 'updateGame',
      patch: { reached: Math.max(game.reached, stageIndex('review')) },
    });
  const onward =
    side === 'tax'
      ? { to: finetunePath('spending'), label: 'Next: spending', leave: false }
      : { to: '/review', label: 'Next: deliver the Budget', leave: true };
  const back =
    side === 'tax' ? (ranked.length > 0 ? deliverPath(ranked.length) : '/pm') : finetunePath('tax');

  return (
    <JourneyLayout
      step="finetune"
      part={{ index, total: 2, label: spec.title }}
      title={spec.title}
      // The adviser is named once, here, not on every row (Phase 25), and speaks on a row once it
      // is chosen (ADR-0037).
      lead={named ? `${spec.lead} Your ${who}’s view shows once you choose.` : spec.lead}
    >
      <HeadroomBar outcome={outcome} status={status} />
      {spec.notes.length > 0 ? (
        <ul className="tune__notes">
          {spec.notes.map((note) => (
            <li key={note.text}>{note.text}</li>
          ))}
        </ul>
      ) : null}
      <p className="panel__hint tune__interest">{INTEREST[side]}</p>
      {spec.groups.map(section)}
      <p className="actions">
        <StepLink
          to={onward.to}
          className="btn btn--primary"
          {...(onward.leave ? { onClick: leave } : {})}
        >
          {onward.label}
        </StepLink>
        <StepLink to={back} className="btn">
          Back
        </StepLink>
      </p>
    </JourneyLayout>
  );
}

/**
 * One decision (ADR-0035): its title and its status in a heading's button, and its choices,
 * mounted only while it is open, so a screen of eighty-odd policies runs the engine for the
 * decisions opened, not for every card. A button in a heading rather than a details, so a
 * screen reader can move from decision to decision by heading and hear whether each is open; the
 * focus stays on the button as it opens and closes.
 */
function Decision({
  id,
  title,
  status,
  open: openOnArrival,
  children,
}: {
  id: string;
  title: string;
  status: string;
  open: boolean;
  children: () => ReactNode;
}) {
  const [open, setOpen] = useState(openOnArrival);
  const panel = `decision-${id}`;
  return (
    <div className="tune__decision">
      <h3 className="tune__decision-head">
        <button
          type="button"
          className="tune__decision-toggle"
          aria-expanded={open}
          aria-controls={panel}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="tune__decision-title">{title}</span>{' '}
          <span className="tune__decision-status">{status}</span>
        </button>
      </h3>
      <div id={panel} className="tune__decision-body tune__levers" hidden={!open}>
        {open ? children() : null}
      </div>
    </div>
  );
}
