import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { countdownText, Dateline, daysToBudget } from './Dateline';

const on = (iso: string) => new Date(`${iso}T09:00:00Z`);

describe('the dateline counts down to the Budget', () => {
  it('counts whole days to 28 October 2026', () => {
    expect(daysToBudget(on('2026-10-27'))).toBe(1);
    expect(daysToBudget(on('2026-09-16'))).toBe(42);
  });

  it('stops at nought rather than going negative once the day has passed', () => {
    expect(daysToBudget(on('2026-10-28'))).toBe(0);
    expect(daysToBudget(on('2027-01-01'))).toBe(0);
  });

  it('reads as a sentence at every distance', () => {
    expect(countdownText(on('2026-09-16'))).toBe('42 days to the Budget');
    expect(countdownText(on('2026-10-27'))).toBe('Tomorrow is Budget day');
    expect(countdownText(on('2026-10-28'))).toBe('Budget day');
  });

  it('says where you are and what the date is', () => {
    render(<Dateline now={on('2026-09-16')} />);
    expect(screen.getByText('Treasury Chambers')).toBeInTheDocument();
    expect(screen.getByText('16 September 2026')).toBeInTheDocument();
  });
});
