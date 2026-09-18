import { pickOutcome, SEED_MAX, SEED_MIN } from '@btc/engine';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { draws } from '../data';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';

function seedFor(id: string): number {
  for (let s = SEED_MIN; s <= SEED_MAX; s += 1)
    if (pickOutcome(s, draws.outcomes).id === id) return s;
  throw new Error(`no seed lands on ${id}`);
}
const ADVISER = seedFor('adviser-right');
const HARD = seedFor('hard-line');

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

const money = (s: string) => {
  const m = /([+−-]?)£(\d+\.\d)bn/.exec(s);
  if (!m) throw new Error(`no amount in "${s}"`);
  return (m[1] === '−' || m[1] === '-' ? -1 : 1) * Number(m[2]);
};

describe('the OBR’s forecast', () => {
  it('sends a link with no game back to the outlook', () => {
    at(`/forecast?${BASE}&L=ufsm.1`);
    expect(screen.getByText('Choose what to plan on')).toBeInTheDocument();
  });

  it('opens the envelope: the sliders become the OBR’s, the package is remembered, the game moves on', async () => {
    at(`/forecast?${BASE}&g=s.${ADVISER}_st.3_pl.baseline&L=ufsm.1`);
    expect(screen.queryByText(/What happened to the economy/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Open the envelope/ }));
    expect(screen.getByText(/1 · What happened to the economy/)).toBeInTheDocument();
    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get('g')).toMatch(/rv\.1/);
      expect(params.get('g')).toMatch(/st\.3/);
      expect(params.get('M')).toBe('rate.0.75_rpi.0.5');
      expect(params.get('S')).toBe('ufsm.1');
    });
  });

  it('shows an economy line of nought when the plan matched what arrived, and the lines add up', () => {
    at(`/forecast?${BASE}&g=s.${ADVISER}_st.3_pl.adviser&M=rate.0.75_rpi.0.5&L=ufsm.1_wealth.1`);
    fireEvent.click(screen.getByRole('button', { name: /Open the envelope/ }));
    const economy = screen
      .getByText(/The economy moved, including what dearer money does/)
      .closest('p');
    const costings = screen.getByText('The OBR re-scored your measures').closest('p');
    const total = screen.getByText(/what you planned on → the OBR’s/).closest('p');
    expect(money(within(economy as HTMLElement).getByRole('strong').textContent ?? '')).toBe(0);
    const c = money(within(costings as HTMLElement).getByRole('strong').textContent ?? '');
    expect(c).toBeLessThan(0);
    const delta = money(/\(([^)]*)\)/.exec(total?.textContent ?? '')?.[1] ?? '');
    expect(delta).toBeCloseTo(c, 1);
  });

  it('lists the measures the OBR re-scored, with the factor and the original badge', () => {
    at(`/forecast?${BASE}&g=s.${HARD}_st.3_pl.adviser&L=wealth.1_itbr.1`);
    fireEvent.click(screen.getByRole('button', { name: /Open the envelope/ }));
    const row = screen.getByText(/Tax extreme wealth/).closest('tr') as HTMLElement;
    expect(within(row).getByText('re-scored ×0.6')).toBeInTheDocument();
    expect(within(row).getByText('Assumption')).toBeInTheDocument();
    expect(screen.queryByText(/Basic rate of income tax.*re-scored/)).toBeNull();
    expect(screen.getByText(/This forecast is a simulation/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Replay these conditions/ })).toHaveAttribute(
      'href',
      expect.stringContaining(`g=s.${HARD}`),
    );
  });

  it('locks the outlook step once the envelope is open', () => {
    at(`/outlook?${BASE}&g=s.${ADVISER}_st.3_pl.adviser_rv.1&M=rate.0.75_rpi.0.5`);
    expect(screen.getByText(/The OBR’s October forecast has arrived/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /£20bn/ })).toBeDisabled();
  });
});
