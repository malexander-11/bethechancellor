import {
  budgetTheme,
  formatGbpBn,
  MAX_PRIORITIES,
  priorityScale,
  rankedPriorities,
  stageIndex,
} from '@btc/engine';
import { useMemo } from 'react';
import { Spoken } from '../components/Conversation';
import { JourneyLayout } from '../components/JourneyLayout';
import { Term } from '../components/Term';
import { levers, options, pm } from '../data';
import { useStageGuard } from '../journey/guard';
import { StepLink } from '../journey/links';
import { useOutcomeOf } from '../journey/outcome';
import { useBudget } from '../state/budget';

const RANK = ['1st', '2nd', '3rd'];

/** Where each promise comes from (Phase 25): only the manifesto's own words are red lines. */
const PROMISE_ORIGIN: Record<'manifesto-2024' | 'budget-2025' | 'government', string> = {
  'manifesto-2024': 'Manifesto 2024',
  'budget-2025': 'Budget 2025',
  government: 'The Chancellor’s word',
};

/**
 * Step 3: set your priorities. One screen: the theme of the Budget, written by the game from the
 * ranking as it is made (what the Comms team will tell voters, and what the advisers will suggest
 * ways to deliver); the eight priorities as cards, ticked in the order they matter, the Prime
 * Minister reacting to each; the manifesto's promises one fold away. Nothing is funded here: the
 * ways to deliver each priority come next, costed one by one, and the ways to pay after that. The
 * manifesto is not up for negotiation here or anywhere: every option that crosses a promise says
 * so, and Budget day judges it. Every PM line is simulated and says so (ADR-0011). One worked-out
 * line gives the scale before anything is chosen, and a priority that saves money says so (Phase
 * 25).
 */
export function PMPage() {
  const { state, dispatch, outcome } = useBudget();
  const outcomeOf = useOutcomeOf();
  const game = state.game;
  // The scale before choosing (Phase 25): what delivering one priority in full costs, against the
  // headroom the rules leave, one price per option as on the flagship cards. Ticking a priority
  // moves no lever, so this is worked out once per Budget, not once per tick.
  const scale = useMemo(
    () => priorityScale({ pm, options, levers, outcomeOf, current: state.leverValues }),
    [outcomeOf, state.leverValues],
  );

  // No game in this link, or a link ahead of its game: the guard sends it where the road is.
  const guard = useStageGuard('pm');
  if (guard || !game) return guard;

  const ranked = rankedPriorities(game, pm);
  const theme = budgetTheme(pm, game.priorities);
  const saves = new Set(scale.saves);
  const headroom = outcome.verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm ?? 0;
  const rankOf = (id: string) => ranked.findIndex((p) => p.id === id);
  const full = ranked.length >= MAX_PRIORITIES;
  const toggle = (id: string) => {
    const next = game.priorities.includes(id)
      ? game.priorities.filter((p) => p !== id)
      : [...game.priorities, id];
    dispatch({ type: 'updateGame', patch: { priorities: next } });
  };
  const agree = () => {
    dispatch({
      type: 'updateGame',
      patch: { reached: Math.max(game.reached, stageIndex('deliver')) },
    });
  };

  return (
    <JourneyLayout step="pm">
      <section className="theme" aria-labelledby="theme-heading">
        <h2 id="theme-heading" className="section-label">
          The theme of this Budget
        </h2>
        {theme ? (
          <>
            <p className="theme__title">{theme}</p>
            <p className="theme__line">
              The Comms team will explain the Budget to voters this way. Your advisers will suggest
              ways to deliver it.
            </p>
          </>
        ) : (
          <p className="theme__line">The theme is written from what you tick.</p>
        )}
        {scale.costs ? (
          <p className="theme__scale">
            Delivering one priority in full costs from {formatGbpBn(scale.costs.minGbpm, 1)} to{' '}
            {formatGbpBn(scale.costs.maxGbpm, 1)} a year by {scale.year}. Your headroom is{' '}
            {formatGbpBn(headroom, 1, headroom < 0)}.
          </p>
        ) : null}
      </section>
      <ul className="choices choices--list" role="group" aria-label="The Budget’s priorities">
        {pm.priorities.map((p) => {
          const rank = rankOf(p.id);
          const picked = rank >= 0;
          return (
            <li key={p.id} role="none" className={`choice${picked ? ' choice--picked' : ''}`}>
              <label>
                <input
                  type="checkbox"
                  checked={picked}
                  disabled={!picked && full}
                  onChange={() => toggle(p.id)}
                />
                <span className="choice__body">
                  <span className="choice__title">
                    {picked ? <span className="tag--treasury">{RANK[rank]}</span> : null} {p.title}
                    {saves.has(p.id) ? <span className="tag tag--quiet">Saves money</span> : null}
                  </span>
                  <span className="choice__line">{p.purpose}</span>
                  <span className="choice__meta"></span>
                </span>
              </label>
              {picked ? <Spoken line={p.reaction} who="The Prime Minister" /> : null}
            </li>
          );
        })}
      </ul>
      <p className="redlines-line">
        Your government’s promises still apply, the <Term id="manifesto">manifesto</Term>’s among
        them.
      </p>
      <details className="more">
        <summary>What the promises are</summary>
        <ul className="redlines more__body" aria-label="Your government’s promises">
          {pm.promises.map((p) => (
            <li key={p.id}>
              <span className="tag--quiet">{PROMISE_ORIGIN[p.origin]}</span>{' '}
              <strong>{p.title}.</strong> {p.text}
            </li>
          ))}
        </ul>
      </details>
      <p className="actions">
        {ranked.length === 0 ? (
          <button type="button" className="btn btn--primary" disabled aria-describedby="agree-hint">
            Agree these priorities
          </button>
        ) : (
          <StepLink to="/budget/deliver" className="btn btn--primary" onClick={agree}>
            Agree these priorities
          </StepLink>
        )}
        <StepLink to="/outlook" className="btn">
          Back
        </StepLink>
        {ranked.length === 0 ? (
          <span id="agree-hint" className="actions__hint">
            Tick at least one priority.
          </span>
        ) : null}
      </p>
    </JourneyLayout>
  );
}
