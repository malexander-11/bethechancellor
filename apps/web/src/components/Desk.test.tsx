import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';

/** Land on the package: a link carrying a budget opens every beat, so the groups are right there. */
function desk(levers = 'itbr.1') {
  const path = `/budget/taxes?${BASE}&L=${levers}`;
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('the lever groups', () => {
  it('is a row of tabs with exactly one group open', () => {
    desk();
    expect(screen.getAllByRole('tab').length).toBe(8);
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(screen.getAllByRole('tab', { selected: true })).toHaveLength(1);
  });

  it('opens on the first group you have touched, not the first in the row', () => {
    // VAT is the fifth group; a Budget that only moves a VAT lever should still open there.
    desk('vatfood.1');
    expect(screen.getByRole('tab', { selected: true })).toHaveAccessibleName(/VAT/);
  });

  it('puts the changed count in the tab a screen reader hears', () => {
    desk();
    const tab = screen.getByRole('tab', { name: /Income tax/ });
    expect(tab).toHaveAccessibleName(/1 changed/);
    expect(tab).toHaveAccessibleName(/to borrowing in 2029-30/);
    expect(screen.getByRole('tab', { name: /Duties/ })).toHaveAccessibleName(/6 levers/);
  });

  it('moves focus with the arrow keys without opening anything', () => {
    desk();
    const open = screen.getByRole('tab', { selected: true });
    open.focus();
    fireEvent.keyDown(open, { key: 'ArrowRight' });
    // Manual activation: arrowing to a group does not re-render nine controls under you.
    expect(screen.getByRole('tab', { selected: true })).toBe(open);
    expect(document.activeElement).toHaveAccessibleName(/National Insurance/);
  });

  it('opens the group you click, and only that one', () => {
    desk();
    fireEvent.click(screen.getByRole('tab', { name: /Wealth and property/ }));
    expect(screen.getByRole('tab', { selected: true })).toHaveAccessibleName(/Wealth and property/);
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText('Inheritance tax rate')).toBeInTheDocument();
    // The levers of the group you closed are out of the document, not merely hidden.
    expect(within(panel).queryByText('Basic rate of income tax')).toBeNull();
  });

  it('gives every lever a heading, a group and a described control, and buttons that say which lever', () => {
    desk('itbr.1');
    const panel = screen.getByRole('tabpanel');
    const card = within(panel).getByRole('group', { name: 'Basic rate of income tax' });
    expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent(
      'Basic rate of income tax',
    );
    // The slider is described by the lever's one line and, once moved, by what it does.
    expect(within(card).getByRole('slider')).toHaveAccessibleDescription(
      /Current budget in 2029-30/,
    );
    expect(within(card).getByRole('button', { name: /Back to OBR for/ })).toBeInTheDocument();
    // Five "Detail and sources" buttons in a group would otherwise be five identical names.
    const names = screen
      .getAllByRole('button', { name: /Detail and sources/ })
      .map((b) => b.textContent);
    expect(new Set(names).size).toBe(names.length);
  });

  it('keeps every lever reachable through the attribution list, not only the open group', () => {
    // Closing a group takes its levers out of the document, so the running list of what you
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
