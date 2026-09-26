import {
  ambitionStatus,
  blockedBy,
  formatGbpBn,
  nextNotch,
  optionOverlaps,
  type Lever,
  type SimulatedLine,
} from '@btc/engine';
import { Navigate, useLocation } from 'react-router-dom';
import { Spoken } from '../components/Conversation';
import { HeadroomBar } from '../components/HeadroomBar';
import { JourneyLayout } from '../components/JourneyLayout';
import { LabelBadge } from '../components/LabelBadge';
import { MinisterLine } from '../components/MinisterLine';
import { OptionCard } from '../components/OptionCard';
import { adviserById, levers, options, pm, rabbit } from '../data';
import { useStageGuard } from '../journey/guard';
import { useHeadroomOf } from '../journey/headroom';
import { StepLink } from '../journey/links';
import { useOptionPrices } from '../journey/prices';
import { useBudget } from '../state/budget';

/** How many little add-ons a speech can carry. */
export const MAX_ADD_ONS = 3;

interface Card {
  id: string;
  title: string;
  /** The lever settings the add-on applies. */
  values: Record<string, number>;
  /** What those levers go back to when the add-on is dropped. */
  back: Record<string, number>;
  levers: Lever[];
  /** Already moved on the desk for its own sake: not a surprise, so not on offer. */
  taken: boolean;
  line: SimulatedLine;
  who: string;
}

/**
 * Stage 6 (Phase 18, ADR-0022): suggested little add-ons. A short menu of small, costed
 * announcements, each a lever no other option moves, priced against the Budget as it stands as
 * what ticking it now would do and the headroom that would leave; one more notch on a priority
 * already delivered; or keeping the headroom and making that the announcement. Up to three can go
 * in the speech. Whatever is chosen is a lever value, so the final forecast includes it before
 * anything is said; the surprise is only in the speech. The review of the whole Budget follows.
 */
export function RabbitPage() {
  const { state, dispatch, outcome } = useBudget();
  const { search } = useLocation();
  const headroomOf = useHeadroomOf();
  const priceOf = useOptionPrices();
  const game = state.game;
  const guard = useStageGuard('rabbit');
  if (guard || !game) return guard;
  if (!game.revealed) return <Navigate to={{ pathname: '/forecast', search }} replace />;

  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const targetYear = stability?.targetYear ?? '2029-30';
  const status = ambitionStatus(game, pm, options, outcome, levers);
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const moved = new Set(outcome.leverEffects.map((e) => e.code));
  const role = (id: string) => adviserById.get(id)?.role ?? id;
  const chosen = game.rabbit;
  const isChosen = (id: string) => chosen.includes(id);
  const leversOf = (values: Record<string, number>) =>
    Object.keys(values)
      .map((code) => byCode.get(code))
      .filter((l): l is Lever => l !== undefined);
  const defaults = (values: Record<string, number>) =>
    Object.fromEntries(
      Object.keys(values).map((code) => [code, byCode.get(code)?.control.default ?? 0]),
    );
  const valueOf = (lever: Lever) => state.leverValues[lever.code] ?? lever.control.default;

  const cards: Card[] = [];
  for (const addOn of options.addOns) {
    // Moved on the desk for its own sake and not ticked here: not a surprise.
    const taken =
      !isChosen(addOn.id) && leversOf(addOn.values).some((l) => valueOf(l) !== l.control.default);
    cards.push({
      id: addOn.id,
      title: addOn.title,
      values: addOn.values,
      back: defaults(addOn.values),
      levers: leversOf(addOn.values),
      taken,
      line: addOn.line,
      who: role('political-adviser'),
    });
  }
  for (const p of status.priorities) {
    if (p.status !== 'delivered') continue;
    // One notch more on the biggest single-slider option delivering the priority.
    const on = p.options
      .filter((o) => o.state === 'on' && Object.keys(o.option.values).length === 1)
      .sort((a, b) => Math.abs(b.costGbpm) - Math.abs(a.costGbpm));
    for (const o of on) {
      const code = Object.keys(o.option.values)[0]!;
      const lever = byCode.get(code);
      const value = o.option.values[code] ?? 0;
      const notch = lever ? nextNotch(lever, value) : null;
      if (!lever || notch === null) continue;
      cards.push({
        id: `further:${p.priority.id}`,
        title: `Go further on ${p.priority.title}`,
        values: { [code]: notch },
        back: { [code]: value },
        levers: [lever],
        taken: false,
        line: rabbit.further.line,
        who: role(rabbit.further.adviser),
      });
      break;
    }
  }
  // An old link may carry an add-on the data no longer offers; only cards on the page count.
  const cardIds = new Set(cards.map((c) => c.id));
  const count = chosen.filter((id) => id !== 'keep' && cardIds.has(id)).length;
  /** Keeping the headroom puts every add-on back: the headroom that would leave. */
  const kept: Record<string, number> = { ...state.leverValues };
  for (const card of cards) if (isChosen(card.id)) Object.assign(kept, card.back);
  const keptHeadroom = headroomOf(kept);

  const putBack = (card: Card) => dispatch({ type: 'setLevers', values: card.back });
  const chooseKeep = () => {
    // Keeping the headroom is exclusive: every add-on goes back where it was.
    for (const c of cards) if (isChosen(c.id)) putBack(c);
    dispatch({ type: 'updateGame', patch: { rabbit: isChosen('keep') ? [] : ['keep'] } });
  };
  const choose = (card: Card, on: boolean) => {
    if (card.taken) return;
    if (!on) {
      if (!isChosen(card.id)) return;
      putBack(card);
      dispatch({ type: 'updateGame', patch: { rabbit: chosen.filter((id) => id !== card.id) } });
      return;
    }
    if (isChosen(card.id) || count >= MAX_ADD_ONS) return;
    dispatch({ type: 'setLevers', values: card.values });
    dispatch({
      type: 'updateGame',
      patch: { rabbit: [...chosen.filter((id) => id !== 'keep'), card.id] },
    });
  };

  return (
    <JourneyLayout step="rabbit" part={{ index: 1, total: 2, label: 'Add-ons' }}>
      <HeadroomBar outcome={outcome} game={game} status={status} />
      <Spoken line={rabbit.intro.line} who={role(rabbit.intro.adviser)} tone="adviser" />
      <p className="panel__hint">
        Up to {MAX_ADD_ONS}, each priced against your Budget in {targetYear}. {count} of{' '}
        {MAX_ADD_ONS} chosen.
      </p>
      <div className="choices choices--list" role="group" aria-label="The add-ons">
        {cards.map((card) => {
          const picked = isChosen(card.id);
          const blocked = blockedBy(card, options, levers, state.leverValues);
          return (
            <OptionCard
              key={card.id}
              id={card.id}
              name="add-on"
              title={card.title}
              state={picked ? 'on' : 'off'}
              price={priceOf(card, picked)}
              levers={card.levers}
              values={Object.fromEntries(card.levers.map((l) => [l.code, valueOf(l)]))}
              onChange={(on) => choose(card, on)}
              disabled={card.taken || (!picked && count >= MAX_ADD_ONS)}
              overlaps={optionOverlaps(card, levers, moved, options)}
              {...(blocked ? { blocked } : {})}
              line={card.line}
              who={card.who}
              {...(card.taken ? { note: 'already in your Budget' } : {})}
            >
              {card.levers
                .filter((l) => l.category !== 'tax')
                .map((l) => (
                  <MinisterLine key={l.code} lever={l} value={valueOf(l)} />
                ))}
            </OptionCard>
          );
        })}
        <div className={`choice choice--option${isChosen('keep') ? ' choice--picked' : ''}`}>
          <label>
            <input
              type="checkbox"
              name="add-on"
              value="keep"
              checked={isChosen('keep')}
              onChange={chooseKeep}
            />
            <span className="choice__body">
              <span className="choice__title">Keep the headroom</span>
              <span className="choice__meta">
                <span className="choice__figure amount amount--neutral">
                  {`Costs nothing · leaves ${formatGbpBn(keptHeadroom, 1, keptHeadroom < 0)}`}
                  <span className="sr-only">, in {targetYear}</span>
                </span>
              </span>
              <span className="choice__delivery">
                <span className="kicker">{role(rabbit.keep.adviser)}</span>{' '}
                <LabelBadge badge={rabbit.keep.line.badge} />{' '}
                {rabbit.keep.line.short ?? rabbit.keep.line.text}
              </span>
            </span>
          </label>
        </div>
      </div>
      <p className="actions">
        <StepLink to="/review" className="btn btn--primary">
          Review my Budget
        </StepLink>
        <StepLink to="/compromise" className="btn">
          Back
        </StepLink>
      </p>
    </JourneyLayout>
  );
}
