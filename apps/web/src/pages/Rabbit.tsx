import {
  ambitionStatus,
  formatGbpBn,
  nextNotch,
  type Lever,
  type SimulatedLine,
} from '@btc/engine';
import { Navigate, useLocation } from 'react-router-dom';
import { Spoken } from '../components/Conversation';
import { BudgetSummary } from '../components/BudgetSummary';
import { JourneyLayout } from '../components/JourneyLayout';
import { LabelBadge } from '../components/LabelBadge';
import { adviserById, levers, options, pm, rabbit } from '../data';
import { Beat, Beats } from '../journey/beats';
import { useStageGuard } from '../journey/guard';
import { useHeadroomOf } from '../journey/headroom';
import { StepLink } from '../journey/links';
import { useBudget } from '../state/budget';

/** How many little add-ons a speech can carry. */
export const MAX_ADD_ONS = 3;

interface Card {
  id: string;
  title: string;
  /** The lever settings the add-on applies; none for keeping the headroom. */
  values?: Record<string, number>;
  /** What those levers go back to when the add-on is dropped. */
  back?: Record<string, number>;
  /** The lever whose level the card states, when it moves exactly one. */
  lever?: Lever;
  /** What choosing this does to headroom in the target year, £ million; nought for keeping it. */
  changeGbpm: number;
  headroomAfterGbpm: number;
  /** Already moved in the package for its own sake: not a surprise, so not on offer. */
  taken: boolean;
  line: SimulatedLine;
  who: string;
}

/**
 * Stage 6 (Phase 18): suggested little add-ons. A short menu of small, costed announcements, each a
 * lever setting the engine prices as the headroom it would leave; one more notch on a priority
 * already delivered; or keeping the headroom and making that the announcement. Up to three can
 * go in the speech, and each is priced against the package with none of them in it, so the
 * figures do not depend on the order they were ticked. Whatever is chosen is a lever value, so the
 * final forecast includes it before anything is said; the surprise is only in the speech.
 */
export function RabbitPage() {
  const { state, dispatch, outcome } = useBudget();
  const { search } = useLocation();
  const headroomOf = useHeadroomOf();
  const game = state.game;
  const guard = useStageGuard('rabbit');
  if (guard || !game) return guard;
  if (!game.revealed) return <Navigate to={{ pathname: '/forecast', search }} replace />;

  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const targetYear = stability?.targetYear ?? '2029-30';
  const headroom = stability?.headroomGbpm ?? 0;
  const status = ambitionStatus(game, pm, options, outcome, levers);
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const role = (id: string) => adviserById.get(id)?.role ?? id;
  const chosen = game.rabbit;
  const isChosen = (id: string) => chosen.includes(id);
  const defaults = (values: Record<string, number>) =>
    Object.fromEntries(
      Object.keys(values).map((code) => [code, byCode.get(code)?.control.default ?? 0]),
    );

  // The cards' settings first, so the package can be read without any add-on in it.
  const specs: Omit<Card, 'changeGbpm' | 'headroomAfterGbpm' | 'taken'>[] = [];
  for (const addOn of options.addOns) {
    const codes = Object.keys(addOn.values);
    specs.push({
      id: addOn.id,
      title: addOn.title,
      values: addOn.values,
      back: defaults(addOn.values),
      ...(codes.length === 1 ? { lever: byCode.get(codes[0]!) } : {}),
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
      specs.push({
        id: `further:${p.priority.id}`,
        title: `Go further on ${p.priority.title}`,
        values: { [code]: notch },
        back: { [code]: value },
        lever,
        line: rabbit.further.line,
        who: role(rabbit.further.adviser),
      });
      break;
    }
  }

  /** The package with no add-on in it: the baseline every card is priced against. */
  const bare: Record<string, number> = { ...state.leverValues };
  for (const spec of specs) {
    if (isChosen(spec.id) && spec.back) Object.assign(bare, spec.back);
  }
  const bareHeadroom = headroomOf(bare);
  const cards: Card[] = specs.map((spec) => {
    const after = headroomOf({ ...bare, ...spec.values });
    // Moved in the package for its own sake (an option chosen earlier, or the desk): not a surprise.
    const taken =
      !isChosen(spec.id) &&
      !spec.id.startsWith('further:') &&
      Object.keys(spec.values ?? {}).some(
        (code) =>
          (bare[code] ?? byCode.get(code)?.control.default ?? 0) !==
          (byCode.get(code)?.control.default ?? 0),
      );
    return { ...spec, changeGbpm: after - bareHeadroom, headroomAfterGbpm: after, taken };
  });
  cards.push({
    id: 'keep',
    title: 'Keep the headroom',
    changeGbpm: 0,
    headroomAfterGbpm: bareHeadroom,
    taken: false,
    line: rabbit.keep.line,
    who: role(rabbit.keep.adviser),
  });
  const count = chosen.filter((id) => id !== 'keep').length;

  const choose = (card: Card) => {
    if (card.taken) return;
    if (card.id === 'keep') {
      // Keeping the headroom is exclusive: every add-on goes back where it was.
      for (const c of cards)
        if (isChosen(c.id) && c.back) dispatch({ type: 'setLevers', values: c.back });
      dispatch({ type: 'updateGame', patch: { rabbit: isChosen('keep') ? [] : ['keep'] } });
      return;
    }
    if (isChosen(card.id)) {
      if (card.back) dispatch({ type: 'setLevers', values: card.back });
      dispatch({ type: 'updateGame', patch: { rabbit: chosen.filter((id) => id !== card.id) } });
      return;
    }
    if (count >= MAX_ADD_ONS) return;
    if (card.values) dispatch({ type: 'setLevers', values: card.values });
    dispatch({
      type: 'updateGame',
      patch: { rabbit: [...chosen.filter((id) => id !== 'keep'), card.id] },
    });
  };

  return (
    <JourneyLayout step="rabbit">
      <Beats step="rabbit">
        <Beat title="Suggested little add-ons">
          <BudgetSummary
            game={game}
            status={status}
            headroomGbpm={headroom}
            targetYear={targetYear}
          />
          <Spoken line={rabbit.intro.line} who={role(rabbit.intro.adviser)} tone="adviser" />
          <p className="panel__hint">
            Up to {MAX_ADD_ONS}, each priced on its own in {targetYear}. {count} of {MAX_ADD_ONS}{' '}
            chosen.
          </p>
          <div className="choices" role="group" aria-label="The add-ons">
            {cards.map((card) => {
              const picked = isChosen(card.id);
              const disabled =
                card.taken || (!picked && card.id !== 'keep' && count >= MAX_ADD_ONS);
              return (
                <label
                  key={card.id}
                  className={`choice${picked ? ' choice--picked' : ''}${card.taken ? ' choice--taken' : ''}`}
                >
                  <input
                    type="checkbox"
                    name="add-on"
                    value={card.id}
                    checked={picked}
                    disabled={disabled}
                    onChange={() => choose(card)}
                  />
                  <span className="choice__body">
                    <span className="choice__title">
                      {card.title}
                      {card.lever ? (
                        <>
                          {' '}
                          <LabelBadge badge={card.lever.badge} />
                        </>
                      ) : null}
                    </span>
                    <span className="choice__meta">
                      {card.taken ? (
                        <span className="tag--treasury">already in your Budget</span>
                      ) : (
                        <>
                          <span className="tag--treasury">
                            {card.changeGbpm === 0
                              ? 'costs nothing'
                              : `${card.changeGbpm < 0 ? 'costs' : 'raises'} ${formatGbpBn(Math.abs(card.changeGbpm), 1)}`}
                          </span>{' '}
                          <span className="source">
                            leaves{' '}
                            {formatGbpBn(card.headroomAfterGbpm, 1, card.headroomAfterGbpm < 0)}
                          </span>
                        </>
                      )}
                    </span>
                    <span className="choice__delivery">
                      <span className="kicker">{card.who}</span>{' '}
                      <LabelBadge badge={card.line.badge} /> {card.line.short ?? card.line.text}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <p className="hero-start__actions">
            <StepLink to="/budget-day" className="btn btn--primary">
              Deliver the Budget
            </StepLink>
            <StepLink to="/compromise" className="btn">
              Back to the compromises
            </StepLink>
          </p>
        </Beat>
      </Beats>
    </JourneyLayout>
  );
}
