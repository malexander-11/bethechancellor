import { ambitionStatus, cardMeasures, smallPrint, stageIndex } from '@btc/engine';
import { Navigate, useParams } from 'react-router-dom';
import { Welcome } from '../components/Welcome';
import { HeadroomBar } from '../components/HeadroomBar';
import { JourneyLayout } from '../components/JourneyLayout';
import { MeasureCard, SmallPrintRow, useVoting, votingLine } from '../components/MeasureCard';
import { budget, levers, pm } from '../data';
import { useBalance } from '../journey/balance';
import { useStageGuard } from '../journey/guard';
import { StepLink } from '../journey/links';
import { measuresPath, SMALL_PRINT, WALK } from '../journey/routes';
import { useBudget } from '../state/budget';

/** The walk's own words (ADR-0046): what is not the Budget file's. */
export const MEASURES_TEXT = {
  how: 'Agree or disagree with each one. Disagreeing takes it out of your Budget.',
  next: 'Next: {title}',
  smallTitle: 'The rest of the Budget',
  smallLead:
    'These were in the Budget too. None of them changes the money you have to play with. Each is small, over before April 2027, or already under way.',
  smallHow: 'Tick the ones you agree with, and cross the ones you don’t.',
  toBalance: 'Next: balance your Budget',
  back: 'Back',
} as const;

/** A page's title, for the button that leads to it. */
function titleOf(page: string): string {
  if (page === SMALL_PRINT) return MEASURES_TEXT.smallTitle.toLowerCase();
  return budget.themes.find((t) => t.id === page)?.title.toLowerCase() ?? '';
}

/**
 * Step 1: the Chancellor's measures (ADR-0046). The walk goes theme by theme, a few cards a page,
 * each card one of the Chancellor's decisions to agree or disagree with; then the small print, the
 * measures no lever moves, to tick or cross. The bar keeps the money: what disagreeing has saved
 * less what it has given up, against the Chancellor's headroom. The last page leads to the balance.
 */
export function MeasuresPage() {
  const { page = '' } = useParams();
  const { query } = useBudget();
  const guard = useStageGuard('measures');
  if (guard) return guard;
  if (!WALK.includes(page)) {
    return (
      <Navigate
        to={{ pathname: measuresPath(WALK[0] ?? SMALL_PRINT), search: query ? `?${query}` : '' }}
        replace
      />
    );
  }
  // A page of its own, so each card's answer is read afresh from the Budget and this browser.
  return <MeasuresScreen key={page} page={page} />;
}

function MeasuresScreen({ page }: { page: string }) {
  const { state, dispatch, outcome } = useBudget();
  const balance = useBalance();
  const voting = useVoting();
  const index = WALK.indexOf(page);
  const theme = budget.themes.find((t) => t.id === page);
  const year = outcome.verdicts.find((v) => v.kind === 'currentBudget')?.targetYear ?? '';
  const status = ambitionStatus(pm, outcome, levers);
  const next = WALK[index + 1];
  const before = WALK[index - 1];
  const part = {
    index: index + 1,
    total: WALK.length,
    label: theme?.title ?? MEASURES_TEXT.smallTitle,
  };
  const said = votingLine(voting);

  /** Leaving the small print opens the balance: the walk is done. */
  const leave = () => {
    const game = state.game;
    if (!game) return;
    dispatch({
      type: 'updateGame',
      patch: { reached: Math.max(game.reached, stageIndex('balance')) },
    });
  };

  return (
    <JourneyLayout
      step="measures"
      part={part}
      title={theme?.title ?? MEASURES_TEXT.smallTitle}
      lead={theme?.lead ?? MEASURES_TEXT.smallLead}
    >
      {index === 0 ? <Welcome /> : null}
      <HeadroomBar outcome={outcome} status={status} balance={balance} />
      <p className="panel__hint">{theme ? MEASURES_TEXT.how : MEASURES_TEXT.smallHow}</p>
      {said ? <p className="panel__hint walk__voting">{said}</p> : null}

      {theme ? (
        <ul className="mcards">
          {theme.cards.map((card) => (
            <MeasureCard
              key={card.lever}
              card={card}
              measures={cardMeasures(budget, card)}
              year={year}
              voting={voting}
            />
          ))}
        </ul>
      ) : (
        <ul className="small">
          {smallPrint(budget).map((m) => (
            <SmallPrintRow key={m.id} measure={m} voting={voting} />
          ))}
        </ul>
      )}

      <p className="actions">
        {next ? (
          <StepLink to={measuresPath(next)} className="btn btn--primary">
            {MEASURES_TEXT.next.replace('{title}', titleOf(next))}
          </StepLink>
        ) : (
          <StepLink to="/balance" className="btn btn--primary" onClick={leave}>
            {MEASURES_TEXT.toBalance}
          </StepLink>
        )}
        {before ? (
          <StepLink to={measuresPath(before)} className="btn">
            {MEASURES_TEXT.back}
          </StepLink>
        ) : null}
      </p>
    </JourneyLayout>
  );
}
