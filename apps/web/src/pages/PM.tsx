import {
  ambitionStatus,
  computeOutcome,
  formatGbpBn,
  stageIndex,
  type Flagship,
  type Theme,
} from '@btc/engine';
import { useMemo } from 'react';
import { Spoken } from '../components/Conversation';
import { BudgetSummary } from '../components/BudgetSummary';
import { JourneyLayout } from '../components/JourneyLayout';
import { LabelBadge } from '../components/LabelBadge';
import { SourceList } from '../components/SourceLink';
import { levers, pm, rules, vintage } from '../data';
import { Beat, Beats } from '../journey/beats';
import { useStageGuard } from '../journey/guard';
import { StepLink } from '../journey/links';
import { IMPLEMENTATION_YEAR, useBudget } from '../state/budget';

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

const FLAGSHIPS_BY_ID = new Map(pm.flagships.map((f) => [f.id, f] as const));
const LEVERS_BY_CODE = new Map(levers.map((l) => [l.code, l] as const));

/** The flagships a set of themes puts on the table: each theme's own, then the cross-cutting ones. */
function offeredBy(themeIds: readonly string[]): Set<string> {
  const ids = new Set<string>();
  for (const t of pm.themes) {
    if (themeIds.includes(t.id)) for (const id of t.flagships) ids.add(id);
  }
  for (const id of pm.crossCutting) ids.add(id);
  return ids;
}

function FlagshipChoice({
  flagship,
  picked,
  costGbpm,
  onToggle,
}: {
  flagship: Flagship;
  picked: boolean;
  costGbpm: number;
  onToggle: () => void;
}) {
  const reaction = pm.reactions[flagship.id];
  return (
    <li className={`choice${picked ? ' choice--picked' : ''}`}>
      <label>
        <input type="checkbox" checked={picked} onChange={onToggle} />
        <span className="choice__body">
          <span className="choice__title">{flagship.title}</span>
          <span className="choice__line">{flagship.headline}</span>
          <span className="choice__meta">
            <span className="tag--treasury">
              {costGbpm >= 0 ? 'costs ' : 'raises '}
              {formatGbpBn(Math.abs(costGbpm), 1)} a year
            </span>{' '}
            <SourceList as="span" className="briefing__sources" refs={flagship.sources} />
          </span>
          <span className="choice__delivery">
            <LabelBadge badge={flagship.delivery.badge} /> {flagship.delivery.text}
          </span>
        </span>
      </label>
      {picked && reaction ? <Spoken line={reaction} who="The Prime Minister" /> : null}
    </li>
  );
}

/**
 * Step 3. Three beats: what the PM has done; what this Budget is for, ticking every theme that
 * applies; and the flagship schemes under each. A flagship is funded the moment it is ticked: its
 * lever moves in the package and the headroom in the summary strip falls at once, so the choice costs
 * what it costs while the PM is watching. The manifesto is not up for negotiation here or
 * anywhere: its red lines were explained on the first screen, the lever warns before one is
 * crossed, and Budget day judges it. Every PM line is simulated and says so.
 */
export function PMPage() {
  const { state, dispatch, outcome } = useBudget();
  const game = state.game;
  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const targetYear = stability?.targetYear ?? '2029-30';
  const headroomGbpm = stability?.headroomGbpm ?? 0;
  const costs = useMemo(
    () => new Map(pm.flagships.map((f) => [f.id, flagshipCost(f, targetYear)] as const)),
    [targetYear],
  );
  const status = useMemo(
    () => (game ? ambitionStatus(game, pm, outcome, levers) : null),
    [game, outcome],
  );

  // No game in this link, or a link ahead of its game: the guard sends it where the road is.
  const guard = useStageGuard('pm');
  if (guard || !game) return guard;

  const { themes, priorities } = game;
  const ticked = pm.themes.filter((t) => themes.includes(t.id));

  /** Move a flagship's lever to its target, or put it back where the OBR had it. */
  const fund = (flagship: Flagship, on: boolean) => {
    const lever = LEVERS_BY_CODE.get(flagship.target.code);
    dispatch({
      type: 'setLever',
      code: flagship.target.code,
      value: on ? flagship.target.value : (lever?.control.default ?? 0),
    });
  };

  const toggleTheme = (id: string) => {
    const next = themes.includes(id) ? themes.filter((t) => t !== id) : [...themes, id];
    // A theme taken off the table takes its flagships with it, and their money comes back.
    const stillOffered = offeredBy(next);
    for (const p of priorities) {
      const flagship = FLAGSHIPS_BY_ID.get(p);
      if (flagship && !stillOffered.has(p)) fund(flagship, false);
    }
    dispatch({
      type: 'updateGame',
      patch: { themes: next, priorities: priorities.filter((p) => stillOffered.has(p)) },
    });
  };

  const toggleFlagship = (flagship: Flagship) => {
    const on = !priorities.includes(flagship.id);
    fund(flagship, on);
    dispatch({
      type: 'updateGame',
      patch: {
        priorities: on ? [...priorities, flagship.id] : priorities.filter((p) => p !== flagship.id),
      },
    });
  };

  const agree = () => {
    dispatch({
      type: 'updateGame',
      patch: { reached: Math.max(game.reached, stageIndex('taxes')) },
    });
  };

  // Each flagship is listed once, under the first ticked theme that offers it.
  const seen = new Set<string>();
  const take = (ids: readonly string[]): Flagship[] =>
    ids
      .filter((id) => (seen.has(id) ? false : (seen.add(id), true)))
      .map((id) => FLAGSHIPS_BY_ID.get(id))
      .filter((f): f is Flagship => f !== undefined);
  const groups: { theme: Theme; flagships: Flagship[] }[] = ticked
    .map((theme) => ({ theme, flagships: take(theme.flagships) }))
    .filter((g) => g.flagships.length > 0);
  const crossCutting = take(pm.crossCutting);

  const list = (flagships: Flagship[]) => (
    <ul className="choices choices--list">
      {flagships.map((f) => (
        <FlagshipChoice
          key={f.id}
          flagship={f}
          picked={priorities.includes(f.id)}
          costGbpm={costs.get(f.id) ?? 0}
          onToggle={() => toggleFlagship(f)}
        />
      ))}
    </ul>
  );

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
          continueLabel="Choose the flagships"
          continueDisabled={themes.length === 0}
          continueHint="Tick at least one theme."
        >
          <h2 className="section-label">What is this Budget for? Tick all that apply.</h2>
          <div className="choices" role="group" aria-label="The Budget’s themes">
            {pm.themes.map((t) => {
              const picked = themes.includes(t.id);
              return (
                <label key={t.id} className={`choice${picked ? ' choice--picked' : ''}`}>
                  <input type="checkbox" checked={picked} onChange={() => toggleTheme(t.id)} />
                  <span className="choice__body">
                    <span className="choice__title">{t.title}</span>
                    <span className="choice__line">{t.purpose}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {ticked.map((t) => (
            <Spoken key={t.id} line={t.pitch} who="The Prime Minister" />
          ))}
        </Beat>
        <Beat title="Your flagship schemes">
          {status ? (
            <BudgetSummary
              game={game}
              status={status}
              headroomGbpm={headroomGbpm}
              targetYear={targetYear}
            />
          ) : null}
          <p className="panel__hint">
            Each flagship you tick is funded on the spot: its lever moves in the package and the
            headroom above falls. Un-tick it and the money comes back. Costs are the engine’s, in{' '}
            {targetYear}.
          </p>
          {groups.map(({ theme, flagships }) => (
            <fieldset key={theme.id} className="flagships">
              <legend className="section-label">{theme.title}</legend>
              {list(flagships)}
            </fieldset>
          ))}
          {crossCutting.length > 0 ? (
            <fieldset className="flagships">
              <legend className="section-label">Whichever theme you pick</legend>
              {list(crossCutting)}
            </fieldset>
          ) : null}
          <p className="panel__hint">
            The manifesto red lines from step 1 still apply. Each lever will warn you before you
            cross one.
          </p>
          <p className="hero-start__actions">
            <StepLink to="/budget/taxes" className="btn btn--primary" onClick={agree}>
              Agreed. Build the package
            </StepLink>
          </p>
        </Beat>
      </Beats>
    </JourneyLayout>
  );
}
