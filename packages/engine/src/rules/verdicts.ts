import { prevFy } from '../calc/years.js';
import { pctOfGdp } from '../calc/ratios.js';
import type {
  CurrentBudgetRule,
  RuleSet,
  StockFallingRule,
  Vintage,
  WelfareCapRule,
} from '../types/data.js';
import type { AssessAsOf, FiscalPaths, RuleVerdict, VerdictStatus } from '../types/engine.js';
import { resolveTargetYear } from './targetYear.js';

function unavailable(
  rule: { id: string; name: string; shortName: string; kind: RuleVerdict['kind'] },
  targetYear: string,
  rolling: boolean,
  why: string,
): RuleVerdict {
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    shortName: rule.shortName,
    kind: rule.kind,
    targetYear,
    rolling,
    status: 'unavailable',
    metric: {
      label: 'n/a',
      value: Number.NaN,
      unit: 'GBPm',
      threshold: Number.NaN,
      comparator: '<=',
    },
    headroomGbpm: Number.NaN,
    headroomPctGdp: Number.NaN,
    baseline: { status: 'unavailable', headroomGbpm: Number.NaN, metricValue: Number.NaN },
    requirement: '',
    explanation: why,
  };
}

export function evaluateCurrentBudgetRule(
  rule: CurrentBudgetRule,
  vintage: Vintage,
  paths: FiscalPaths,
  assessAsOf: AssessAsOf,
): RuleVerdict {
  const { targetYear, rolling } = resolveTargetYear(rule, vintage.years, assessAsOf);
  const deficit = paths.policy.currentBudgetDeficit[targetYear];
  const gdp = paths.policy.nominalGdpFy[targetYear];
  const baseDeficit = paths.baseline.currentBudgetDeficit[targetYear];
  const baseGdp = paths.baseline.nominalGdpFy[targetYear];
  if (
    deficit === undefined ||
    gdp === undefined ||
    baseDeficit === undefined ||
    baseGdp === undefined
  ) {
    return unavailable(
      rule,
      targetYear,
      rolling,
      `The ${vintage.id} forecast does not reach ${targetYear}.`,
    );
  }
  // Once the rule rolls, "balance" allows a deficit of up to 0.5% of GDP between fiscal events,
  // and a Budget is a fiscal event: it must return the current budget to surplus, which is how
  // the OBR states the margin. The range is reported, never used for the verdict.
  const tolerance = rolling ? (rule.balanceTolerancePctGdp / 100) * gdp : 0;
  const status: VerdictStatus = deficit <= 0 ? 'met' : 'notMet';
  const baseStatus: VerdictStatus = baseDeficit <= 0 ? 'met' : 'notMet';
  const headroomToSurplus = -deficit;
  const requirement = rolling
    ? `Current budget in balance or surplus in ${targetYear} (third year of the rolling forecast): in surplus at a Budget, with a deficit of up to ${rule.balanceTolerancePctGdp}% of GDP allowed only between fiscal events.`
    : `Current budget in surplus in ${targetYear}.`;
  const explanation =
    deficit <= 0
      ? `Day-to-day spending is covered with a surplus of ${(Math.abs(deficit) / 1000).toFixed(1)}bn in ${targetYear}.`
      : `Day-to-day spending exceeds revenue by ${(deficit / 1000).toFixed(1)}bn in ${targetYear}${rolling && deficit <= tolerance ? ', inside the 0.5% of GDP range allowed between fiscal events, which a Budget must close' : ''}.`;
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    shortName: rule.shortName,
    kind: 'currentBudget',
    targetYear,
    rolling,
    status,
    metric: {
      label: `Current budget deficit, ${targetYear}`,
      value: deficit,
      unit: 'GBPm',
      threshold: 0,
      comparator: '<=',
    },
    headroomGbpm: headroomToSurplus,
    headroomPctGdp: pctOfGdp(headroomToSurplus, gdp),
    ...(rolling ? { headroomToToleranceGbpm: tolerance - deficit, toleranceGbpm: tolerance } : {}),
    baseline: { status: baseStatus, headroomGbpm: -baseDeficit, metricValue: baseDeficit },
    requirement,
    explanation,
  };
}

export function evaluateStockFallingRule(
  rule: StockFallingRule,
  vintage: Vintage,
  paths: FiscalPaths,
  assessAsOf: AssessAsOf,
): RuleVerdict {
  const { targetYear, rolling } = resolveTargetYear(rule, vintage.years, assessAsOf);
  const previous = prevFy(targetYear);
  const ratioT = paths.policy.psnflPctGdp[targetYear];
  const ratioPrev = paths.policy.psnflPctGdp[previous];
  const gdpCentred = paths.policy.nominalGdpCentred[targetYear];
  const baseRatioT = paths.baseline.psnflPctGdp[targetYear];
  const baseRatioPrev = paths.baseline.psnflPctGdp[previous];
  const baseGdpCentred = paths.baseline.nominalGdpCentred[targetYear];
  if (
    ratioT === undefined ||
    ratioPrev === undefined ||
    gdpCentred === undefined ||
    baseRatioT === undefined ||
    baseRatioPrev === undefined ||
    baseGdpCentred === undefined
  ) {
    return unavailable(
      rule,
      targetYear,
      rolling,
      `The ${vintage.id} forecast does not reach ${targetYear}.`,
    );
  }
  const change = ratioT - ratioPrev;
  const baseChange = baseRatioT - baseRatioPrev;
  const headroom = (-change / 100) * gdpCentred;
  const baseHeadroom = (-baseChange / 100) * baseGdpCentred;
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    shortName: rule.shortName,
    kind: 'stockFalling',
    targetYear,
    rolling,
    status: change < 0 ? 'met' : 'notMet',
    metric: {
      label: `Change in net financial liabilities as a share of GDP, ${previous} to ${targetYear}`,
      value: change,
      unit: 'pp',
      threshold: 0,
      comparator: '<',
    },
    headroomGbpm: headroom,
    headroomPctGdp: -change,
    baseline: {
      status: baseChange < 0 ? 'met' : 'notMet',
      headroomGbpm: baseHeadroom,
      metricValue: baseChange,
    },
    requirement: `Net financial liabilities falling as a share of GDP between ${previous} and ${targetYear}${rolling ? ' (third year of the rolling forecast)' : ''}.`,
    explanation:
      change < 0
        ? `Debt falls by ${Math.abs(change).toFixed(2)} percentage points of GDP in ${targetYear}.`
        : `Debt rises by ${change.toFixed(2)} percentage points of GDP in ${targetYear}.`,
  };
}

/**
 * The cap is assessed on capped welfare plus the OBR's own adjustments for the year (inflation
 * since the cap was set and the Scottish block grant), when the vintage carries them.
 */
export function evaluateWelfareCapRule(
  rule: WelfareCapRule,
  vintage: Vintage,
  paths: FiscalPaths,
): RuleVerdict {
  const year = rule.capYear;
  const adjustment = vintage.fiscal.welfareCapAdjustments?.values[year] ?? 0;
  const forecast = paths.policy.welfareInCap[year];
  const baseForecast = paths.baseline.welfareInCap[year];
  const spend = forecast === undefined ? undefined : forecast + adjustment;
  const baseSpend = baseForecast === undefined ? undefined : baseForecast + adjustment;
  const gdp = paths.policy.nominalGdpFy[year];
  if (spend === undefined || baseSpend === undefined || gdp === undefined) {
    return unavailable(rule, year, false, `No capped welfare forecast for ${year}.`);
  }
  const ceiling = rule.capGbpm * (1 + rule.marginPct / 100);
  const classify = (s: number): VerdictStatus =>
    s <= rule.capGbpm ? 'withinCap' : s <= ceiling ? 'aboveCapWithinMargin' : 'aboveMargin';
  const status = classify(spend);
  const headroom = ceiling - spend;
  const words: Record<string, string> = {
    withinCap: 'Capped welfare spending is within the cap.',
    aboveCapWithinMargin:
      'Capped welfare spending is above the cap but within the 5% margin, so the cap is not breached.',
    aboveMargin:
      'Capped welfare spending exceeds the cap and its margin: the cap would be breached at a formal assessment.',
  };
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    shortName: rule.shortName,
    kind: 'welfareCap',
    targetYear: year,
    rolling: false,
    status,
    metric: {
      label:
        adjustment === 0
          ? `Welfare spending inside the cap, ${year}`
          : `Welfare spending inside the cap after the OBR's adjustments, ${year}`,
      value: spend,
      unit: 'GBPm',
      threshold: ceiling,
      comparator: '<=',
    },
    headroomGbpm: headroom,
    headroomPctGdp: pctOfGdp(headroom, gdp),
    baseline: {
      status: classify(baseSpend),
      headroomGbpm: ceiling - baseSpend,
      metricValue: baseSpend,
    },
    requirement: `Capped welfare spending within £${(rule.capGbpm / 1000).toFixed(1)}bn plus a ${rule.marginPct}% margin in ${year}.`,
    explanation: words[status] ?? '',
  };
}

export function evaluateRules(
  rules: RuleSet,
  vintage: Vintage,
  paths: FiscalPaths,
  assessAsOf: AssessAsOf,
): RuleVerdict[] {
  return rules.rules.map((rule) => {
    switch (rule.kind) {
      case 'currentBudget':
        return evaluateCurrentBudgetRule(rule, vintage, paths, assessAsOf);
      case 'stockFalling':
        return evaluateStockFallingRule(rule, vintage, paths, assessAsOf);
      case 'welfareCap':
        return evaluateWelfareCapRule(rule, vintage, paths);
    }
  });
}
