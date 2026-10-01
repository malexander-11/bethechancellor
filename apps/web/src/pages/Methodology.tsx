import { Link } from 'react-router-dom';

import { ESTIMATE, vintage } from '../data';
import { usePageTitle } from '../journey/title';

export function MethodologyPage() {
  usePageTitle('How the numbers work');
  // The marginal rate on new borrowing: the OBR's assumption plus today's estimate (Phase 25).
  const base =
    Object.values(vintage.assumptions.marginalInterestRateOnNewBorrowingPct.values)[0] ?? 0;
  const setting = ESTIMATE.rate ?? 0;
  const basePct = base.toFixed(1);
  const estimatePct = setting.toFixed(2);
  const marginalPct = (base + setting).toFixed(2);
  return (
    <article className="prose">
      {/* The full methodology sits behind the About page, the footer's one link (ADR-0033). */}
      <p className="crumb">
        <Link to="/about">Back to About the game &amp; sources</Link>
      </p>
      <h1>How the numbers work</h1>
      <p className="lede">
        The full methodology, with formulas, lives in the repository as{' '}
        <code>docs/methodology.md</code>. This page is the short version.
      </p>

      <h2>Five kinds of number</h2>
      <p>
        Every figure and every line in the game is one of five kinds. The data records which, and
        the tests hold each to its kind. The screens do not label them (ADR-0034): the
        speaker&rsquo;s role says whose a judgement is, and this page says what each kind means.
      </p>
      <table>
        <thead>
          <tr>
            <th>Kind</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Official figure</td>
            <td>
              An official estimate of a policy&rsquo;s direct effect on receipts or spending,
              reproduced from HMRC, HM Treasury or the OBR with every transformation step shown.
            </td>
          </tr>
          <tr>
            <td>Worked out</td>
            <td>
              Arithmetic that follows from the costings and the baseline with no judgement: adding
              deltas to the OBR path, interest on extra borrowing, ratios to GDP.
            </td>
          </tr>
          <tr>
            <td>Assumption</td>
            <td>
              A number the tool chooses, using published sensitivities where they exist:
              today&rsquo;s estimate of interest rates, growth and inflation, and the year-by-year
              path of their effects.
            </td>
          </tr>
          <tr>
            <td>Commentary</td>
            <td>
              Behavioural and wider economic effects described in words and direction only, with
              sources. Never a number of our own.
            </td>
          </tr>
          <tr>
            <td>Game judgement</td>
            <td>
              The game&rsquo;s own opinion, in a role&rsquo;s voice: what the Prime Minister wants,
              what a minister says at a cut, how a market or a household reads the Budget. It quotes
              sources and reads the engine&rsquo;s figures, and never makes a number of its own
              (ADR-0011).
            </td>
          </tr>
        </tbody>
      </table>

      <h2>The baseline</h2>
      <p>
        Everything starts from the OBR&rsquo;s Economic and fiscal outlook of March 2026: borrowing,
        the current budget, net financial liabilities, receipts, departmental and welfare spending
        and debt interest, for 2024-25 to 2030-31. Shares of GDP use two denominators, as the OBR
        does: financial-year GDP for flows such as borrowing, and GDP centred on end-March for the
        debt stock. Where a figure had to be derived from rounded published tables it is flagged as
        provisional.
      </p>

      <h2>The rules</h2>
      <p>
        The <strong>stability rule</strong> requires the current budget (day-to-day spending against
        revenue) to be in surplus in 2029-30. Once 2029-30 becomes the third year of the forecast,
        from the Budget of 28 October 2026, the rule becomes rolling: the current budget must be in
        balance or surplus in the third year. Balance allows a deficit of up to 0.5% of GDP between
        fiscal events only; at a fiscal event the test is a surplus. The{' '}
        <strong>investment rule</strong> requires public sector net financial liabilities to fall as
        a share of GDP in the same target year. The <strong>welfare cap</strong> limits spending on
        most working-age and child benefits to a cash cap plus a 5% margin in 2029-30. The OBR
        assesses the rules once a year, at the autumn Budget.
      </p>

      <h2>How your choices flow through</h2>
      <ol>
        <li>
          Each lever&rsquo;s effect on receipts, day-to-day spending and investment is costed, by
          year.
        </li>
        <li>
          Extra borrowing accrues interest at the OBR&rsquo;s gilt-yield assumption of {basePct}%
          plus the interest-rate setting: {estimatePct} of a point more on today&rsquo;s estimate,
          so {marginalPct}%, with a half-year convention. This line is shown separately and can be
          switched off.
        </li>
        <li>
          Borrowing, investment and the current budget are updated; investment changes the current
          budget only through interest.
        </li>
        <li>
          Net financial liabilities carry the cumulative extra borrowing forward year by year.
        </li>
        <li>Ratios to GDP are recomputed, and each rule is tested in its target year.</li>
      </ol>

      <h2>The journey and the advisers</h2>
      <p>
        The game walks through six steps, one screen at a time, with one primary button on each:
        your briefing in three parts (your headroom on today&rsquo;s estimate, what headroom is, how
        it is calculated); set your priorities with the Prime Minister; flagship policies, one
        screen per priority; fine-tune tax and spend, two screens on which every lever is a policy,
        the taxes tax by tax and the spending by what the money is for, each in the decisions a
        Chancellor takes, closed until opened; deliver the Budget, a review of the whole of it with
        one red button; and feedback. There is no forecast to guess and no headroom target: every
        game plans on one figure, today&rsquo;s estimate, and the rules are the line to meet. The
        road runs one way: a stage opens once the one before it has been left, going back is always
        allowed and keeps every choice, because the Budget lives in the link, and a link that jumps
        ahead is sent back to where the game has got. The progress line at the top of every screen
        after the cover, which marks each step done, current, opened or not yet open, and the guard
        on every page read the same rule. Every flagship policy is a bundle of the game&rsquo;s own
        levers that no other option moves, priced by the engine against the Budget as it stands with
        the headroom it would leave, two that count the same money never both chosen. On the
        fine-tuning screens an open decision is one card with a row for each choice, under a short
        name in the decision&rsquo;s own terms (&ldquo;Food&rdquo; under Remove an exemption). A row
        is a tick, or one scale of levels with where the lever is planned to be among them (VAT at
        15%, 18%, 19%, 20% as planned, 21%, 22% or 25%; a department&rsquo;s budget from 5% less to
        5% more), and before it is chosen it says only what choosing would raise, cost or save, at
        the nearest level each way: the bar keeps the headroom. Once a row is chosen it says what it
        does in 2029-30, its adviser speaks and Undo appears. What a card&rsquo;s rows share is said
        once at its top, and everything else about each lever waits in the card&rsquo;s one fold. A
        lever a chosen flagship already sets shows once, as a line with a way back to that flagship.
        There is no slider anywhere and no desk: every lever the desk once held is a policy on these
        two screens, and with no game only the cover and the briefing open. Every screen opens with
        one heading and one instruction, and for now the sources are listed on the About page rather
        than beside each figure; the guide is chrome and quotes no figure that is not sourced. The
        advisers, the Prime Minister and the ministers are roles, not people; a briefing that cites
        a public document is commentary, and a judgement nobody published is the game&rsquo;s own
        and never produces a number. Today&rsquo;s estimate follows a stated rule: the latest market
        or independent reading minus the OBR&rsquo;s March assumption, rounded to the step the
        assumption moves in (interest rates up three-quarters of a point, RPI inflation up half a
        point, growth on the OBR&rsquo;s path), turned into headroom by the OBR&rsquo;s own
        sensitivities: about £6.8 billion in 2029-30, against £23.6 billion in March. Each radio
        shows the level it moves to (21% on VAT, £12,670 on the personal allowance), but the engine
        costs the change, exactly as before: levels are display only. VAT base-broadening toggles
        use HMRC&rsquo;s cost-of-relief estimates, which HMRC says do not represent what abolishing
        a relief would raise; abolishing inheritance tax removes the OBR&rsquo;s whole receipts
        line; reversing the October 2024 capital gains tax rise uses the Treasury&rsquo;s own
        costing of the package. The revenue menu a Chancellor actually weighs is on the fine-tuning
        screens too, each option a published figure: the employer National Insurance threshold,
        vehicle excise duty, air passenger duty, tobacco duties, the residence nil-rate band, and
        employer National Insurance on pension contributions from HMRC&rsquo;s private pension
        statistics (£14.3 billion in 2024-25, less the £6.5 billion on public sector schemes, which
        would only move money from departments to the Treasury, taken to today&rsquo;s 15% rate).
        Every card built on HMRC&rsquo;s cost of a relief reads &ldquo;raises at most&rdquo; and
        says why, and the markets count it as a figure nobody has certified. Two measures that count
        the same money (taxing people who leave the UK, and taxing them and gains at death, for one)
        cannot both be chosen: choosing one takes the other out and says so first, and where the two
        answer one question, as the wealth tax at 1% or 2% does, they are one choice among radios.
        Each pair has a text that reads from either card. Employer-side National Insurance is not a
        manifesto red line here, on the government&rsquo;s own reading of the lock; the Political
        Adviser says on each such lever that the reading is contested. Phase 12 added the menu the
        Budget 2026 reporting says is on the table: ending the capital gains write-off at death, a
        £1.5 million council tax surcharge band, reversing the farm and family-business relief
        reform, two points on the bank surcharge, the energy profits levy package again, the
        self-employed Class 4 rate, VAT off domestic gas, another HMRC compliance package,
        unfreezing the Plan 2 student loan threshold, defence at 3% of GDP from 2027, and business
        rates as a share of the OBR&rsquo;s own line. Each is a published row or a stated
        calculation on one, and the data records which. Nine taxes were taken off the table on 30
        September 2026: the health and social care levy, insurance premium tax, dropping the
        salary-sacrifice cap, taxing capital gains at income tax rates, a lower VAT threshold,
        National Insurance on landlords&rsquo; rent, a higher tax on selling a business, adding back
        last year&rsquo;s cancelled fuel duty rise and undoing last year&rsquo;s gambling duty
        rises. Pension tax relief and two cuts to stamp duty followed the same day: relief at a flat
        30%, relief at the basic rate only and a cap on the tax-free lump sum; abolishing stamp duty
        on main homes and taking the surcharge on additional homes back to 3%. Their costings are
        kept for the record, and an old link that carries one opens without it.
      </p>

      <h2>Spending levers</h2>
      <p>
        Departmental policies trim or top up the Spending Review 2025 settlements (resource budgets
        excluding depreciation) for 2025-26 to 2028-29. The Spending Review stops there, so 2029-30
        and 2030-31 carry the last settlement forward in line with the OBR&rsquo;s total day-to-day
        spending path; the drawer marks that as an assumption. The investment policies scale the
        OBR&rsquo;s capital budget forecast and moves borrowing and net financial liabilities but
        not the current budget. Welfare policies scale the OBR&rsquo;s welfare lines, with
        welfare-cap membership approximated line by line (pensioner spending outside, the rest
        inside). The five Budget 2025 spending decisions use the Treasury&rsquo;s scorecard, on the
        spending side. Barnett consequentials for Scotland, Wales and Northern Ireland are described
        under each department, never added to the number.
      </p>

      <h2>Where nobody has published a costing</h2>
      <p>
        Some of what a Chancellor weighs has no certified costing: the Prime Minister&rsquo;s
        schemes, a measure the papers say is on the table, a tax nobody has legislated. Rather than
        print a slogan with no number, we do the arithmetic and show it, on the same screen as the
        certified rows: each card names the method, the published figures it rests on and what it
        assumes, and a test reproduces the figure from those inputs. Where the base itself is
        contested, as with a tax on wealth above £10 million, the card says so before it shows the
        number. The kinds of arithmetic: a weighted sum of published figures, a repeat of a
        certified Budget 2025 line that assumes the second round raises what the Treasury costed for
        the first, a stated product of published quantities, and a gap between a target share of GDP
        and the OBR&rsquo;s path. The policies MPs once campaigned for that nobody is now
        considering are kept in the data for the record and offered on no screen; an old link to one
        still opens, with a warning.
      </p>

      <h2>Buying things is not spending</h2>
      <p>
        Cash paid for a financial asset is borrowed and carries interest, but it is not expenditure,
        so it moves neither borrowing nor net financial liabilities. Buying the water companies at
        the Environment Department&rsquo;s own £100 billion would cost £100 billion of gilts and
        about £5 billion a year of interest, and barely touch the stability rule. Abolishing tuition
        fees does the opposite: it turns a loan, which is a financial transaction, into a grant,
        which is spending. Neither is on offer at this Budget; both are kept in the data for the
        record, because together they are the clearest illustration in this tool of what the two
        fiscal rules actually measure.
      </p>

      <h2>The workings</h2>
      <p>
        The game&rsquo;s screens show no sources, provenance drawers or breakdown tables: the
        &ldquo;Show workings&rdquo; view that held them was withdrawn and then deleted. Every figure
        is still an official number or arithmetic on one, though since ADR-0034 no screen labels
        which. This page and the About page, which lists every source, are the workings.
      </p>

      <h2>Basic and advanced</h2>
      <p>
        A first game is played in basic mode, which suggests only the best ideas: on the spending
        screen its adviser&rsquo;s shortlist, all on show, one card a section, and on the flagship
        screens the best one or two ways to deliver each priority. The tax screen, which shows every
        tax, and the briefing are the same in both modes. &ldquo;Best&rdquo; is the advisers&rsquo;
        judgement, and each pick&rsquo;s reason is its own adviser&rsquo;s line. Rules keep it
        checkable: a pick moves the 2029-30 headroom by £1 billion or more at its smallest size on
        today&rsquo;s estimate, counts by 2029-30, is on the table, breaks no promise at any size,
        and never counts the same money as another pick or as something already on your desk, which
        basic mode always shows. A button on each trimmed screen shows every policy and every way,
        and offers the shortlist back; the footer&rsquo;s switch that did the same is withdrawn for
        now. Anything you have chosen stays on show in either mode, and the bar, the review and
        Budget day count every idea whichever mode you are in. The mode is remembered in your
        browser, never in the link, so a Budget you share opens in the reader&rsquo;s own mode.
      </p>

      <h2>Budget day</h2>
      <p>
        Three audiences rate the Budget out of five and say why: your backbenchers ask whether this
        is a Labour Budget, the markets whether the headroom is enough and what it does to growth
        and the tax burden, the public whether it made a difference to them. Each rating starts at
        three: one or two points either way move it a step, three or more move it two. A manifesto
        red line crossed pins the public at one, and a missed fiscal rule holds every audience at
        three or below, whatever else happens. Borrowing, debt and the tax take are measured from
        before your Budget, today&rsquo;s estimate with nothing moved, so what the economy did since
        March is never counted as yours. Each card shows one reason, which always agrees with its
        rating, and one short line for anything that pulled the other way. Every threshold, point
        and sentence is written in the data as the game&rsquo;s judgement; &ldquo;Why this
        rating&rdquo; on each card lists every rule with its points, the figure it read and the
        decisions behind it. Nothing predicts what a market or a voter would actually do: the cards
        say what a judgement leans on, and the thresholds are the game&rsquo;s own, written down in
        ADR-0013 and revised in ADR-0026.
      </p>

      <h2>Why it looks plain</h2>
      <p>
        One page colour, one accent, two serif typefaces and nothing smaller than 14px: the page is
        built to be read the way a news article is, not learnt like a game. The one picture, the
        Budget box on the cover, is drawn in the page, and the two typefaces are served with it, so
        nothing waits on another site and nothing hides behind a picture. There are no badges
        (ADR-0034): the five kinds of number are explained on this page, not labelled on the screen.
        A rule&rsquo;s verdict is an icon beside a word, which the engine computes; nowhere does
        colour carry a judgement on its own. Moving to the next part of a step never removes what
        you have already read, so an adviser&rsquo;s citations stay on the page behind you. The
        guide&rsquo;s words are the only things on screen we did not calculate, and they quote no
        figure.
      </p>

      <h2>What is not modelled</h2>
      <p>
        Growth effects of your choices, what markets would actually do, Barnett consequentials
        (described, not computed), the effect on the debt measure of moving a company into the
        public sector, and depreciation on new investment. The OBR&rsquo;s typical five-year
        forecast error for receipts is 0.9% of GDP, about £33 billion by 2030-31, larger than any
        recent headroom; the verdict cards show it beside every figure.
      </p>
    </article>
  );
}
