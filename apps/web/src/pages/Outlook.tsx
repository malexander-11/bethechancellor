import { freshGame, type GamePermalink } from '@btc/engine';
import { useNavigate } from 'react-router-dom';
import { AdviserBriefing } from '../components/AdviserBriefing';
import { AssumptionReading, ContextRow } from '../components/AssumptionsTable';
import { JourneyLayout } from '../components/JourneyLayout';
import { LabelBadge } from '../components/LabelBadge';
import { Scenarios } from '../components/Scenarios';
import { Scorecard } from '../components/Scorecard';
import { SourceList } from '../components/SourceLink';
import { adviserById, briefingsFor, context, levers, vintage } from '../data';
import { Beat, Beats } from '../journey/beats';
import { macroCodesOf, matchScenario, scenarioCards } from '../journey/scenarios';
import { mintSeed } from '../journey/seed';
import { useWorkings } from '../journey/workings';
import { permalinkQuery, useBudget } from '../state/budget';

const CARDS = scenarioCards(context, levers, vintage);
const MACRO_CODES = macroCodesOf(context.readings);

/** The margins a Chancellor might set out to keep, £ billion; nought means whatever the rules leave. */
export const TARGETS: { bn: number; label: string; say: string }[] = [
  {
    bn: 10,
    label: '£10bn',
    say: 'Thin. Room to be ambitious now; little room for the forecast to move.',
  },
  { bn: 20, label: '£20bn', say: 'Roughly where March left you. Your advisers’ rule of thumb.' },
  {
    bn: 30,
    label: '£30bn',
    say: 'Ample. Close to the OBR’s typical forecast error, and it constrains the package.',
  },
  {
    bn: 0,
    label: 'Whatever the rules leave',
    say: 'Meet the rules and no more. Every pound of margin is a pound not spent.',
  },
];

/**
 * Stage 1. The four cards are the forecast choice; beneath them the player says how much headroom
 * they mean to keep. Both are plans, not rules: the game measures the player against them and
 * never enforces either. Confirming mints the seed for the OBR draw, which knows nothing of what
 * was chosen here.
 */
export function OutlookPage() {
  const { state, dispatch, outcome } = useBudget();
  const navigate = useNavigate();
  const targetYear =
    outcome.verdicts.find((v) => v.kind === 'currentBudget')?.targetYear ?? '2029-30';
  const lastYear = outcome.paths.years[outcome.paths.years.length - 1] ?? targetYear;
  const typicalErrorGbpm =
    (vintage.uncertainty.receiptsMeanAbsFiveYearErrorPctGdp / 100) *
    (outcome.paths.baseline.nominalGdpFy[lastYear] ?? 0);
  const selected = matchScenario(CARDS, state.leverValues, MACRO_CODES);
  const adviser = adviserById.get(context.adviser);
  const game = state.game;
  const revealed = game?.revealed ?? false;
  const targetBn = game?.headroomTargetBn ?? 20;
  const workings = useWorkings();

  const setTarget = (bn: number) => {
    if (!game) {
      // The seed is minted at the first decision here; the draw it fixes is independent of it.
      const started = { ...freshGame(mintSeed()), headroomTargetBn: bn };
      dispatch({ type: 'startGame', seed: started.seed });
      dispatch({ type: 'updateGame', patch: { headroomTargetBn: bn } });
      return;
    }
    dispatch({ type: 'updateGame', patch: { headroomTargetBn: bn } });
  };

  const confirm = () => {
    const base: GamePermalink = game ?? freshGame(mintSeed());
    const next: GamePermalink = {
      ...base,
      planning: selected ?? 'own',
      headroomTargetBn: targetBn,
      reached: Math.max(base.reached, 1),
    };
    if (!game) dispatch({ type: 'startGame', seed: next.seed });
    dispatch({ type: 'updateGame', patch: next });
    navigate({ pathname: '/pm', search: `?${permalinkQuery({ ...state, game: next })}` });
  };

  return (
    <JourneyLayout step="outlook">
      <p className="source">
        {adviser?.role ?? context.adviser} · readings as of {context.asOf} ·{' '}
        <LabelBadge badge="assumption" />
      </p>
      <Beats step="outlook">
        <Beat
          title="Your Chief Economic Adviser brings the March forecast"
          continueLabel="See what you could assume"
          foldWhenPast="The Chief Economic Adviser’s note"
        >
          {briefingsFor('assumptions').map((b) => (
            <AdviserBriefing key={b.id} briefing={b} />
          ))}
        </Beat>
        <Beat title="Choose the forecast you will budget on">
          {revealed ? (
            <p className="note" role="note">
              The OBR’s October forecast has arrived, so these are no longer yours to set. You
              planned on <strong>{planningName(game?.planning)}</strong>; the sliders now hold the
              OBR’s figures.
            </p>
          ) : null}
          <Scenarios
            cards={CARDS}
            state={state}
            selected={selected}
            summaryYear={targetYear}
            onPick={(values) => {
              if (!revealed) dispatch({ type: 'setLevers', values });
            }}
          />
          <fieldset className="targets" disabled={revealed}>
            <legend className="section-label">How much headroom do you mean to keep?</legend>
            <div className="targets__options" role="radiogroup" aria-label="Headroom target">
              {TARGETS.map((t) => (
                <label key={t.bn} className={`target${targetBn === t.bn ? ' target--picked' : ''}`}>
                  <input
                    type="radio"
                    name="headroom-target"
                    value={t.bn}
                    checked={targetBn === t.bn}
                    onChange={() => setTarget(t.bn)}
                  />
                  <span className="target__body">
                    <strong>{t.label}</strong>
                    <span>{t.say}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <aside className="note" aria-label="A rule of thumb from your advisers">
            <p>
              <span className="kicker">Chief Economic Adviser</span>{' '}
              <LabelBadge badge="simulated" />
            </p>
            <p>
              Our rule of thumb is that gilt markets get nervous below about £20bn of headroom.
              Nobody has published that number; it is a judgement. What it rests on: Budget 2025
              “more than doubled” headroom to £21.7bn and March left £23.6bn; the OBR’s typical
              five-year receipts error is about £32bn; you told the Treasury Committee we would
              “retain a buffer”; and the Bank found gilt moves this year “amplified by hedge fund
              deleveraging”. Whatever you pick, the OBR’s October forecast will not know it.
            </p>
            <SourceList
              refs={[
                { sourceId: 'hmt-budget-2025-speech' },
                { sourceId: 'obr-efo-2026-03', paragraph: '3.4' },
                { sourceId: 'hmt-tsc-budget-2026-letter' },
                { sourceId: 'boe-fsr-2026-07' },
                { sourceId: 'rf-policy-landscape-2026' },
              ]}
            />
          </aside>
          {workings ? (
            <>
              <details className="panel">
                <summary className="group__head">
                  <span className="group__line">
                    <span className="group__name">Set your own figures</span>
                    <span className="group__count">{MACRO_CODES.length}</span>
                  </span>
                  <span className="group__say">
                    The three sliders behind the cards, with the reading each one is set from.
                  </span>
                </summary>
                <div className="readings">
                  {context.readings.map((reading) => {
                    const lever = reading.leverCode
                      ? levers.find((l) => l.code === reading.leverCode)
                      : undefined;
                    if (!lever) return null;
                    return (
                      <AssumptionReading
                        key={reading.id}
                        reading={reading}
                        lever={lever}
                        value={state.leverValues[lever.code] ?? lever.control.default}
                        effect={outcome.leverEffects.find((e) => e.code === lever.code)}
                        summaryYear={targetYear}
                        onChange={(value) => {
                          if (!revealed) dispatch({ type: 'setLever', code: lever.code, value });
                        }}
                      />
                    );
                  })}
                </div>
              </details>
              <details className="panel">
                <summary className="group__head">
                  <span className="group__line">
                    <span className="group__name">Also changed since March</span>
                    <span className="group__count">
                      {context.readings.filter((r) => !r.leverCode).length}
                    </span>
                  </span>
                  <span className="group__say">No slider here: context for the numbers above.</span>
                </summary>
                <div className="table-scroll">
                  <table className="measures">
                    <thead>
                      <tr>
                        <th>Reading</th>
                        <th>OBR in March</th>
                        <th>Latest</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {context.readings
                        .filter((r) => !r.leverCode)
                        .map((r) => (
                          <ContextRow key={r.id} reading={r} />
                        ))}
                    </tbody>
                  </table>
                </div>
              </details>
              <Scorecard outcome={outcome} typicalErrorGbpm={typicalErrorGbpm} />
            </>
          ) : null}
          <p className="hero-start__actions">
            <button type="button" className="btn btn--primary" onClick={confirm}>
              Confirm, and go to Downing Street
            </button>
          </p>
        </Beat>
      </Beats>
    </JourneyLayout>
  );
}

function planningName(kind: string | undefined): string {
  const card = CARDS.find((c) => c.kind === kind);
  if (card) return card.title.charAt(0).toLowerCase() + card.title.slice(1);
  return 'figures of your own';
}
