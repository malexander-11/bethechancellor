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

/** The balance page's own words (ADR-0046, ADR-0049). */
export const BALANCE_TEXT = {
  short: 'You gave up {money} more than you saved. Find it before you deliver.',
  spare: 'You have {money} to spend. Choose your priorities, or keep it as headroom.',
  settled: 'Your Budget balances. You can find more money to spend more, or go on.',
  budgets: 'Spending budgets',
  budgetsLead: 'Cut a budget to save money, or add to it.',
  departments: 'Departments',
  benefits: 'Benefits',
  eachWay: '{money}',
  planned: 'As planned',
  less: '{n}% less',
  more: '{n}% more',
  cutsStrain: 'Cuts strain {noun}',
  risesStrain: 'Rises strain {noun}',
  raise: 'Raise taxes',
  spend: 'Cut taxes, and other priorities',
  cut: 'Cut',
  add: 'Add',
  takeBack: 'Take one back',
  shortBy: '{money} short',
  most: 'As far as it goes',
  others: 'Other changes in your Budget',
  othersLead: 'These came with the link you opened. Undo any you don’t want.',
  undo: 'Undo',
  next: 'Next: deliver the Budget',
  findFirst: 'Find {money} first.',
  back: 'Back',
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

/** A plus or a minus, drawn on a stepper's button: a picture, so a screen reader hears the words. */
function StepIcon({ add }: { add: boolean }) {
  return (
    <svg className="stepper__icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d={add ? 'M10 4v12M4 10h12' : 'M4 10h12'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * One way to find or spend money, as a tile (ADR-0047): what it is, what one press does and what it
 * raises or costs on the Budget as it stands, and a stepper to take a press back or add one, with
 * how many there are between. A spend that would leave the headroom below the Chancellor's cannot
 * be pressed, and says by how much it is short.
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
    <li className={`option${steps > 0 ? ' option--chosen' : ''}`}>
      <p className="option__label">{option.label}</p>
      <p className="option__each">
        {option.each} · <span className="option__price">{priced}</span>
        {strains.map((noun) => (
          <span key={noun} className="tag tag--amber option__tag">
            Strains {noun}
          </span>
        ))}
      </p>
      <div className="option__buttons">
        <span className="stepper">
          <button
            type="button"
            className="stepper__button"
            disabled={back === undefined}
            onClick={() => back !== undefined && set(back)}
          >
            <StepIcon add={false} />
            <span className="sr-only">
              {BALANCE_TEXT.takeBack}: {option.label}
            </span>
          </button>
          <span className="stepper__count" aria-hidden="true">
            {steps}
          </span>
          <button
            type="button"
            className="stepper__button stepper__button--add"
            disabled={next === undefined || unaffordable}
            onClick={() => next !== undefined && set(next)}
          >
            <StepIcon add />
            <span className="sr-only">
              {BALANCE_TEXT.add}: {option.label}
            </span>
          </button>
        </span>
        {steps > 0 ? <span className="sr-only">{addedWords(steps)}</span> : null}
        {unaffordable && next !== undefined ? (
          <span className="option__short">
            {BALANCE_TEXT.shortBy.replace('{money}', money(after))}
          </span>
        ) : null}
      </div>
    </li>
  );
}

/** Where a budget stands: "As planned", "2% less", "1.5% more". */
function levelWords(value: number): string {
  if (value === 0) return BALANCE_TEXT.planned;
  const n = String(Math.abs(value));
  return (value < 0 ? BALANCE_TEXT.less : BALANCE_TEXT.more).replace('{n}', n);
}

/** The promises a budget tests in spirit if it is cut, or if it rises, in words. */
function budgetStrains(code: string): string[] {
  return pm.promises.flatMap((p) =>
    p.strains
      .filter((r) => r.code === code && (r.when === 'below' || r.when === 'above'))
      .map((r) =>
        (r.when === 'below' ? BALANCE_TEXT.cutsStrain : BALANCE_TEXT.risesStrain).replace(
          '{noun}',
          p.noun,
        ),
      ),
  );
}

/**
 * One spending budget (ADR-0049): what it is, how big one step is and what it is worth, and a
 * stepper with the minus cutting it and the plus adding to it, where it stands between them. A cut
 * saves money and an addition spends it; an addition that would leave the headroom below the
 * Chancellor's cannot be pressed, and says by how much it is short.
 */
function BudgetRow({ option }: { option: BalanceOption }) {
  const { state, dispatch } = useBudget();
  const moneyOf = useMoneyOf();
  const balance = useBalance();
  const lever = levers.find((l) => l.code === option.code);
  if (!lever) return null;
  const value = state.leverValues[option.code] ?? lever.control.default;
  const down = optionNext(lever, value, -option.step);
  const up = optionNext(lever, value, option.step);
  const saves = down === undefined ? 0 : moneyOf({ ...state.leverValues, [option.code]: down });
  const costs = up === undefined ? 0 : moneyOf({ ...state.leverValues, [option.code]: up });
  const size = Math.max(Math.abs(saves), Math.abs(costs));
  const after = balance.gbpm + costs;
  const unaffordable = up !== undefined && after <= -BALANCE_SETTLED_GBPM;
  const set = (to: number) => dispatch({ type: 'setLever', code: option.code, value: to });
  const level = levelWords(value - lever.control.default);
  return (
    <li className={`option${value !== lever.control.default ? ' option--chosen' : ''}`}>
      <p className="option__label">{option.label}</p>
      <p className="option__each">
        {option.each} ·{' '}
        <span className="option__price">
          {BALANCE_TEXT.eachWay.replace('{money}', money(size))}
        </span>
        {budgetStrains(option.code).map((words) => (
          <span key={words} className="tag tag--amber option__tag">
            {words}
          </span>
        ))}
      </p>
      <div className="option__buttons">
        <span className="stepper">
          <button
            type="button"
            className="stepper__button"
            disabled={down === undefined}
            onClick={() => down !== undefined && set(down)}
          >
            <StepIcon add={false} />
            <span className="sr-only">
              {BALANCE_TEXT.cut}: {option.label}
            </span>
          </button>
          <span className="stepper__level">{level}</span>
          <button
            type="button"
            className="stepper__button stepper__button--add"
            disabled={up === undefined || unaffordable}
            onClick={() => up !== undefined && set(up)}
          >
            <StepIcon add />
            <span className="sr-only">
              {BALANCE_TEXT.add}: {option.label}
            </span>
          </button>
        </span>
        {/* Short of money already, every addition waits: saying so on each row says it twelve
            times. With money to spend, an addition it cannot afford says by how much. */}
        {unaffordable && balance.state !== 'short' ? (
          <span className="option__short">
            {BALANCE_TEXT.shortBy.replace('{money}', money(after))}
          </span>
        ) : null}
      </div>
    </li>
  );
}

/** The spending budgets, the departments' and then the benefits', each cut or added to. */
function Budgets() {
  const groups = [
    { id: 'departments', title: BALANCE_TEXT.departments, category: 'spend' },
    { id: 'benefits', title: BALANCE_TEXT.benefits, category: 'welfare' },
  ] as const;
  const categoryOf = (code: string) => levers.find((l) => l.code === code)?.category;
  return (
    <section className="menu" aria-labelledby="menu-budgets">
      <h2 id="menu-budgets" className="section-label">
        {BALANCE_TEXT.budgets}
      </h2>
      <p className="panel__hint">{BALANCE_TEXT.budgetsLead}</p>
      {groups.map((group) => (
        <div key={group.id} className="menu__group">
          <h3 className="menu__heading">{group.title}</h3>
          <ul className="options">
            {menus.budgets
              .filter((o) => categoryOf(o.code) === group.category)
              .map((option) => (
                <BudgetRow key={option.code} option={option} />
              ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function Menu({ side }: { side: 'raise' | 'spend' }) {
  const id = `menu-${side}`;
  return (
    <section className="menu" aria-labelledby={id}>
      <h2 id={id} className="section-label">
        {side === 'raise' ? BALANCE_TEXT.raise : BALANCE_TEXT.spend}
      </h2>
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
  const onMenus = new Set([...menus.budgets, ...menus.raise, ...menus.spend].map((o) => o.code));
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
  // The budgets first, cut to save or added to (ADR-0049). Short, then the taxes to raise: no tax
  // cut can be afforded until the money is found (ADR-0047). With money to spend, the tax cuts and
  // other priorities, then the taxes to raise for more.
  const order: ('raise' | 'spend')[] = state_ === 'short' ? ['raise'] : ['spend', 'raise'];

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

      <Budgets />
      {order.map((side) => (
        <Menu key={side} side={side} />
      ))}

      {others.length > 0 ? (
        <section className="menu" aria-labelledby="menu-others">
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

      <p className="actions actions--sticky">
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
