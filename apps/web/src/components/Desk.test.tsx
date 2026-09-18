import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';

/** Land on the desk: a link carrying a budget opens every beat, so the folders are right there. */
function desk(levers = 'itbr.1') {
  const path = `/budget/taxes?${BASE}&L=${levers}`;
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('the desk of folders', () => {
  it('is a drawer of tabs with exactly one folder open', () => {
    desk();
    expect(screen.getAllByRole('tab').length).toBe(7);
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(screen.getAllByRole('tab', { selected: true })).toHaveLength(1);
  });

  it('opens on the first file you have touched, not the first in the drawer', () => {
    // VAT is the fifth folder; a Budget that only moves a VAT lever should still open there.
    desk('vatfood.1');
    expect(screen.getByRole('tab', { selected: true })).toHaveAccessibleName(/VAT/);
  });

  it('puts the changed count in the tab a screen reader hears', () => {
    desk();
    const tab = screen.getByRole('tab', { name: /Income tax/ });
    expect(tab).toHaveAccessibleName(/1 changed/);
    expect(tab).toHaveAccessibleName(/to borrowing in 2029-30/);
    expect(screen.getByRole('tab', { name: /Duties/ })).toHaveAccessibleName(/2 papers/);
  });

  it('moves focus with the arrow keys without opening anything', () => {
    desk();
    const open = screen.getByRole('tab', { selected: true });
    open.focus();
    fireEvent.keyDown(open, { key: 'ArrowRight' });
    // Manual activation: arrowing to a folder does not re-render nine controls under you.
    expect(screen.getByRole('tab', { selected: true })).toBe(open);
    expect(document.activeElement).toHaveAccessibleName(/National Insurance/);
  });

  it('opens the folder you click, and only that one', () => {
    desk();
    fireEvent.click(screen.getByRole('tab', { name: /Capital taxes/ }));
    expect(screen.getByRole('tab', { selected: true })).toHaveAccessibleName(/Capital taxes/);
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText('Inheritance tax rate')).toBeInTheDocument();
    // The papers from the folder you closed are out of the drawer, not merely hidden.
    expect(within(panel).queryByText('Basic rate of income tax')).toBeNull();
  });

  it('keeps every lever reachable through the attribution list, not only the open folder', () => {
    // Closing a folder takes its papers out of the document, so the running list of what you
    // changed is the only place that still names them all.
    desk('itbr.1_vatfood.1');
    fireEvent.click(screen.getByRole('tab', { name: /Duties/ }));
    expect(within(screen.getByRole('tabpanel')).queryByText('Basic rate of income tax')).toBeNull();
    const attribution = screen
      .getByRole('heading', { name: /What you’ve changed/ })
      .closest('section');
    expect(
      within(attribution as HTMLElement).getByText(/Basic rate of income tax/),
    ).toBeInTheDocument();
    expect(within(attribution as HTMLElement).getByText(/Charge VAT on food/)).toBeInTheDocument();
  });
});
