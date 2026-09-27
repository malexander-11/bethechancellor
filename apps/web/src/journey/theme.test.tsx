import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { THEME_KEY } from './theme';

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

const theSwitch = () => screen.getByRole('switch', { name: 'Dark mode' });

describe('the theme', () => {
  beforeEach(() => {
    window.localStorage.removeItem(THEME_KEY);
    delete document.documentElement.dataset.theme;
  });

  it('is light by default, whatever the system prefers', () => {
    at('/');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(theSwitch()).not.toBeChecked();
    expect(
      document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? '',
    ).not.toBe('#131c17');
  });

  it('goes dark on request, and remembers it on the next page', () => {
    const view = at('/');
    fireEvent.click(theSwitch());
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem(THEME_KEY)).toBe('dark');
    view.unmount();
    at('/outlook?v=1&f=obr2603&r=ch2602&i=2027');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(theSwitch()).toBeChecked();
    fireEvent.click(theSwitch());
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem(THEME_KEY)).toBe('light');
  });
});
