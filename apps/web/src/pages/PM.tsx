import { MAX_PRIORITIES, rankedPriorities, stageIndex } from '@btc/engine';
import { Spoken } from '../components/Conversation';
import { JourneyLayout } from '../components/JourneyLayout';
import { SourceList } from '../components/SourceLink';
import { pm } from '../data';
import { Beat, Beats } from '../journey/beats';
import { useStageGuard } from '../journey/guard';
import { StepLink } from '../journey/links';
import { useBudget } from '../state/budget';

const RANK = ['1st', '2nd', '3rd'];

/**
 * Step 3 (Phase 18, ADR-0022). Three beats: what the PM has done; what this Budget is for, ranking
 * up to three priorities; and the PM reading them back. Nothing is funded here: the ways to
 * deliver each priority come next, costed one by one, and the ways to pay after that. The
 * manifesto is not up for negotiation here or anywhere: its red lines were explained on the first
 * screen, every option that crosses one says so, and Budget day judges it. Every PM line is
 * simulated and says so.
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

  return (
    <JourneyLayout step="pm">
      <Beats step="pm">
        <Beat
          title="What the Prime Minister has already done"
          continueLabel="Talk about the Budget"
        >
          {pm.opening.map((line, i) => (
            <Spoken key={i} line={line} who="The Prime Minister" />
          ))}
        </Beat>
        <Beat
          title="What is this Budget for?"
          continueLabel="Hear the PM read it back"
          continueDisabled={ranked.length === 0}
          continueHint="Rank at least one priority."
        >
          <h2 className="section-label">What is this Budget for? Rank up to three.</h2>
          <p className="panel__hint">
            The order you tick them in is the order they matter. Nothing is funded yet: the ways to
            deliver each come next, costed one by one.
          </p>
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
                        {picked ? <span className="tag--treasury">{RANK[rank]}</span> : null}{' '}
                        {p.title}
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
        </Beat>
        <Beat title="What the Prime Minister expects">
          <ol className="ranked">
            {ranked.map((p, i) => (
              <li key={p.id}>
                <strong>{RANK[i]}</strong> · {p.title}
                <Spoken line={p.pitch} who="The Prime Minister" />
              </li>
            ))}
          </ol>
          <p className="panel__hint">
            The manifesto red lines from step 1 still apply:{' '}
            {pm.promises.map((p) => p.title.replace(/^./, (c) => c.toLowerCase())).join(', ')}.
            Every option that crosses one says so before you choose it.
          </p>
          <p className="hero-start__actions">
            <StepLink to="/budget/deliver" className="btn btn--primary" onClick={agree}>
              Agreed. To the options
            </StepLink>
          </p>
        </Beat>
      </Beats>
    </JourneyLayout>
  );
}
