import { render, screen } from '@testing-library/react';
import { appendFileSync } from 'node:fs';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
// A game at the review on today's estimate, two priorities delivered and employer National
// Insurance two points up: every screen renders in its working state, and the review and the close
// have something to say.
const GAME = 'g=st.4_pr.defence+safer-streets&M=rate.0.75_rpi.0.5&L=moj.10_dip47.1_nicer.2';
// The same game with a tax chosen in six of the tax screen's decisions, which open on arrival with
// every choice in them (ADR-0035), and a budget, a benefit and one of last year's decisions chosen
// on the spending screen, whose decisions open the same way (ADR-0037): the widest those screens
// get on arrival.
const TUNED = GAME.replace(
  'L=moj.10_dip47.1_nicer.2',
  'L=moj.10_dip47.1_nicer.2_vatr.1_wealth2.1_banklevy.1_iinc2.1_apd.2_otherd.-1_woth.-1_rvplan2.1',
);
// Three priorities with the most options between them: the widest the priority screens get.
const WIDEST = 'g=st.2_pr.cost-of-living+welfare-bill+homes-growth&M=rate.0.75_rpi.0.5';

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/**
 * Visible words of a screen: everything in the main column before any fold is opened, less the
 * road, the footer and what only a screen reader hears. What a newcomer has to read to decide.
 */
function screenWords(): number {
  const main = document.querySelector('main');
  if (!main) return 0;
  const clone = main.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll('details, .speech, .sr-only, table, nav.progress, footer')
    .forEach((el) => el.remove());
  return words(clone.textContent ?? '');
}

type Mode = 'basic' | 'advanced';

/**
 * Every screen of the main road, in order, with the game that renders it at its widest and the
 * mode it is read in (Phase 27): a screen basic mode trims is measured in both, the rest in basic,
 * the mode a first game is played in.
 */
const ROAD: readonly [path: string, limit: number, game: string, mode: Mode][] = [
  // The cover: the premise and the button, 19 words since its date, bullets and picture went
  // (ADR-0032). The Budget box came back as a drawing with no words (ADR-0033): still 19.
  ['/', 25, GAME, 'basic'],
  // The briefing in three parts (Phase 28): 205 words in either mode, since advanced mode's
  // explanations are folds. Basic mode's short briefing was 159 words, the full one 237. Then the
  // player's own words (revised 2026-09-29): 232 in either mode. Then plain copy, the same in both
  // modes (ADR-0031): 175, so it is read in basic mode alone. Then the debt rule in the running
  // text rather than a fold, and the softer buffer line (2026-09-30): 206; then said to be the
  // second rule, in plain type: 210. With the badges gone (ADR-0034) this count reads 208: the same
  // words, two paragraphs no longer starting or ending in a space.
  ['/outlook', 230, GAME, 'basic'],
  // Every other screen lost its badges (ADR-0034) and was re-measured and re-pinned with a tenth
  // to spare, as below: the priorities 172 words, against 178.
  ['/pm', 190, GAME, 'basic'],
  // The flagship screens 171, 170 and 153, against 205, 182 and 165: the first lost the line that
  // said what the badges meant.
  ['/budget/deliver', 190, WIDEST, 'advanced'],
  ['/budget/deliver/2', 190, WIDEST, 'advanced'],
  ['/budget/deliver/3', 170, WIDEST, 'advanced'],
  // The best one or two ways a priority (Phase 27): 130, 54 and 110 words, against 205, 182, 165;
  // with no badges, 101, 49 and 102.
  ['/budget/deliver', 115, WIDEST, 'basic'],
  ['/budget/deliver/2', 55, WIDEST, 'basic'],
  ['/budget/deliver/3', 115, WIDEST, 'basic'],
  // Measured after Phase 26's sizes (613, 778, 543 and 724 words), with a tenth to spare; then
  // council homes took Investment's third place on show (spending 580 and 761), and the links to
  // the desk went with it (tax 611 and 776, spending 578 and 759; ADR-0027). With no badges
  // (ADR-0034): tax 592 and 750, spending 554 and 723. Nine taxes taken off the table, and the
  // walk's levy now two points on employer National Insurance (ADR-0035): tax 585 and 741. Then
  // tax by tax, every decision closed until opened (ADR-0035): 512, with the decision on what
  // employers pay open for the walk's two points; the tuned game opens the six decisions holding
  // its choices, each showing every choice in it: 1,176. Then one scale a tax, both ways on one
  // card: 405 and 1,030. Then ticks that contradict each other as one choice among radios, and a
  // line saying what choosing would take out where no notice said "you can't have both" (ADR-0036):
  // the tuned game's wealth tax and dividends are radios now, 925. Then the spending screen in
  // decisions too, each budget one scale both ways (ADR-0037): 496, with the other budgets and the
  // defence plan open for the walk's prisons and defence gap; the tuned game opens four decisions,
  // each showing every choice in it: 842.
  ['/finetune/tax', 450, GAME, 'advanced'],
  ['/finetune/tax', 1020, TUNED, 'advanced'],
  ['/finetune/spending', 550, GAME, 'advanced'],
  ['/finetune/spending', 930, TUNED, 'advanced'],
  // Basic mode (Phase 27): the advisers' shortlist, and whatever the game has chosen besides
  // (tax 343 and 492, spending 424 and 589); with no badges, tax 329 and 471, spending 403 and 556.
  // Employer National Insurance and CGT at death picked in place of the levy and alignment, a
  // scale of sizes where a tick was (ADR-0035): tax 354 and 494. Then grouped by tax, and the
  // tuned game's reduced VAT rate in place of the sugar tax: 353 and 540; each way on show as a
  // scale from the plan: 352 and 536. The spending screen's picks as scales from the plan too
  // (ADR-0037): 400 and 549.
  ['/finetune/tax', 390, GAME, 'basic'],
  ['/finetune/tax', 590, TUNED, 'basic'],
  ['/finetune/spending', 440, GAME, 'basic'],
  ['/finetune/spending', 605, TUNED, 'basic'],
  // The review 204 and Budget day 190 with no badges, against 213 and 199; 196 and 181 with
  // employer National Insurance in the walk in place of the levy (ADR-0035).
  ['/review', 220, GAME, 'basic'],
  ['/budget-day', 200, GAME, 'basic'],
];

/** A fresh browser is in basic mode; advanced is remembered once chosen. */
function inMode(mode: Mode) {
  if (mode === 'basic') window.localStorage.removeItem('btc.mode.v1');
  else window.localStorage.setItem('btc.mode.v1', 'advanced');
}

describe('the word budgets', () => {
  // The budgets are what a newcomer sees, and a newcomer sees the game with the workings off.
  beforeEach(() => window.localStorage.removeItem('btc.workings.v2'));

  it('has no Continue anywhere, no tab on the main road, and one primary action a screen', () => {
    for (const [path, , game, mode] of ROAD) {
      inMode(mode);
      const view = at(`${path}?${BASE}&${game}`);
      expect(
        screen.queryByRole('button', { name: /Continue/ }),
        `${path} has a Continue`,
      ).toBeNull();
      expect(screen.queryAllByRole('tab'), `${path} has tabs`).toHaveLength(0);
      const primaries = document.querySelectorAll('main .btn--primary').length;
      expect(primaries, `${path} has ${primaries} primary actions`).toBe(1);
      view.unmount();
    }
  });

  it('keeps every screen of the main road inside its word budget', () => {
    // Measured on 2026-09-27 with the folds closed, after the words were halved (ADR-0023), and
    // pinned with about a tenth to spare: the opening 27, the priority screens 80 to 125, paying
    // for it 290 (the first three ways of each group on show), the sums 140 and the room to spare
    // 106, the add-ons 140, the review 98, Budget day 233. Re-measured the same day after the
    // starting position gained its rules line, its since-March account and its two questions,
    // the priorities their theme, and the forecast its visible disclosure (Phase 23): the
    // position 303, the priorities 138, the forecast 114. Re-measured again after every option
    // gained its adviser's line and the ways to pay their plain titles, and the voices at the top
    // of the option screens went: the priority screens 145 to 184, paying for it 536, the sums 147
    // and the room to spare 112, the add-ons 234, the review 105, Budget day 240. Then the
    // compromises became three screens, one question each: the sums 67, 73 and 43, the room to
    // spare 57, 44 and 46; every reception band was cut to twenty words: Budget day 205; and the
    // keep and go-further cards gained the Political Adviser's line: the add-ons 252. Paying for
    // it then became fine-tuning tax and spending, real levers with an adviser's line and a price
    // each (Phase 24): tax 531, spending 479 on arrival; 714 and 668 with one folded lever moved
    // in every group, so each group shows four. Then one estimate replaced the forecast cards and
    // the target, and the forecast, the compromises and the add-ons went (Phase 24, ADR-0025):
    // the briefing 201, the review 88, Budget day 188; tax 528 and 711, spending 476 and 665.
    // One price per choice (Phase 25): each fine-tuning card now says the headroom it would leave,
    // and each screen says once why that moves with interest; the review says how the headroom got
    // from the estimate to the bar, who pays most, and which priorities fall short: tax 599 and
    // 782, spending 515 and 704, the review 125. Then the briefing put the one figure's meaning
    // beside it, the advisers' yardstick and what is already on the desk, and folded the decisions
    // since March; step 4's spending screen gained its two notes and the defence plan's gap; the
    // review says what is still on the desk (Phase 25): the briefing 234, spending 612 and 801,
    // the review 148. Then step 4 lost its pairs of equal figures, its slider ends, its year spans
    // and its adviser's name on every card, and its hints went into the conditional: tax 589 and
    // 736, spending 573 and 736. The priorities gained purposes of up to ten words (158); the
    // first flagship screen the badges' key and each its England line (200, 178, 161); the review
    // the tax take in words (173). Then the sign-off (Phase 25): the priorities gained a worked-out
    // line on scale and the welfare priority its tag (178); step 4 its one adviser's line above the
    // cards (tax 605 and 759, spending 588 and 753); the review the Prime Minister's line and one
    // reaction read out with no rating (213). Then basic and advanced (Phase 27): in advanced mode
    // the trimmed screens gain one line offering the shortlist back (the briefing 237, the
    // flagship screens 205, 182 and 165, tax 615 and 780, spending 582 and 763); in basic mode
    // they are shorter (the briefing 159, the flagship screens 130, 54 and 110, tax 343 and 492,
    // spending 424 and 589). Then the briefing became three parts (Phase 28, ADR-0030): 205 words
    // in either mode, the figure, the record, the rules, the gilts, the calculation's four rows and
    // the advice on show, and advanced mode's explanations folded. Then the player rewrote its
    // words: why Chancellors keep a margin and what reaching the record would take in place of the
    // advice, and a line on what moved the forecast before the rows (232 in either mode). Then it
    // became plain copy (ADR-0031): its badges wait for the workings, the desk and the switch went,
    // and the debt rule is a fold (175, the same in both modes).
    for (const [path, limit, game, mode] of ROAD) {
      inMode(mode);
      const view = at(`${path}?${BASE}&${game}`);
      const n = screenWords();
      const tuned = game === TUNED ? ' (tuned)' : '';
      if (process.env.WORDS)
        appendFileSync(
          process.env.WORDS,
          `${path}${tuned}, ${mode}: ${n} words (limit ${limit})\n`,
        );
      expect(n, `${path} shows ${n} words`).toBeLessThanOrEqual(limit);
      // A floor against an empty render: the opening screen is the shortest, at nineteen.
      expect(n, `${path} shows ${n} words`).toBeGreaterThan(15);
      view.unmount();
    }
  });
});
