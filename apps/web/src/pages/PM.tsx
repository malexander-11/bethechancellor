import { MAX_PRIORITIES, rankedPriorities, stageIndex } from '@btc/engine';
import { Spoken } from '../components/Conversation';
import { JourneyLayout } from '../components/JourneyLayout';
import { SourceList } from '../components/SourceLink';
import { Term } from '../components/Term';
import { pm } from '../data';
import { useStageGuard } from '../journey/guard';
import { StepLink } from '../journey/links';
import { useBudget } from '../state/budget';

const RANK = ['1st', '2nd', '3rd'];

/**
 * Step 3: set your priorities. One screen: the eight priorities as cards, ticked in the order
 * they matter, the Prime Minister reacting to each; what the PM has already done and the
 * manifesto's red lines fold open beneath. Nothing is funded here: the ways to deliver each
 * priority come next, costed one by one, and the ways to pay after that. The manifesto is not up
 * for negotiation here or anywhere: every option that crosses a red line says so, and Budget day
 * judges it. Every PM line is simulated and says so (ADR-0011).
 */
export function PMPage() {
  const { state, dispatch } = useBudget();
  const game = state.game;

  // No game in this link, or a link ahead of its game: the guard sends it where the road is.
  const guard = useStageGuard('pm');
  if (guard || !game) return guard;

  const ranked = rankedPriorities(game, pm);
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
  const redLines = pm.promises.map((p) => p.title.replace(/^./, (c) => c.toLowerCase())).join(', ');

  return (
    <JourneyLayout step="pm">
      <details className="more">
        <summary>What the Prime Minister has already done</summary>
        <div className="more__body">
          {pm.opening.map((line, i) => (
            <Spoken key={i} line={line} who="The Prime Minister" />
          ))}
        </div>
      </details>
      <ul className="choices choices--list" role="group" aria-label="The Budget’s priorities">
        {pm.priorities.map((p) => {
          const rank = rankOf(p.id);
          const picked = rank >= 0;
          return (
            <li key={p.id} className={`choice${picked ? ' choice--picked' : ''}`}>
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
                  </span>
                  <span className="choice__line">{p.purpose}</span>
                  <span className="choice__meta">
                    <SourceList as="span" className="briefing__sources" refs={p.sources} />
                  </span>
                </span>
              </label>
              {picked ? <Spoken line={p.reaction} who="The Prime Minister" /> : null}
            </li>
          );
        })}
      </ul>
      <p className="redlines-line">
        The <Term id="manifesto">manifesto</Term> still applies: {redLines}. Every option that
        crosses one of these lines says so before you choose it.
      </p>
      <details className="more">
        <summary>What the red lines are</summary>
        <ul className="redlines more__body" aria-label="The manifesto red lines">
          {pm.promises.map((p) => (
            <li key={p.id}>
              <strong>{p.title}.</strong> {p.text}
              <SourceList as="span" className="briefing__sources" refs={p.sources} />
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
