import {
  ambitionStatus,
  balanceHolds,
  balanceState,
  cardOf,
  changeRows,
  formatGbpBn,
  optionBack,
  optionNext,
  optionSteps,
  stageIndex,
  BALANCE_SETTLED_GBPM,
  type BalanceOption,
} from '@btc/engine';
import { HeadroomBar } from '../components/HeadroomBar';
import { JourneyLayout } from '../components/JourneyLayout';
import { balance as menus, budget, levers, pm } from '../data';
import { useBalance, useMoneyOf } from '../journey/balance';
import { useStageGuard } from '../journey/guard';
import { StepLink } from '../journey/links';
import { measuresPath, SMALL_PRINT } from '../journey/routes';
import { useBudget } from '../state/budget';

/** The balance page's own words (ADR-0046). */
export const BALANCE_TEXT = {
  short: 'You gave up {money} more than you saved. Find it before you deliver.',
  spare: 'You have {money} to spend. Choose your priorities, or keep it as headroom.',
  settled: 'Your Budget balances. You can find more money to spend more, or go on.',
  raise: 'Find the money',
  raiseLead: 'Each press raises more. Press again to go further.',
  spend: 'Your priorities',
  spendLead: 'Each press spends more, until the money runs out.',
  add: 'Add',
  takeBack: 'Take one back',
  shortBy: '{money} short',
  most: 'As far as it goes',
  others: 'Other changes in your Budget',
  othersLead: 'These came with the link you opened. Undo any you don’t want.',
  undo: 'Undo',
  next: 'Next: deliver the Budget',
  findFirst: 'Find {money} first.',
  back: 'Back to the measures',
} as const;

const money = (gbpm: number) => formatGbpBn(Math.abs(gbpm), 1);

/** "Added once", "Added twice", "Added 3 times". */
function addedWords(n: number): string {
  if (n === 1) return 'Added once';
  if (n === 2) return 'Added twice';
  return `Added ${n} times`;
}

/** The promises an option keeps in words and tests in spirit, by their nouns: "the tax lock". */
function strainsOf(option: BalanceOption): string[] {
  const way = option.step > 0 ? 'above' : 'below';
  return pm.promises
    .filter((p) =>
      p.strains.some((r) => r.code === option.code && (r.when === way || r.when === 'on')),
    )
    .map((p) => p.noun);
}

/**
 * One way to find or spend money: what it is, what one press does and what it raises or costs on
 * the Budget as it stands, and the buttons to press it again or take a press back. A spend that
 * would leave the headroom below the Chancellor's cannot be pressed, and says by how much it is
 * short.
 */
function Option({ option, side }: { option: BalanceOption; side: 'raise' | 'spend' }) {
  const { state, dispatch } = useBudget();
  const moneyOf = useMoneyOf();
  const balance = useBalance();
  const lever = levers.find((l) => l.code === option.code);
  if (!lever) return null;
  const value = state.leverValues[option.code] ?? lever.control.default;
  const next = optionNext(lever, value, option.step);
  const back = optionBack(lever, value, option.step);
  const steps = optionSteps(lever, value, option.step);
  const price = next === undefined ? 0 : moneyOf({ ...state.leverValues, [option.code]: next });
  const after = balance.gbpm + price;
  const unaffordable = side === 'spend' && after <= -BALANCE_SETTLED_GBPM;
  const priced =
    next === undefined ? BALANCE_TEXT.most : `${price >= 0 ? 'raises' : 'costs'} ${money(price)}`;
  const strains = strainsOf(option);
  const set = (to: number) => dispatch({ type: 'setLever', code: option.code, value: to });
  return (
    <li className="option">
      <p className="option__label">{option.label}</p>
      <p className="option__each">
        {option.each} · {priced}
        {strains.map((noun) => (
          <span key={noun} className="tag tag--amber option__tag">
            Strains {noun}
          </span>
        ))}
      </p>
      <p className="option__buttons">
        <button
          type="button"
          className="btn option__add"
          disabled={next === undefined || unaffordable}
          onClick={() => next !== undefined && set(next)}
        >
          {BALANCE_TEXT.add}
          <span className="sr-only">: {option.label}</span>
        </button>
        {back !== undefined ? (
          <button type="button" className="linklike option__back" onClick={() => set(back)}>
            {BALANCE_TEXT.takeBack}
            <span className="sr-only">: {option.label}</span>
          </button>
        ) : null}
        {steps > 0 ? <span className="option__count">{addedWords(steps)}</span> : null}
        {unaffordable && next !== undefined ? (
          <span className="option__short">
            {BALANCE_TEXT.shortBy.replace('{money}', money(after))}
          </span>
        ) : null}
      </p>
    </li>
  );
}

function Menu({ side }: { side: 'raise' | 'spend' }) {
  const id = `menu-${side}`;
  return (
    <section className="menu doc" aria-labelledby={id}>
      <h2 id={id} className="section-label">
        {side === 'raise' ? BALANCE_TEXT.raise : BALANCE_TEXT.spend}
      </h2>
      <p className="panel__hint">
        {side === 'raise' ? BALANCE_TEXT.raiseLead : BALANCE_TEXT.spendLead}
      </p>
      <ul className="options">
        {menus[side].map((option) => (
          <Option key={option.code} option={option} side={side} />
        ))}
      </ul>
    </section>
  );
}

/**
 * Step 2: balance your Budget (ADR-0046). Disagreeing with the Chancellor saved money or gave it
 * up; here the player spends what they saved on their priorities, or finds what they gave up, a
 * fixed step at a time, until it balances. The headroom may not end below the Chancellor's: a
 * spend that would take it there cannot be pressed, and the way on waits while money is still to
 * find. Anything a link brought that is on no menu is listed, to keep or undo.
 */
export function BalancePage() {
  const { state, dispatch, outcome } = useBudget();
  const balance = useBalance();
  const guard = useStageGuard('balance');
  const game = state.game;
  if (guard || !game) return guard;

  const status = ambitionStatus(pm, outcome, levers);
  const onMenus = new Set([...menus.raise, ...menus.spend].map((o) => o.code));
  const others = changeRows({ outcome, levers }).filter(
    (row) => !onMenus.has(row.code) && !cardOf(budget, row.code),
  );
  const state_ = balanceState(balance.gbpm);
  const lead =
    state_ === 'short'
      ? BALANCE_TEXT.short.replace('{money}', money(balance.gbpm))
      : state_ === 'spare'
        ? BALANCE_TEXT.spare.replace('{money}', money(balance.gbpm))
        : BALANCE_TEXT.settled;
  const order: ('raise' | 'spend')[] = state_ === 'short' ? ['raise', 'spend'] : ['spend', 'raise'];

  /** Leaving for the review: the money balances, and the Budget is ready to read back. */
  const leave = () =>
    dispatch({
      type: 'updateGame',
      patch: { reached: Math.max(game.reached, stageIndex('review')) },
    });
  const undo = (code: string) => {
    const lever = levers.find((l) => l.code === code);
    if (lever) dispatch({ type: 'setLever', code, value: lever.control.default });
  };

  return (
    <JourneyLayout step="balance">
      <HeadroomBar outcome={outcome} status={status} balance={balance} />
      <p className={`balance__lead${state_ === 'short' ? ' balance__lead--short' : ''}`}>{lead}</p>

      {order.map((side) => (
        <Menu key={side} side={side} />
      ))}

      {others.length > 0 ? (
        <section className="menu doc" aria-labelledby="menu-others">
          <h2 id="menu-others" className="section-label">
            {BALANCE_TEXT.others}
          </h2>
          <p className="panel__hint">{BALANCE_TEXT.othersLead}</p>
          <ul className="options">
            {others.map((row) => (
              <li key={row.code} className="option">
                <p className="option__label">{row.name}</p>
                <p className="option__each">
                  {[row.standing, row.words].filter(Boolean).join(' · ')}
                </p>
                <p className="option__buttons">
                  <button type="button" className="btn option__undo" onClick={() => undo(row.code)}>
                    {BALANCE_TEXT.undo}
                    <span className="sr-only">: {row.name}</span>
                  </button>
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="actions">
        {balanceHolds(balance.gbpm) ? (
          <StepLink to="/review" className="btn btn--primary" onClick={leave}>
            {BALANCE_TEXT.next}
          </StepLink>
        ) : (
          <button type="button" className="btn btn--primary" disabled>
            {BALANCE_TEXT.next}
          </button>
        )}
        <StepLink to={measuresPath(SMALL_PRINT)} className="btn">
          {BALANCE_TEXT.back}
        </StepLink>
        {balanceHolds(balance.gbpm) ? null : (
          <span className="actions__hint">
            {BALANCE_TEXT.findFirst.replace('{money}', money(balance.gbpm))}
          </span>
        )}
      </p>
    </JourneyLayout>
  );
}
