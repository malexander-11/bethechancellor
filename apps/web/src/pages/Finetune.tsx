import {
  ambitionStatus,
  basicPolicy,
  decisionUnits,
  deskLevers,
  formatGbpBn,
  groupItems,
  interventionsFor,
  itemName,
  policyCount,
  rankedPriorities,
  setByFlagship,
  stageIndex,
  type FinetuneDecision,
  type FinetuneItem,
  type FinetunePolicy,
  type FinetuneSection,
  type FinetuneSideId,
  type Lever,
  type LeverEffect,
} from '@btc/engine';
import { useId, useState, type ReactNode } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { HeadroomBar } from '../components/HeadroomBar';
import { Interventions } from '../components/Interventions';
import { JourneyLayout } from '../components/JourneyLayout';
import { plannedWords, sizeWords } from '../components/LeverControl';
import { ModeLine } from '../components/ModeLine';
import { HeldLever, PolicyCard, type Held } from '../components/PolicyCard';
import { SourceList } from '../components/SourceLink';
import { adviserById, context, finetune, interventions, levers, options, pm } from '../data';
import { UNCHANGED_BELOW_GBPM } from '../journey/effects';
import { useStageGuard } from '../journey/guard';
import { chosenByLever, redLinesOf } from '../journey/levers';
import { StepLink } from '../journey/links';
import { useLeverHints } from '../journey/prices';
import { useMode } from '../journey/mode';
import { isMissed } from '../journey/rules';
import { useBudget } from '../state/budget';
import { deliverPath } from './Deliver';

const byCode = new Map(levers.map((l) => [l.code, l] as const));
/** Already on the desk: basic mode shows these levers though they are no pick (Phase 27). */
const DESK = deskLevers(context);

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
 * lever the game has is here (Phase 26): there is no desk behind it. That is advanced mode; basic
 * mode, a first game's, shows the screen adviser's shortlist and no decisions (Phase 27,
 * ADR-0028), and anything chosen before the screen opened, in either mode, stays on show.
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
  const mode = useMode();
  // The Budget as it stood when the screen was opened: a decision holding a lever chosen then is
  // open, basic mode shows that lever the way it was chosen, and a lever a flagship held then is a
  // line. A change of mode reads it again (Phase 27), without remounting, so what was chosen in one
  // mode is on show in the other, and a card chosen in this mode never vanishes from under the
  // pointer.
  const [seen, setSeen] = useState(() => ({ mode, values: state.leverValues }));
  if (seen.mode !== mode) setSeen({ mode, values: state.leverValues });
  const start = seen.mode === mode ? seen.values : state.leverValues;
  const basic = mode === 'basic';
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

  const spec = finetune[side];
  const status = ambitionStatus(game, pm, options, outcome, levers);
  const ranked = rankedPriorities(game, pm);
  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const year = stability?.targetYear ?? '2029-30';
  const moved = new Set(outcome.leverEffects.map((e) => e.code));
  const chosen = chosenByLever(status);
  const redLinesFor = redLinesOf(state.leverValues);
  const who = adviserById.get(spec.adviser)?.role ?? spec.adviser;
  const index = side === 'tax' ? 1 : 2;
  // The advisers who remember (Phase 25): the most pressing line that fires, one at a time, so the
  // screen has one voice above the cards and never a chorus.
  const advice = interventionsFor(interventions, status, {
    headroomGbpm: stability?.headroomGbpm ?? 0,
    ruleMissed: outcome.verdicts.some(isMissed),
  }).slice(0, 1);

  // A lever is drawn with its ways, as one scale (ADR-0035, spending since ADR-0037); a tick that
  // contradicts others in its decision, as a radio in their set (ADR-0036). Keyed by its first way,
  // so a scale is the same card whichever way it moves.
  const card = (
    item: FinetuneItem,
    policy: FinetunePolicy,
    opts: {
      headingLevel?: 3 | 4;
      ways?: readonly FinetunePolicy[];
      set?: { name: string; codes: readonly string[] };
    } = {},
  ) => {
    const lever = byCode.get(item.code);
    if (!lever) return null;
    const { headingLevel, ways, set } = opts;
    return (
      <PolicyCard
        key={`${item.code}:${(ways?.[0] ?? policy).title}`}
        item={item}
        policy={policy}
        lever={lever}
        summaryYear={year}
        hintOf={hintOf}
        redLinesFor={redLinesFor}
        chosen={chosen.get(item.code)}
        moved={moved}
        held={held}
        {...(headingLevel ? { headingLevel } : {})}
        {...(ways ? { ways } : {})}
        {...(set ? { set } : {})}
      />
    );
  };
  const heldLine = (item: FinetuneItem, h: Held, headingLevel: 3 | 4 = 3) => {
    const lever = byCode.get(item.code);
    const value = state.leverValues[item.code];
    const words =
      lever && lever.control.kind !== 'toggle' && value !== undefined
        ? sizeWords(lever, value)
        : undefined;
    return (
      <HeldLever
        key={item.code}
        name={itemName(item)}
        held={h}
        headingLevel={headingLevel}
        {...(words ? { words } : {})}
      />
    );
  };

  // A decision opened: every choice in it, each lever one scale both ways, a flagship's lever as
  // its line, headed a level below the decision (ADR-0035); ticks that contradict each other, one
  // choice among radios, "As planned" first (ADR-0036).
  const decisionCard = (item: FinetuneItem, set?: { name: string; codes: readonly string[] }) => {
    const h = held.get(item.code);
    if (h) return heldLine(item, h, 4);
    const [first] = item.policies;
    return first
      ? card(item, first, { headingLevel: 4, ways: item.policies, ...(set ? { set } : {}) })
      : null;
  };
  const decisionBody = (decision: FinetuneDecision) =>
    decisionUnits(decision).map((unit) => {
      if (unit.kind === 'item') return decisionCard(unit.item);
      const members = unit.items.flatMap((item) => byCode.get(item.code) ?? []);
      const codes = unit.items.map((item) => item.code);
      return (
        <Choice key={`set:${codes.join('+')}`} name={unit.name} members={members}>
          {(radio) => unit.items.map((item) => decisionCard(item, { name: radio, codes }))}
        </Choice>
      );
    });

  /**
   * One section: a tax (ADR-0035), or what the money is for (ADR-0037). Advanced mode: its
   * decisions, each a disclosure with a status. Basic mode: the cards basic mode shows for its
   * levers, and nothing at all when there are none.
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
    if (basic) {
      const shown: ReactNode[] = [];
      for (const item of items) {
        const lever = byCode.get(item.code);
        if (!lever) continue;
        const h = held.get(item.code);
        if (h) {
          shown.push(heldLine(item, h));
          continue;
        }
        const policy = basicPolicy(item, lever, start[item.code], DESK.has(item.code));
        // The one way on show, as a scale from where the lever is planned to be.
        if (policy) shown.push(card(item, policy, { ways: [policy] }));
      }
      if (shown.length === 0) return null;
      return (
        <section key={group.id} className="who tune" aria-labelledby={id}>
          {heading}
          <div className="tune__levers">{shown}</div>
        </section>
      );
    }
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
      // The adviser is named once, here, not on every card (Phase 25); in basic mode, as the one
      // whose best ideas these are (Phase 27).
      lead={basic ? spec.shortlistLead : `${spec.lead} Your ${who}’s view is on each lever.`}
    >
      <HeadroomBar outcome={outcome} status={status} />
      <Interventions items={advice} />
      {spec.notes.length > 0 ? (
        <ul className="tune__notes">
          {spec.notes.map((note) => (
            <li key={note.text}>
              {note.text} <SourceList as="span" className="briefing__sources" refs={note.sources} />
            </li>
          ))}
        </ul>
      ) : null}
      <p className="panel__hint tune__interest">{INTEREST[side]}</p>
      <ModeLine
        every={`${policyCount(finetune, side)} ${side === 'tax' ? 'tax' : 'spending'} policies`}
      />
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
 * Ticks that contradict each other in one decision, drawn as one choice (ADR-0036): the set's name,
 * "As planned" first, then each tick's card with a radio in place of its box, all one group, so
 * choosing one takes the others out and the arrow keys move between them, like a tax's scale.
 * "As planned" puts every one of them back.
 */
function Choice({
  name,
  members,
  children,
}: {
  name: string;
  members: readonly Lever[];
  children: (radio: string) => ReactNode;
}) {
  const { state, dispatch } = useBudget();
  const radio = useId();
  const planned = members.every(
    (l) => (state.leverValues[l.code] ?? l.control.default) === l.control.default,
  );
  return (
    <fieldset className="tune__choice">
      <legend className="tune__choice-name">{name}</legend>
      <label className="tune__choice-planned">
        <input
          type="radio"
          name={radio}
          checked={planned}
          onChange={() =>
            dispatch({
              type: 'setLevers',
              values: Object.fromEntries(members.map((l) => [l.code, l.control.default])),
            })
          }
        />
        As planned
      </label>
      {children(radio)}
    </fieldset>
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
