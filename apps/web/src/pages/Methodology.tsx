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

      <h2>What is not modelled</h2>
      <p>
        Growth effects of your choices, market reactions to the fiscal stance, devolved budgets,
        financial transactions beyond the baseline, depreciation on new investment, and
        classification changes. The OBR&rsquo;s typical five-year forecast error for receipts is
        0.9% of GDP, about £32 billion by 2030-31, larger than any recent headroom; the verdict
        cards show it beside every figure.
      </p>
    </article>
  );
}
