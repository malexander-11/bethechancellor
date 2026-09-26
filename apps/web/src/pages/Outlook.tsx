import { formatGbpBn, freshGame, type ContextReading, type GamePermalink } from '@btc/engine';
import { useNavigate } from 'react-router-dom';
import { AssumptionReading, ContextRow, summariseReading } from '../components/AssumptionsTable';
import { JourneyLayout } from '../components/JourneyLayout';
import { LabelBadge } from '../components/LabelBadge';
import { Papers } from '../components/Motifs';
import { Scenarios } from '../components/Scenarios';
import { SourceList } from '../components/SourceLink';
import { TableScroll } from '../components/TableScroll';
import { Term } from '../components/Term';
import { context, levers, vintage } from '../data';
import { StepLink } from '../journey/links';
import { macroCodesOf, matchScenario, scenarioCards } from '../journey/scenarios';
import { mintSeed } from '../journey/seed';
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

const reading = (id: string): ContextReading | undefined =>
  context.readings.find((r) => r.id === id);

/**
 * Step 2: your starting position. The Treasury's briefing in three numbers, then the two choices
 * that shape everything after: which forecast to plan on (four cards, each showing the headroom it
 * leaves) and how much headroom to keep. Both are plans, not rules: the game measures the player
 * against them and never enforces either. Confirming mints the seed for the OBR draw, which knows
 * nothing of what was chosen here. The tables and the sliders behind the cards open in place.
 */
export function OutlookPage() {
  const { state, dispatch, outcome } = useBudget();
  const navigate = useNavigate();
  const targetYear =
    outcome.verdicts.find((v) => v.kind === 'currentBudget')?.targetYear ?? '2029-30';
  const selected = matchScenario(CARDS, state.leverValues, MACRO_CODES);
  const game = state.game;
  const revealed = game?.revealed ?? false;
  const targetBn = game?.headroomTargetBn ?? 20;
  const headroom = vintage.context?.headroomAtPublicationGbpm ?? 0;
  const gilts = reading('gilt-10y');
  const borrowing = reading('psnb-ytd');

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
      <section className="brief doc" aria-labelledby="brief-heading">
        <h2 id="brief-heading" className="brief__title">
          <Papers /> The Treasury’s briefing
        </h2>
        <dl className="brief__facts">
          <div className="brief__fact">
            <dt>Room to spend</dt>
            <dd>
              <strong>{formatGbpBn(headroom, 1)}</strong>
              <span>
                of <Term id="headroom">headroom</Term> on the OBR’s March forecast: the margin the{' '}
                <Term id="fiscal-rules">fiscal rules</Term> leave you.
              </span>
            </dd>
          </div>
          {gilts ? (
            <div className="brief__fact">
              <dt>Borrowing costs</dt>
              <dd>
                <strong>{summariseReading(gilts.latest, gilts.unit)}</strong>
                <span>
                  on ten-year <Term id="gilts">gilts</Term> now, against the{' '}
                  {summariseReading(gilts.obr, gilts.unit)} the OBR assumed. Dearer money eats
                  headroom.
                </span>
              </dd>
            </div>
          ) : null}
          {borrowing ? (
            <div className="brief__fact">
              <dt>Borrowed so far this year</dt>
              <dd>
                <strong>{summariseReading(borrowing.latest, borrowing.unit)}</strong>
                <span>
                  April to August, against the {summariseReading(borrowing.obr, borrowing.unit)} the
                  OBR pencilled in.
                </span>
              </dd>
            </div>
          ) : null}
        </dl>
        <SourceList
          className="briefing__sources"
          refs={[
            ...(gilts ? [gilts.latest.source, gilts.obr.source] : []),
            ...(borrowing ? [borrowing.latest.source] : []),
          ]}
        />
      </section>

      <h2 className="section-label section-label--spaced">Which forecast will you plan on?</h2>
      {revealed ? (
        <p className="note" role="note">
          The OBR’s October forecast has arrived, so these are no longer yours to set. You planned
          on <strong>{planningName(game?.planning)}</strong>; the sliders now hold the OBR’s
          figures.
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
        <legend className="section-label">How much headroom do you want to keep?</legend>
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
      <details className="more">
        <summary>Why about £20bn?</summary>
        <aside className="note more__body" aria-label="A rule of thumb from your advisers">
          <p>
            <span className="kicker">Chief Economic Adviser</span> <LabelBadge badge="simulated" />
          </p>
          <p>
            Our rule of thumb: gilt markets get nervous below about £20bn of headroom. Nobody has
            published that number; it is a judgement resting on published facts. Budget 2025 “more
            than doubled” headroom to £21.7bn; the OBR’s typical five-year forecast error is about
            £32bn; you told the Treasury Committee we would “retain a buffer”; the Resolution
            Foundation put headroom near £10bn in July; and the Bank found this year’s gilt moves
            “amplified by hedge fund deleveraging”. Whatever you pick, the OBR’s October forecast
            will not know it.
          </p>
          <SourceList
            refs={[
              { sourceId: 'hmt-budget-2025-speech' },
              { sourceId: 'obr-efo-2026-03', paragraph: '3.4' },
              { sourceId: 'hmt-tsc-budget-2026-letter' },
              { sourceId: 'rf-headroom-2026-07-21' },
              { sourceId: 'boe-fsr-2026-07' },
              { sourceId: 'rf-policy-landscape-2026' },
            ]}
          />
        </aside>
      </details>

      <details className="more">
        <summary>See the numbers</summary>
        <div className="more__body">
          {context.decisionsSinceForecast.length > 0 ? (
            <section className="panel" aria-labelledby="since-heading">
              <h3 id="since-heading" className="section-label">
                Decided since March
              </h3>
              <TableScroll label="Decisions since March">
                <table className="measures">
                  <caption>
                    On the government’s own figures, not yet certified by the OBR. Each was paid for
                    by moving money; none used March’s headroom.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Decision</th>
                      <th scope="col">Cost</th>
                      <th scope="col">Paid for by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {context.decisionsSinceForecast.map((d) => (
                      <tr key={d.id}>
                        <th scope="row">{d.title}</th>
                        <td className="amount">
                          {formatGbpBn(Math.abs(d.amountGbpm), 1)}
                          <span className="source"> {d.year}</span>
                        </td>
                        <td>
                          {d.paidFor} <SourceList as="span" refs={d.sources} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            </section>
          ) : null}
          <section className="panel" aria-labelledby="also-heading">
            <h3 id="also-heading" className="section-label">
              Also changed since March
            </h3>
            <TableScroll label="Also changed since March">
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
            </TableScroll>
          </section>
          <section className="panel" aria-labelledby="own-heading">
            <h3 id="own-heading" className="section-label">
              Set your own figures
            </h3>
            <p className="panel__hint">
              The three sliders behind the cards, with the reading each one is set from.
            </p>
            <div className="readings">
              {context.readings.map((r) => {
                const lever = r.leverCode ? levers.find((l) => l.code === r.leverCode) : undefined;
                if (!lever) return null;
                return (
                  <AssumptionReading
                    key={r.id}
                    reading={r}
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
          </section>
        </div>
      </details>

      <p className="actions">
        <button type="button" className="btn btn--primary" onClick={confirm}>
          Set my starting position
        </button>
        <StepLink to="/" className="btn">
          Back
        </StepLink>
      </p>
    </JourneyLayout>
  );
}

function planningName(kind: string | undefined): string {
  const card = CARDS.find((c) => c.kind === kind);
  if (card) return card.title.charAt(0).toLowerCase() + card.title.slice(1);
  return 'figures of your own';
}
