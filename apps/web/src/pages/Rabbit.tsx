import { ambitionStatus, formatGbpBn, nextNotch, type Lever } from '@btc/engine';
import { Navigate, useLocation } from 'react-router-dom';
import { Spoken } from '../components/Conversation';
import { BudgetSummary } from '../components/BudgetSummary';
import { JourneyLayout } from '../components/JourneyLayout';
import { LabelBadge } from '../components/LabelBadge';
import { formatLeverValue } from '../components/LeverControl';
import { adviserById, levers, pm, rabbit } from '../data';
import { Beat, Beats } from '../journey/beats';
import { useStageGuard } from '../journey/guard';
import { useHeadroomOf } from '../journey/headroom';
import { StepLink } from '../journey/links';
import { useBudget } from '../state/budget';

interface Card {
  id: string;
  title: string;
  lever?: Lever;
  value?: number;
  /** What choosing this does to headroom in the target year, £ million; nought for keeping it. */
  changeGbpm: number;
  headroomAfterGbpm: number;
  /** Already moved in the package for its own sake: not a surprise, so not on offer. */
  taken: boolean;
  line: { text: string; sources: { sourceId: string }[]; badge: 'simulated' };
  who: string;
}

/**
 * Stage 6. A short menu of prepared announcements, each already a lever in the package, each priced
 * by the engine as the headroom it would leave. Two more cards: raise a priority one notch past
 * what was agreed, or keep the headroom and make that the announcement. Whatever is chosen is a
 * lever value, so the final forecast includes it before anything is said; the surprise is only
 * in the speech.
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
  const status = ambitionStatus(game, pm, outcome, levers);
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const current = (lever: Lever) => state.leverValues[lever.code] ?? lever.control.default;
  const role = (id: string) => adviserById.get(id)?.role ?? id;
  const chosen = game.rabbit;

  /** The package without the rabbit in it: the baseline every card is priced against. */
  const bare: Record<string, number> = { ...state.leverValues };
  if (chosen) {
    const option = rabbit.options.find((o) => o.id === chosen);
    if (option) delete bare[option.code];
    if (chosen.startsWith('flagship:')) {
      const p = status.priorities.find((x) => x.flagship.id === chosen.slice('flagship:'.length));
      if (p) bare[p.flagship.target.code] = p.flagship.target.value;
    }
  }
  const bareHeadroom = chosen && chosen !== 'keep' ? headroomOf(bare) : headroom;

  const price = (lever: Lever, value: number) => {
    const after = headroomOf({ ...bare, [lever.code]: value });
    return { changeGbpm: after - bareHeadroom, headroomAfterGbpm: after };
  };

  const cards: Card[] = [];
  for (const option of rabbit.options) {
    const lever = byCode.get(option.code);
    if (!lever) continue;
    const mine = chosen === option.id;
    const taken = !mine && current(lever) !== lever.control.default;
    cards.push({
      id: option.id,
      title: option.title,
      lever,
      value: option.value,
      ...price(lever, option.value),
      taken,
      line: option.line,
      who: role('political-adviser'),
    });
  }
  for (const p of status.priorities) {
    const lever = byCode.get(p.flagship.target.code);
    if (!lever) continue;
    const funded = p.status === 'funded' || p.status === 'delayed';
    const notch = nextNotch(lever, p.flagship.target.value);
    if (!funded || notch === null) continue;
    cards.push({
      id: `flagship:${p.flagship.id}`,
      title: `Go further on ${p.flagship.title}`,
      lever,
      value: notch,
      ...price(lever, notch),
      taken: false,
      line: rabbit.strengthen.line,
      who: role(rabbit.strengthen.adviser),
    });
  }
  cards.push({
    id: 'keep',
    title: 'Keep the headroom',
    changeGbpm: 0,
    headroomAfterGbpm: bareHeadroom,
    taken: false,
    line: rabbit.keep.line,
    who: role(rabbit.keep.adviser),
  });

  const choose = (card: Card) => {
    if (card.taken) return;
    // Put back whatever the previous rabbit moved, then pull the new one out of the hat.
    if (chosen && chosen !== card.id) {
      const previous = cards.find((c) => c.id === chosen);
      if (previous?.lever) {
        const back = previous.id.startsWith('flagship:')
          ? (status.priorities.find((x) => `flagship:${x.flagship.id}` === previous.id)?.flagship
              .target.value ?? previous.lever.control.default)
          : previous.lever.control.default;
        dispatch({ type: 'setLever', code: previous.lever.code, value: back });
      }
    }
    if (card.lever && card.value !== undefined) {
      dispatch({ type: 'setLever', code: card.lever.code, value: card.value });
    }
    dispatch({ type: 'updateGame', patch: { rabbit: card.id } });
  };

  return (
    <JourneyLayout step="rabbit">
      <Beats step="rabbit">
        <Beat title="The rabbit">
          <BudgetSummary
            game={game}
            status={status}
            headroomGbpm={headroom}
            targetYear={targetYear}
          />
          <Spoken line={rabbit.intro.line} who={role(rabbit.intro.adviser)} tone="adviser" />
          <div className="choices" role="radiogroup" aria-label="The rabbit">
            {cards.map((card) => {
              const picked = chosen === card.id;
              return (
                <label
                  key={card.id}
                  className={`choice${picked ? ' choice--picked' : ''}${card.taken ? ' choice--taken' : ''}`}
                >
                  <input
                    type="radio"
                    name="rabbit"
                    value={card.id}
                    checked={picked}
                    disabled={card.taken}
                    onChange={() => choose(card)}
                  />
                  <span className="choice__body">
                    <span className="choice__title">{card.title}</span>
                    {card.lever && card.value !== undefined ? (
                      <span className="choice__line">
                        {card.lever.title} to {formatLeverValue(card.lever, card.value)} ·{' '}
                        <LabelBadge badge={card.lever.badge} />
                      </span>
                    ) : null}
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
                            headroom after:{' '}
                            {formatGbpBn(card.headroomAfterGbpm, 1, card.headroomAfterGbpm < 0)} in{' '}
                            {targetYear}
                          </span>
                        </>
                      )}
                    </span>
                    <span className="choice__delivery">
                      <span className="kicker">{card.who}</span>{' '}
                      <LabelBadge badge={card.line.badge} /> {card.line.text}
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
