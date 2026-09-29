import {
  FINETUNE_SHOWN,
  ambitionStatus,
  basicPolicy,
  deskLevers,
  formatGbpBn,
  interventionsFor,
  itemName,
  leadPolicy,
  policyCount,
  rankedPriorities,
  setByFlagship,
  stageIndex,
  type FinetuneGroup,
  type FinetuneItem,
  type FinetunePolicy,
  type FinetuneSideId,
  type LeverEffect,
} from '@btc/engine';
import { useState, type ReactNode } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { HeadroomBar } from '../components/HeadroomBar';
import { Interventions } from '../components/Interventions';
import { JourneyLayout } from '../components/JourneyLayout';
import { LabelBadge } from '../components/LabelBadge';
import { sizeWords } from '../components/LeverControl';
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

/**
 * The head of a group: at rest, how many policies it offers; once any is chosen, how many of its
 * levers are chosen and what they do in the target year: on the tax screen what they raise (or
 * cost), on the spending screen what they cost (or save), day-to-day and investment together. In
 * basic mode a group at rest says nothing (`atRest` false, Phase 27): its count would be of
 * policies that are not on show.
 */
export function groupCount(
  group: FinetuneGroup,
  side: FinetuneSideId,
  values: Record<string, number>,
  effects: readonly LeverEffect[],
  year: string,
  atRest = true,
): string {
  const moved = group.items.filter((item) => {
    const lever = byCode.get(item.code);
    return (
      lever !== undefined && (values[item.code] ?? lever.control.default) !== lever.control.default
    );
  });
  if (moved.length === 0) {
    if (!atRest) return '';
    const count = group.items.reduce((n, item) => n + item.policies.length, 0);
    return `${count} ${count === 1 ? 'policy' : 'policies'}`;
  }
  let gbpm = 0;
  for (const item of moved) {
    const e = effects.find((x) => x.code === item.code);
    if (!e) continue;
    gbpm +=
      side === 'tax'
        ? (e.receipts[year] ?? 0)
        : (e.currentSpending[year] ?? 0) + (e.capitalSpending[year] ?? 0);
  }
  const head = `${moved.length} chosen`;
  if (Math.abs(gbpm) < UNCHANGED_BELOW_GBPM) return head;
  const amount = formatGbpBn(Math.abs(gbpm), 1);
  if (side === 'tax') return `${head} · ${gbpm > 0 ? 'raises' : 'costs'} ${amount}`;
  return `${head} · ${gbpm > 0 ? 'costs' : 'saves'} ${amount}`;
}

/**
 * Step 4 (Phase 24, ADR-0025; policies since Phase 26, ADR-0027): fine-tune tax, then spending.
 * Levers are grouped (who pays, on the tax screen; what the money is for, on the other), and each
 * offers its policies: one each way where it moves both ways, in one to three sizes, under a plain
 * title with one adviser's line and the numbers in view. The bar keeps score. A group's first few
 * levers show their usual policy, with any lever already chosen showing the policy its way; the
 * rest wait under one fold, grouped by the lever's family, and a policy chosen inside the fold
 * stays where it is until the next visit, so a card never jumps from under the pointer. A lever a
 * flagship the player chose holds is one line, with the way back to that flagship. Every policy
 * lever the game has is here (Phase 26): there is no desk behind it. That is advanced mode; basic
 * mode, a first game's, shows the screen adviser's shortlist and no folds (Phase 27, ADR-0028),
 * and anything chosen before the screen opened, in either mode, stays on show.
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
  // The Budget as it stood when the screen was opened: a lever chosen then shows the policy its
  // way among those on show, and a lever a flagship held then is a line; anything chosen inside the
  // fold stays in it until the next visit. A change of mode reads it again (Phase 27), without
  // remounting, so what was chosen in one mode is on show in the other, and a card chosen in this
  // mode never vanishes from under the pointer.
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

  const card = (item: FinetuneItem, policy: FinetunePolicy, headingLevel?: 4) => {
    const lever = byCode.get(item.code);
    if (!lever) return null;
    return (
      <PolicyCard
        key={`${item.code}:${policy.title}`}
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
      />
    );
  };
  const heldLine = (item: FinetuneItem, h: Held) => {
    const lever = byCode.get(item.code);
    const value = state.leverValues[item.code];
    const words =
      lever && lever.control.kind !== 'toggle' && value !== undefined
        ? sizeWords(lever, value)
        : undefined;
    return (
      <HeldLever key={item.code} name={itemName(item)} held={h} {...(words ? { words } : {})} />
    );
  };

  // Inside a fold, policies sit under their lever's family ("Income tax", "VAT") when there is
  // more than one, so a long fold stays scannable; the cards' titles then sit a level below.
  const foldBody = (folded: { item: FinetuneItem; policy: FinetunePolicy }[]) => {
    const families: { family: string; entries: typeof folded }[] = [];
    for (const entry of folded) {
      const family = byCode.get(entry.item.code)?.group ?? '';
      const last = families.find((f) => f.family === family);
      if (last) last.entries.push(entry);
      else families.push({ family, entries: [entry] });
    }
    if (families.length < 2) {
      return (
        <div className="more__body tune__levers">{folded.map((e) => card(e.item, e.policy))}</div>
      );
    }
    return (
      <div className="more__body tune__levers">
        {families.map(({ family, entries }) => (
          <div key={family} className="tune__family">
            <h3 className="tune__family-title">{family}</h3>
            {entries.map((e) => card(e.item, e.policy, 4))}
          </div>
        ))}
      </div>
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
              <LabelBadge badge={note.badge} /> {note.text}{' '}
              <SourceList as="span" className="briefing__sources" refs={note.sources} />
            </li>
          ))}
        </ul>
      ) : null}
      <p className="panel__hint tune__interest">{INTEREST[side]}</p>
      <ModeLine
        kind="ideas"
        every={`${policyCount(finetune, side)} ${side === 'tax' ? 'tax' : 'spending'} policies`}
      />
      {spec.groups.map((group) => {
        const id = `tune-${group.id}`;
        // On show: the usual policy of the group's first levers, and of any chosen on arrival the
        // policy its way; a lever a flagship holds, as one line. Everything else waits in the fold.
        const shown: ReactNode[] = [];
        const folded: { item: FinetuneItem; policy: FinetunePolicy }[] = [];
        group.items.forEach((item, i) => {
          const lever = byCode.get(item.code);
          if (!lever) return;
          const h = held.get(item.code);
          if (h) {
            shown.push(heldLine(item, h));
            return;
          }
          const arrivedAt = start[item.code];
          if (basic) {
            // Basic mode: what was chosen, else the adviser's pick, else a lever on the desk.
            const policy = basicPolicy(item, lever, arrivedAt, DESK.has(item.code));
            if (policy) shown.push(card(item, policy));
            return;
          }
          const lead = leadPolicy(item, lever, arrivedAt ?? lever.control.default);
          const onShow = i < FINETUNE_SHOWN || arrivedAt !== undefined;
          for (const policy of item.policies) {
            if (onShow && policy === lead) shown.push(card(item, policy));
            else folded.push({ item, policy });
          }
        });
        // A group with nothing on show is left out; the shortlist has a pick in every group, so on
        // arrival none is.
        if (shown.length === 0 && folded.length === 0) return null;
        const count = groupCount(
          group,
          side,
          state.leverValues,
          outcome.leverEffects,
          year,
          !basic,
        );
        return (
          <section key={group.id} className="who tune" aria-labelledby={id}>
            <h2 id={id} className="section-label who__title">
              {group.label}
              {count ? (
                <>
                  {' '}
                  <span className="who__count">{count}</span>
                </>
              ) : null}
            </h2>
            <div className="tune__levers">{shown}</div>
            {folded.length > 0 ? <Fold count={folded.length}>{() => foldBody(folded)}</Fold> : null}
          </section>
        );
      })}
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
 * A group's fold (Phase 26): "{n} more policies", whose cards mount only while it is open, so a
 * screen of ninety policies runs the engine for the cards on show, not for every card.
 */
function Fold({ count, children }: { count: number; children: () => ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <details className="more more--inset" open={open}>
      <summary
        onClick={(e) => {
          // React holds the fold's state, so its cards mount and unmount with it.
          e.preventDefault();
          setOpen((o) => !o);
        }}
      >
        {count} more {count === 1 ? 'policy' : 'policies'}
      </summary>
      {open ? children() : null}
    </details>
  );
}
