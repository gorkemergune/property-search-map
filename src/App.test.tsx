// @vitest-environment jsdom
import './test/dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';

const cards = () => document.querySelectorAll('article[id^="card-"]');
const markers = () => document.querySelectorAll('.leaflet-marker-icon');
const resultCount = () => Number(screen.getByText(/homes? found$/).textContent!.match(/\d+/)![0]);
const firstCardButton = () => within(cards()[0] as HTMLElement).getAllByRole('button')[0];

describe('App', () => {
  it('renders one card and one marker per result, and keeps them in sync while filtering', async () => {
    render(<App />);
    expect(cards()).toHaveLength(80);
    expect(markers()).toHaveLength(80);
    expect(resultCount()).toBe(80);

    await userEvent.click(screen.getAllByRole('radio', { name: 'Rent' })[0]);
    const n = resultCount();
    expect(n).toBeLessThan(80);
    expect(cards()).toHaveLength(n);
    expect(markers()).toHaveLength(n);
  });

  it('card click selects the marker; second activation opens details; marker click selects the card', async () => {
    render(<App />);
    const button = firstCardButton();
    await userEvent.click(button);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelectorAll('.price-marker.is-selected')).toHaveLength(1);

    await userEvent.click(button);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Key facts')).toBeTruthy();
    expect(within(dialog).getByText('Bathrooms')).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();

    // Marker → card
    const marker = markers()[5] as HTMLElement;
    fireEvent.click(marker);
    const pressed = document.querySelectorAll('article button[aria-pressed="true"]');
    expect(pressed).toHaveLength(1);
    expect(marker.getAttribute('title')).toContain(pressed[0].textContent!.match(/\d[\d,]*/)![0]);
  });

  it('opens details from the keyboard with Enter on a selected card and from "View details"', async () => {
    render(<App />);
    const button = firstCardButton();
    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    await userEvent.keyboard(' ');
    expect(screen.getByRole('dialog')).toBeTruthy();
    // Focus moves into the drawer, and back to the card when it closes.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close details' }));
    await userEvent.keyboard('{Escape}');
    expect(document.activeElement).toBe(button);

    await userEvent.click(within(cards()[1] as HTMLElement).getByRole('button', { name: /^View details/ }));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('opens details from the map preview', async () => {
    render(<App />);
    await userEvent.click(firstCardButton());
    const preview = screen.getAllByRole('button').find((b) => b.textContent?.includes('View details') && !b.closest('article'));
    expect(preview).toBeDefined();
    await userEvent.click(preview!);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('shows an empty state and clears all filters from it', async () => {
    render(<App />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Search listings' }), 'zzzz');
    expect(screen.getByText('No homes match these filters')).toBeTruthy();
    expect(markers()).toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));
    expect(resultCount()).toBe(80);
  });

  it('removes chips one at a time and clears all', async () => {
    render(<App />);
    await userEvent.click(screen.getAllByRole('radio', { name: 'Rent' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Turkey' }));
    const chipNames = () => screen.queryAllByRole('button', { name: /^Remove filter/ }).map((b) => b.textContent);
    expect(chipNames()).toEqual(['Turkey', 'For rent']);
    await userEvent.click(screen.getByRole('button', { name: 'Remove filter: For rent' }));
    expect(chipNames()).toEqual(['Turkey']);
    expect(resultCount()).toBe(20);
    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(chipNames()).toEqual([]);
    expect(resultCount()).toBe(80);
  });

  it('switches between list and map on mobile and opens the filter panel', async () => {
    render(<App />);
    const toggle = screen.getByRole('button', { name: 'Map' });
    await userEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'List' })).toBeTruthy();
    expect(document.querySelector('main')!.className).toContain('hidden');
    await userEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(document.querySelector('main')!.className).not.toContain('hidden lg:block');

    await userEvent.click(screen.getByRole('button', { name: /^(Filters|All filters)/ }));
    const panel = screen.getByRole('dialog', { name: 'Filters' });
    expect(within(panel).getByText('Bathrooms')).toBeTruthy();
    expect(within(panel).getByText('Floor area')).toBeTruthy();
    await userEvent.selectOptions(within(panel).getByLabelText('Minimum bedrooms'), '3');
    expect(screen.getByRole('button', { name: 'Remove filter: 3+ beds' })).toBeTruthy();
    await userEvent.click(within(panel).getByRole('button', { name: /^Show \d+ results?/ }));
    expect(screen.queryByRole('dialog', { name: 'Filters' })).toBeNull();
  });

  it('moves focus into the filter drawer, keeps Tab inside, and returns focus on close (regression)', async () => {
    render(<App />);
    const opener = screen.getByRole('button', { name: /^(Filters|All filters)/ });
    await userEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Filters' });
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Close filters' }));
    for (let i = 0; i < 60; i++) await userEvent.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Filters' })).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('"All markets" in the header clears a previously chosen city (regression)', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'United Kingdom' }));
    await userEvent.click(screen.getByRole('button', { name: /^(Filters|All filters)/ }));
    await userEvent.selectOptions(within(screen.getByRole('dialog', { name: 'Filters' })).getByLabelText('City'), 'London');
    await userEvent.keyboard('{Escape}');
    expect(resultCount()).toBe(4);
    await userEvent.click(screen.getByRole('button', { name: 'All markets' }));
    expect(resultCount()).toBe(80);
  });

  it('does not reopen search suggestions when a detail opened from search closes (regression)', async () => {
    render(<App />);
    const input = screen.getByRole('combobox', { name: 'Search listings' });
    await userEvent.type(input, 'brickell');
    const listing = screen.getAllByRole('option').find((o) => o.textContent?.includes('Brickell, Miami'))!;
    await userEvent.click(listing);
    expect(screen.getByRole('dialog')).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute('aria-expanded')).toBe('false');
    // Typing or clicking opens it again.
    await userEvent.click(input);
    expect(input.getAttribute('aria-expanded')).toBe('true');
  });

  describe('map marker keyboard access (regression)', () => {
    const cardIds = () => [...cards()].map((c) => c.id.replace('card-', ''));
    const tabbable = () => [...markers()].filter((m) => (m as HTMLElement).tabIndex === 0) as HTMLElement[];
    const marker = (id: string) => document.querySelector<HTMLElement>(`[data-listing-id="${id}"]`)!;

    it('puts a single marker in the Tab order, labelled for screen readers', () => {
      render(<App />);
      expect(markers()).toHaveLength(80);
      const [only] = tabbable();
      expect(tabbable()).toHaveLength(1);
      expect(only.dataset.listingId).toBe(cardIds()[0]);
      expect(only.getAttribute('role')).toBe('button');
      expect(only.getAttribute('aria-label')).toMatch(/^[$₺£][\d,]+(\/mo)?, (Apartment|House|Townhouse|Villa) in .+, .+$/);
      expect(document.getElementById(only.getAttribute('aria-describedby')!)?.textContent).toContain('arrow keys');
    });

    it('moves between markers with arrows, Home and End, in result order', () => {
      render(<App />);
      const ids = cardIds();
      const first = marker(ids[0]);
      first.focus();
      fireEvent.keyDown(first, { key: 'ArrowRight' });
      expect(document.activeElement).toBe(marker(ids[1]));
      expect(tabbable().map((m) => m.dataset.listingId)).toEqual([ids[1]]);
      fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
      expect(document.activeElement).toBe(marker(ids[0]));
      fireEvent.keyDown(document.activeElement!, { key: 'End' });
      expect(document.activeElement).toBe(marker(ids[ids.length - 1]));
      fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
      expect(document.activeElement).toBe(marker(ids[0])); // wraps around
      fireEvent.keyDown(document.activeElement!, { key: 'Home' });
      expect(document.activeElement).toBe(marker(ids[0]));
    });

    it('selects with Enter and keeps the selected marker as the Tab stop', async () => {
      render(<App />);
      const ids = cardIds();
      marker(ids[0]).focus();
      fireEvent.keyDown(marker(ids[0]), { key: 'ArrowDown' });
      fireEvent.keyDown(marker(ids[1]), { key: 'Enter' });
      const card = document.getElementById(`card-${ids[1]}`)!;
      expect(within(card).getAllByRole('button')[0].getAttribute('aria-pressed')).toBe('true');
      expect(marker(ids[1]).getAttribute('aria-pressed')).toBe('true');
      // Selecting another listing from its card moves the Tab stop with it.
      await userEvent.click(within(document.getElementById(`card-${ids[4]}`)!).getAllByRole('button')[0]);
      expect(tabbable().map((m) => m.dataset.listingId)).toEqual([ids[4]]);
    });
  });

  it('shows area in the selected unit on cards and in the detail text (regression)', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /^(Filters|All filters)/ }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Filters' })).getByRole('radio', { name: 'sq ft' }));
    await userEvent.keyboard('{Escape}');
    const card = cards()[0] as HTMLElement;
    const cardArea = card.textContent!.match(/([\d,]+) sq ft/)![1];
    expect(card.textContent).not.toMatch(/m²/);
    await userEvent.click(within(card).getByRole('button', { name: /^View details/ }));
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain(`Internal floor area is about ${cardArea} sq ft.`);
    expect(within(dialog).getByText('Floor area').nextElementSibling!.textContent).toMatch(new RegExp(`^${cardArea} sq ft\\d+ m²$`));
    expect(dialog.textContent).toContain('Approximate location');
    expect(dialog.textContent).not.toMatch(/-?\d+\.\d{4}, -?\d+\.\d{4}/); // no precise coordinates
  });

  describe('Safari-style clicks that do not focus the button (regression)', () => {
    it('returns focus to the listing card when the detail closes', async () => {
      render(<App />);
      (document.activeElement as HTMLElement | null)?.blur();
      const card = cards()[2] as HTMLElement;
      fireEvent.click(within(card).getByRole('button', { name: /^View details/ }));
      expect(screen.getByRole('dialog')).toBeTruthy();
      await userEvent.keyboard('{Escape}');
      expect(document.activeElement).toBe(within(card).getAllByRole('button')[0]);
    });

    it('returns focus to the filters button when the filter drawer closes', async () => {
      render(<App />);
      (document.activeElement as HTMLElement | null)?.blur();
      const trigger = document.querySelector<HTMLElement>('[data-filters-trigger]')!;
      fireEvent.click(trigger);
      await userEvent.keyboard('{Escape}');
      expect(document.activeElement).toBe(trigger);
    });
  });

  it('marks keyboard-focused markers for the focus ring, not mouse-focused ones (regression)', () => {
    render(<App />);
    const [first, second] = [...markers()] as HTMLElement[];
    fireEvent.pointerDown(first);
    first.focus();
    expect(first.hasAttribute('data-keyboard-focus')).toBe(false);
    first.blur();
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    const focused = document.activeElement as HTMLElement;
    expect(focused).not.toBe(first);
    expect(focused.hasAttribute('data-keyboard-focus')).toBe(true);
    expect(second.hasAttribute('data-keyboard-focus') || focused !== second).toBe(true);
    focused.blur();
    expect(focused.hasAttribute('data-keyboard-focus')).toBe(false);
  });
});
