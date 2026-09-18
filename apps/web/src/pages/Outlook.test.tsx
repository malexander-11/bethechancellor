import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('choosing what to plan on', () => {
  it('is where the old assumptions link now lands', () => {
    at(`/assumptions?${BASE}`);
    expect(screen.getByText('Choose what to plan on')).toBeInTheDocument();
  });

  it('asks for a headroom target and explains the £20bn rule of thumb as a judgement', () => {
    at(`/outlook?${BASE}`);
    const targets = screen.getByRole('radiogroup', { name: 'Headroom target' });
    expect(within(targets).getAllByRole('radio')).toHaveLength(4);
    expect(within(targets).getByRole('radio', { name: /£20bn/ })).toBeChecked();
    const note = screen.getByRole('complementary', { name: /rule of thumb/ });
    expect(within(note).getByText('Simulated')).toBeInTheDocument();
    expect(within(note).getByText(/Nobody has published that number/)).toBeInTheDocument();
  });

  it('mints a seed and carries the outlook and the target to Downing Street', async () => {
    at(`/outlook?${BASE}`);
    fireEvent.click(screen.getByRole('radio', { name: /A pessimistic analyst/ }));
    fireEvent.click(screen.getByRole('radio', { name: /£30bn/ }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm, and go to Downing Street/ }));
    expect(await screen.findByText('Agree the themes with the Prime Minister')).toBeInTheDocument();
    await waitFor(() => {
      const g = new URLSearchParams(window.location.search).get('g') ?? '';
      expect(g).toMatch(/^s\.\d+/);
      expect(g).toMatch(/pl\.pessimistic/);
      expect(g).toMatch(/hr\.30/);
      expect(g).toMatch(/st\.1/);
    });
  });

  it('keeps the same seed if the player comes back and confirms again', async () => {
    at(`/outlook?${BASE}&g=s.417_st.1_pl.adviser`);
    fireEvent.click(screen.getByRole('button', { name: /Confirm, and go to Downing Street/ }));
    await waitFor(() => {
      const g = new URLSearchParams(window.location.search).get('g') ?? '';
      expect(g).toMatch(/^s\.417/);
    });
  });
});
