import { LabelBadge } from '../components/LabelBadge';

export function MethodologyPage() {
  return (
    <article className="prose">
      <h1>How the numbers work</h1>
      <p className="lede">
        The full methodology, with formulas, lives in the repository as{' '}
        <code>docs/methodology.md</code>. This page is the short version.
      </p>

      <h2>Four kinds of number</h2>
      <table>
        <thead>
          <tr>
            <th>Badge</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <LabelBadge badge="direct" />
            </td>
            <td>
              An official estimate of a policy&rsquo;s direct effect on receipts or spending,
              reproduced from HMRC, HM Treasury or the OBR with every transformation step shown.
            </td>
          </tr>
          <tr>
            <td>
              <LabelBadge badge="mechanical" />
            </td>
            <td>
              Arithmetic that follows from the costings and the baseline with no judgement: adding
              deltas to the OBR path, interest on extra borrowing, ratios to GDP.
            </td>
          </tr>
          <tr>
            <td>
              <LabelBadge badge="assumption" />
            </td>
            <td>
              A number you or the tool chooses, using published sensitivities where they exist: the
              interest-rate, growth and inflation sliders, and the year-by-year path of their
              effects.
            </td>
          </tr>
          <tr>
            <td>
              <LabelBadge badge="commentary" />
            </td>
            <td>
              Behavioural and wider economic effects described in words and direction only, with
              sources. Never a number of our own.
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
        balance or surplus in the third year, where balance allows a deficit of up to 0.5% of GDP.
        The <strong>investment rule</strong> requires public sector net financial liabilities to
        fall as a share of GDP in the same target year. The <strong>welfare cap</strong> limits
        spending on most working-age and child benefits to a cash cap plus a 5% margin in 2029-30.
        The OBR assesses the rules once a year, at the autumn Budget.
      </p>

      <h2>How your choices flow through</h2>
      <ol>
        <li>
          Each lever&rsquo;s effect on receipts, day-to-day spending and investment is costed, by
          year.
        </li>
        <li>
          Extra borrowing accrues interest at the OBR&rsquo;s gilt-yield assumption (4.5%), with a
          half-year convention. This line is shown separately and can be switched off.
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
        The game walks through seven steps: the appointment, the outlook, the Prime Minister, the
        package, the OBR&rsquo;s forecast and the sums, the rabbit and Budget day. The road runs one
        way: a stage opens once the one before it has been left, going back is always allowed, and a
        link that jumps ahead is sent back to where the game has got. The progress rail at the top
        of every page and the guard on every page read the same rule. The package is two screens in
        sequence (the taxes, the spending) with a button forward and a link back; the guide&rsquo;s
        kicker says which part you are on. Every screen opens with a guide in plain English (which
        step, what you are doing, why it matters, what to do now) and a glossary of the words a
        newcomer will not know; both are chrome, carry no badge and quote no figure that is not
        sourced. The advisers, the Prime Minister and the ministers are roles, not people; a
        briefing that cites a public document is labelled commentary, and a judgement nobody
        published is labelled simulated and never produces a number. The advisers&rsquo; suggested
        slider settings follow a stated rule: the latest market or independent reading minus the
        OBR&rsquo;s March assumption, rounded to the slider&rsquo;s step. Controls show the level a
        setting moves to (20% to 21%, £12,570 to £13,070), but the engine costs the change, exactly
        as before: levels are display only. VAT base-broadening toggles use HMRC&rsquo;s
        cost-of-relief estimates, which HMRC says do not represent what abolishing a relief would
        raise; abolishing inheritance tax removes the OBR&rsquo;s whole receipts line; reversing the
        October 2024 capital gains tax rise uses the Treasury&rsquo;s own costing of the package.
        The revenue menu a Chancellor actually weighs is in the package too, each option a published
        figure: the employer National Insurance threshold, vehicle excise duty, air passenger duty,
        tobacco duties, the Business Asset Disposal Relief rate, the residence nil-rate band,
        insurance premium tax, and employer National Insurance on pension contributions from
        HMRC&rsquo;s private pension statistics (£14.3 billion in 2024-25, a static cost, with
        HMRC&rsquo;s caveat and the public sector&rsquo;s share on the card). Employer-side National
        Insurance is not a manifesto red line here, on the government&rsquo;s own reading of the
        lock; the Political Adviser says on each such lever that the reading is contested. Phase 12
        added the menu the Budget 2026 reporting says is on the table: ending the capital gains
        write-off at death, a £1.5 million council tax surcharge band, reversing the farm and
        family-business relief reform, two points on the bank surcharge, the energy profits levy
        package again, the self-employed Class 4 rate, VAT off domestic gas, another HMRC compliance
        package, unfreezing the Plan 2 student loan threshold, defence at 3% of GDP from 2027, and
        business rates as a share of the OBR&rsquo;s own line. Each is a published row or a stated
        calculation on one, and each card is badged for what it is.
      </p>

      <h2>Spending levers</h2>
      <p>
        Departmental sliders scale the Spending Review 2025 settlements (resource budgets excluding
        depreciation) for 2025-26 to 2028-29. The Spending Review stops there, so 2029-30 and
        2030-31 carry the last settlement forward in line with the OBR&rsquo;s total day-to-day
        spending path; the drawer marks that as an assumption. The investment slider scales the
        OBR&rsquo;s capital budget forecast and moves borrowing and net financial liabilities but
        not the current budget. Welfare sliders scale the OBR&rsquo;s welfare lines, with
        welfare-cap membership approximated line by line (pensioner spending outside, the rest
        inside). Child benefit uses HMRC&rsquo;s ready reckoner and the four Budget 2025 spending
        decisions use the Treasury&rsquo;s scorecard, both on the spending side. Barnett
        consequentials for Scotland, Wales and Northern Ireland are described under each department,
        never added to the number.
      </p>

      <h2>Where nobody has published a costing</h2>
      <p>
        Some of what a Chancellor weighs has no certified costing: the Prime Minister&rsquo;s
        schemes, a measure the papers say is on the table, a tax nobody has legislated. Rather than
        print a slogan with no number, we do the arithmetic and show it, on the same screen as the
        certified rows: each card names the method, the published figures it rests on and what it
        assumes, wears the assumption badge beside the direct costings around it, and a test
        reproduces the figure from those inputs. Where the base itself is contested, as with a tax
        on wealth above £10 million, the card says so before it shows the number. The kinds of
        arithmetic: a weighted sum of HMRC&rsquo;s pension relief by marginal rate, a repeat of a
        certified Budget 2025 line that assumes the second round raises what the Treasury costed for
        the first, a stated product of published quantities, and a gap between a target share of GDP
        and the OBR&rsquo;s path. The policies MPs once campaigned for that nobody is now
        considering are kept in the data for the record and offered on no screen; an old link to one
        still opens, with a warning. At the sums, the Director of Tax ranks every tax option
        together, each with its badge.
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

      <h2>Show workings</h2>
      <p>
        The sources, the provenance drawers and the breakdown tables sit behind one switch at the
        top of the page, off by default and remembered in your browser. Nothing is removed: every
        figure is still an official number or arithmetic on one, the badges that say which never go
        away, and the sources are one click away on every page. This page and the sources page keep
        the switch on, because they are the workings.
      </p>

      <h2>Budget day</h2>
      <p>
        Three audiences rate the Budget out of five and say why: your backbenchers ask whether this
        is a Labour Budget, the markets whether the headroom is enough and what it does to growth
        and the tax burden, the public whether it made a difference to them. Each rating is three
        plus the points of authored rules, clamped to one to five, and a manifesto promise broken
        pins the public at one whatever else happens. Every threshold, point and sentence is written
        in the data and labelled simulated; &ldquo;Why this rating&rdquo; on each card lists every
        rule with its points, the figure it read, the decisions behind it and, with the workings on,
        its sources. Nothing predicts what a market or a voter would actually do: the cards say what
        a judgement leans on, and the thresholds are the game&rsquo;s own, written down in ADR-0013.
      </p>

      <h2>Why it looks plain</h2>
      <p>
        One page colour, one accent, one type family and nothing smaller than 14px: the page is
        built to be read the way a news article is, not learnt like a game. There are no images and
        no downloaded fonts, so nothing here costs you a network request or hides behind a picture.
        Badges never become status marks: those five words are how you tell a certified costing from
        our own arithmetic, and they stay plain. A rule&rsquo;s verdict is an icon beside a word,
        which the engine computes; nowhere does colour carry a judgement on its own. Moving to the
        next part of a step never removes what you have already read, so an adviser&rsquo;s
        citations stay on the page behind you. The date at the top and the countdown to 28 October
        are the only things on screen we did not calculate, and they carry no badge, because chrome
        must not borrow the vocabulary of a costing.
      </p>

      <h2>What is not modelled</h2>
      <p>
        Growth effects of your choices, what markets would actually do, Barnett consequentials
        (described, not computed), the effect on the debt measure of moving a company into the
        public sector, and depreciation on new investment. The OBR&rsquo;s typical five-year
        forecast error for receipts is 0.9% of GDP, about £32 billion by 2030-31, larger than any
        recent headroom; the verdict cards show it beside every figure.
      </p>
    </article>
  );
}
