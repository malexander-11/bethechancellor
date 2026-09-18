import { computeOutcome, formatGbpBn, type Flagship, type Promise_ } from '@btc/engine';
import { useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spoken } from '../components/Conversation';
import { JourneyLayout } from '../components/JourneyLayout';
import { LabelBadge } from '../components/LabelBadge';
import { SourceLink } from '../components/SourceLink';
import { levers, pm, rules, vintage } from '../data';
import { Beat, Beats } from '../journey/beats';
import { StepLink } from '../journey/links';
import { IMPLEMENTATION_YEAR, useBudget } from '../state/budget';

const MAX_PRIORITIES = 3;
const MIN_PRIORITIES = 2;
const MAX_PUSHBACKS = 2;

/** What one flagship would do to borrowing in the target year, on its own, £ million. */
function flagshipCost(flagship: Flagship, targetYear: string): number {
  const o = computeOutcome({
    vintage,
    rules,
    levers,
    settings: {
      leverValues: { [flagship.target.code]: flagship.target.value },
      implementationYear: IMPLEMENTATION_YEAR,
    },
  });
  const e = o.leverEffects.find((x) => x.code === flagship.target.code);
  if (!e) return 0;
  return (
    (e.currentSpending[targetYear] ?? 0) +
    (e.capitalSpending[targetYear] ?? 0) -
    (e.receipts[targetYear] ?? 0)
  );
}

/**
 * Stage 2. A conversation in four beats: what the PM has done, what this Budget is for, which two
 * or three things it must deliver, and which promises must survive. Every PM line is simulated and
 * says so; every commitment it names carries its source. The choices are stored on the game and
 * shape everything after.
 */
export function PMPage() {
  const { state, dispatch, outcome } = useBudget();
  const { search } = useLocation();
  const game = state.game;
  const [pushedBack, setPushedBack] = useState<string[]>([]);
  const targetYear =
    outcome.verdicts.find((v) => v.kind === 'currentBudget')?.targetYear ?? '2029-30';

  const theme = pm.themes.find((t) => t.id === game?.theme);
  const offered = useMemo(() => {
    const ids = [...(theme?.flagships ?? []), ...pm.crossCutting];
    const seen = new Set<string>();
    return ids
      .filter((id) => (seen.has(id) ? false : (seen.add(id), true)))
      .map((id) => pm.flagships.find((f) => f.id === id))
      .filter((f): f is Flagship => f !== undefined);
  }, [theme]);
  const costs = useMemo(
    () => new Map(offered.map((f) => [f.id, flagshipCost(f, targetYear)] as const)),
    [offered, targetYear],
  );

  if (!game) {
    // No game in this link: the conversation has nothing to talk about. Start at the outlook.
    return <Navigate to={{ pathname: '/outlook', search }} replace />;
  }

  const priorities = game.priorities;
  const protectedIds = new Set(
    game.protectedPromises.length > 0 ? game.protectedPromises : pm.promises.map((p) => p.id),
  );

  const chooseTheme = (id: string) => {
    // A new theme empties the priorities that belonged to the old one.
    dispatch({ type: 'updateGame', patch: { theme: id, priorities: [] } });
  };

  const togglePriority = (id: string) => {
    const next = priorities.includes(id)
      ? priorities.filter((p) => p !== id)
      : priorities.length < MAX_PRIORITIES
        ? [...priorities, id]
        : priorities;
    dispatch({ type: 'updateGame', patch: { priorities: next } });
  };

  const ensurePromises = () => {
    if (game.protectedPromises.length === 0) {
      dispatch({ type: 'updateGame', patch: { protectedPromises: pm.promises.map((p) => p.id) } });
    }
  };

  const pushBack = (promise: Promise_) => {
    if (pushedBack.length >= MAX_PUSHBACKS || pushedBack.includes(promise.id)) return;
    setPushedBack([...pushedBack, promise.id]);
  };

  const accept = (promise: Promise_) => {
    const concession = promise.pushBack?.concession;
    if (!concession) return;
    const kept = [...protectedIds].filter((id) => id !== promise.id);
    if (!kept.includes(concession.id)) kept.push(concession.id);
    dispatch({
      type: 'updateGame',
      patch: {
        protectedPromises: kept,
        concessions: game.concessions.includes(concession.id)
          ? game.concessions
          : [...game.concessions, concession.id],
      },
    });
  };

  const agree = () => {
    dispatch({ type: 'updateGame', patch: { reached: Math.max(game.reached, 2) } });
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
          title="What kind of Budget this is"
          continueLabel="Choose the priorities"
          continueDisabled={!theme}
          continueHint="Pick a theme to go on."
        >
          <h2 className="section-label">What is this Budget for?</h2>
          <div className="choices" role="radiogroup" aria-label="The Budget’s theme">
            {pm.themes.map((t) => (
              <label key={t.id} className={`choice${theme?.id === t.id ? ' choice--picked' : ''}`}>
                <input
                  type="radio"
                  name="theme"
                  value={t.id}
                  checked={theme?.id === t.id}
                  onChange={() => chooseTheme(t.id)}
                />
                <span className="choice__body">
                  <span className="choice__title">{t.title}</span>
                  <span className="choice__line">{t.purpose}</span>
                </span>
              </label>
            ))}
          </div>
          {theme ? <Spoken line={theme.pitch} who="The Prime Minister" /> : null}
        </Beat>
        <Beat
          title="The Budget’s priorities"
          continueLabel="Now the promises"
          continueDisabled={priorities.length < MIN_PRIORITIES}
          continueHint={`Choose ${MIN_PRIORITIES} or ${MAX_PRIORITIES} priorities to go on.`}
        >
          <h2 className="section-label">
            Which two or three things must this Budget deliver?{' '}
            <span className="group__count">
              {priorities.length}/{MAX_PRIORITIES}
            </span>
          </h2>
          <p className="panel__hint">
            Choosing one does not fund it. You do that on the desk, and the gap between promised and
            funded is what the rest of the Budget turns on. Costs are the engine’s, in {targetYear}.
          </p>
          <ul className="choices choices--list">
            {offered.map((f) => {
              const picked = priorities.includes(f.id);
              const disabled = !picked && priorities.length >= MAX_PRIORITIES;
              const cost = costs.get(f.id) ?? 0;
              return (
                <li key={f.id} className={`choice${picked ? ' choice--picked' : ''}`}>
                  <label>
                    <input
                      type="checkbox"
                      checked={picked}
                      disabled={disabled}
                      onChange={() => togglePriority(f.id)}
                    />
                    <span className="choice__body">
                      <span className="choice__title">{f.title}</span>
                      <span className="choice__line">{f.headline}</span>
                      <span className="choice__meta">
                        <span className="tag--treasury">
                          {cost >= 0 ? 'costs ' : 'raises '}
                          {formatGbpBn(Math.abs(cost), 1)} a year
                        </span>{' '}
                        {f.sources.map((s, i) => (
                          <SourceLink key={i} ref={s} />
                        ))}
                      </span>
                      <span className="choice__delivery">
                        <LabelBadge badge={f.delivery.badge} /> {f.delivery.text}
                      </span>
                    </span>
                  </label>
                  {picked && pm.reactions[f.id] ? (
                    <Spoken line={pm.reactions[f.id]!} who="The Prime Minister" />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Beat>
        <Beat title="The promises that must survive">
          <h2 className="section-label">What the Prime Minister asks you to protect</h2>
          <p className="panel__hint">
            You may push back on up to {MAX_PUSHBACKS}. The PM will refuse, or concede on terms.
          </p>
          <ul className="promises">
            {pm.promises.map((p) => {
              const asked = protectedIds.has(p.id);
              const replied = pushedBack.includes(p.id);
              const concession = p.pushBack?.concession;
              const conceded = concession ? protectedIds.has(concession.id) : false;
              return (
                <li key={p.id} className={`promise${asked ? '' : ' promise--released'}`}>
                  <p className="promise__title">
                    <strong>{asked ? p.title : `${p.title} — released`}</strong>
                    {conceded && concession ? (
                      <span className="tag--treasury">now: {concession.title}</span>
                    ) : null}
                  </p>
                  <p className="promise__text">
                    {conceded && concession ? concession.text : p.text}
                  </p>
                  <p className="spoken__sources">
                    {(conceded && concession ? concession.sources : p.sources).map((s, i) => (
                      <SourceLink key={i} ref={s} />
                    ))}
                  </p>
                  {p.pushBack && asked && !replied && pushedBack.length < MAX_PUSHBACKS ? (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        ensurePromises();
                        pushBack(p);
                      }}
                    >
                      Push back: “{p.pushBack.ask}”
                    </button>
                  ) : null}
                  {p.pushBack && replied ? (
                    <>
                      <p className="promise__you">
                        <span className="kicker">You</span> “{p.pushBack.ask}”
                      </p>
                      <Spoken line={p.pushBack.reply} who="The Prime Minister" />
                      {concession && !conceded ? (
                        <button
                          type="button"
                          className="btn btn--primary"
                          onClick={() => accept(p)}
                        >
                          Accept the terms: {concession.title}
                        </button>
                      ) : null}
                      {!concession ? <p className="promise__refused">The promise stands.</p> : null}
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <p className="hero-start__actions">
            <StepLink
              to="/budget/taxes"
              className="btn btn--primary"
              onClick={() => {
                ensurePromises();
                agree();
              }}
            >
              Agreed. To the desk
            </StepLink>
          </p>
        </Beat>
      </Beats>
    </JourneyLayout>
  );
}
