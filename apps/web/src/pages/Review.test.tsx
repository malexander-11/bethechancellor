import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
/** Two priorities agreed, fine-tuning done, on today's estimate: at the review. */
const G = 'g=st.4_pr.safer-streets+defence&M=rate.0.75_rpi.0.5';

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
const part = (name: RegExp) => screen.getByRole('region', { name });
const changeIn = (region: HTMLElement, name: string) => within(region).getByRole('link', { name });

describe('step 5: deliver the Budget', () => {
  it('sends a game that has not finished fine-tuning back to where it is', () => {
    at(`/review?${BASE}&g=st.3_pr.defence&M=rate.0.75_rpi.0.5`);
    expect(screen.getByRole('heading', { level: 1, name: 'Fine-tune tax' })).toBeInTheDocument();
  });

  it('reads the Budget back, part by part, each with a way to change it', () => {
    at(`/review?${BASE}&${G}&L=moj.10_dip47.1_hscl.1_dfe.5`);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Deliver your Budget' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Step 5 of 6')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).toBeNull();

    const priorities = part(/^Your priorities/);
    expect(within(priorities).getByText(/Safer streets: prisons, police, borders/)).toBeVisible();
    expect(within(priorities).getByText(/Defence on the NATO path/)).toBeVisible();
    expect(changeIn(priorities, 'Change')).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/pm\?/),
    );

    const flagships = part(/^Flagship policies/);
    expect(within(flagships).getByText(/More money for prisons and courts/)).toBeInTheDocument();
    expect(
      within(flagships).getByText(/Fill the funding gap in the defence investment plan/),
    ).toBeInTheDocument();
    expect(within(flagships).getAllByText(/costs £\d\.\dbn/).length).toBe(2);
    expect(changeIn(flagships, 'Change safer streets')).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/budget\/deliver\?/),
    );
    expect(changeIn(flagships, 'Change defence')).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/budget\/deliver\/2\?/),
    );

    // Every tax moved, under its plain title, with what it raises.
    const tax = part(/^Tax/);
    expect(
      within(tax).getByText(/^Bring back the health and social care levy/),
    ).toBeInTheDocument();
    expect(within(tax).getByText(/raises £2\d\.\dbn/)).toBeInTheDocument();
    expect(changeIn(tax, 'Change')).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/finetune\/tax\?/),
    );

    // Every other budget moved that no flagship owns, with where it now stands and its cost.
    const spending = part(/^Spending/);
    expect(within(spending).getByText(/^Schools and education · \+5%/)).toBeInTheDocument();
    expect(within(spending).getByText(/costs £\d\.\dbn/)).toBeInTheDocument();
    // The flagships' levers are read back once, as flagships.
    expect(within(spending).queryByText(/Prisons and courts/)).toBeNull();
    expect(changeIn(spending, 'Change')).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/finetune\/spending\?/),
    );

    // Where that leaves you, in words: the bar above already says the figure.
    const position = part(/^Where that leaves you/);
    expect(within(position).getByText('Rules met.')).toBeInTheDocument();
    // The levy keeps the tax lock's words and strains its spirit: amber, not red.
    expect(within(position).getByText('Strains the manifesto: The tax lock')).toHaveClass(
      'tag--amber',
    );
    expect(changeIn(position, 'Change')).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/finetune\/tax\?/),
    );
    // Nothing of the retired steps is left: no speech, no forecast, no target.
    expect(screen.queryByRole('region', { name: /For the speech/ })).toBeNull();
    expect(screen.queryByText(/Since the forecast/)).toBeNull();
    expect(screen.queryByText(/target/)).toBeNull();
  });

  it('says so when no tax or other budget moved, and names a missed rule and a broken promise', () => {
    const quiet = at(`/review?${BASE}&${G}&L=moj.10`);
    expect(within(part(/^Tax/)).getByText('No tax changed.')).toBeInTheDocument();
    expect(within(part(/^Spending/)).getByText('No other budget changed.')).toBeInTheDocument();
    expect(within(part(/^Where that leaves you/)).queryByText(/manifesto/)).toBeNull();
    quiet.unmount();
    at(`/review?${BASE}&${G}&L=dhsc.10_itbr.1`);
    const position = part(/^Where that leaves you/);
    expect(
      within(position).getByText(
        /^Missed: .*Stability rule.*\. The OBR would say so on Budget day\.$/,
      ),
    ).toBeInTheDocument();
    expect(within(position).getByText('Breaks the manifesto: The tax lock')).toHaveClass(
      'tag--warn',
    );
  });

  it('delivers: the red button marks the game finished and opens Budget day with the Budget intact', async () => {
    at(`/review?${BASE}&${G}&L=moj.10_dip47.1`);
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/finetune\/spending\?/),
    );
    const deliver = screen.getByRole('link', { name: 'Deliver my Budget' });
    expect(deliver.className).toMatch(/btn--budget/);
    fireEvent.click(deliver);
    expect(
      screen.getByRole('heading', { level: 1, name: 'What your Budget means' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get('g')).toMatch(/st\.5/);
      expect(params.get('L')).toMatch(/moj\.10/);
    });
  });
});
