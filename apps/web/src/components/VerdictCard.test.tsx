import { computeOutcome } from '@btc/engine';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { households, levers, rules, vintage } from '../data';
import { VerdictCard } from './VerdictCard';

describe('VerdictCard', () => {
  it('shows the OBR headroom as a met stability rule with per-household framing', () => {
    const outcome = computeOutcome({ vintage, rules, levers });
    const verdict = outcome.verdicts.find((v) => v.ruleId === 'stability');
    if (!verdict) throw new Error('missing verdict');
    render(
      <VerdictCard verdict={verdict} householdCount={households.value} typicalErrorGbpm={32000} />,
    );
    expect(screen.getByText('Rule met')).toBeInTheDocument();
    // The figure appears twice: as the hero number and as the OBR baseline comparison.
    expect(screen.getAllByText('£23.6bn')).toHaveLength(2);
    expect(screen.getByText(/about £830 per household/)).toBeInTheDocument();
    expect(screen.getByText('2029-30', { selector: '.verdict__year' })).toBeInTheDocument();
  });

  it('flags a missed rule when the economy turns against the Chancellor', () => {
    const outcome = computeOutcome({
      vintage,
      rules,
      levers,
      settings: { leverValues: { rate: 2 } },
    });
    const verdict = outcome.verdicts.find((v) => v.ruleId === 'stability');
    if (!verdict) throw new Error('missing verdict');
    render(
      <VerdictCard verdict={verdict} householdCount={households.value} typicalErrorGbpm={32000} />,
    );
    expect(screen.getByText('Rule not met')).toBeInTheDocument();
  });
});
