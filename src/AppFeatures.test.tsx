// @vitest-environment jsdom
import './test/dom';
import { act, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { properties } from './data/properties';
import { STORAGE_KEYS } from './lib/storage';

const cards = () => [...document.querySelectorAll<HTMLElement>('article[id^="card-"]')];
const markers = () => document.querySelectorAll('.leaflet-marker-icon');
const resultCount = () => Number(screen.getByText(/homes? found$/).textContent!.match(/\d+/)![0]);
const savedButton = () => screen.getByRole('button', { name: /^Saved homes, \d+ saved/ });
const saveToggle = (card: HTMLElement) => within(card).getByRole('button', { name: /^Save / });
const openDrawer = async () => {
  await userEvent.click(screen.getByRole('button', { name: /^(Filters|All filters)/ }));
  return screen.getByRole('dialog', { name: 'Filters' });
};

describe('saved homes', () => {
  it('saves from a card, counts, persists across reloads and compares side by side', async () => {
    const { unmount } = render(<App />);
    const [first, second] = cards();
    await userEvent.click(saveToggle(first));
    await userEvent.click(saveToggle(second));
    expect(saveToggle(first).getAttribute('aria-pressed')).toBe('true');
    expect(savedButton().textContent).toContain('2');

    // A reload keeps the basket.
    unmount();
    render(<App />);
    expect(savedButton().textContent).toContain('2');
    expect(saveToggle(cards()[0]).getAttribute('aria-pressed')).toBe('true');

    await userEvent.click(savedButton());
    const panel = screen.getByRole('dialog', { name: /Saved homes/ });
    const table = within(panel).getByRole('table');
    expect(within(table).getAllByRole('columnheader')).toHaveLength(3);
    for (const label of ['Price', 'Bedrooms', 'Bathrooms', 'Floor area', 'EPC rating', 'Location']) {
      expect(within(table).getByRole('rowheader', { name: label })).toBeTruthy();
    }
  }, 20_000);

  it('stores private notes and ratings locally and never in the URL', async () => {
    render(<App />);
    await userEvent.click(saveToggle(cards()[0]));
    await userEvent.click(savedButton());
    const panel = screen.getByRole('dialog', { name: /Saved homes/ });
    await userEvent.type(within(panel).getByRole('textbox', { name: /^Your private note for/ }), 'Close to work');
    await userEvent.click(within(panel).getByRole('radio', { name: '4 stars' }));

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.saved)!);
    expect(stored[0]).toMatchObject({ note: 'Close to work', rating: 4 });
    expect(window.location.href).not.toMatch(/Close|rating|note/i);
    expect(within(panel).getByRole('radio', { name: '4 stars' }).getAttribute('aria-checked')).toBe('true');
  }, 20_000);

  it('flags saved homes outside the current results, removes one and clears all', async () => {
    render(<App />);
    await userEvent.click(saveToggle(cards()[0]));
    await userEvent.click(saveToggle(cards()[1]));
    // Filter to a city that excludes at least one saved home.
    const firstCity = cards()[0].textContent!.includes('London') ? 'Edinburgh' : 'London';
    await userEvent.click(screen.getAllByRole('button', { name: firstCity })[0]);
    await userEvent.click(savedButton());
    const panel = screen.getByRole('dialog', { name: /Saved homes/ });
    expect(within(panel).getAllByText('Not in your current results').length).toBeGreaterThan(0);

    await userEvent.click(within(panel).getAllByRole('button', { name: /^Remove .* from saved homes$/ })[0]);
    expect(savedButton().textContent).toContain('1');
    await userEvent.click(within(panel).getByRole('button', { name: 'Clear all saved homes' }));
    await userEvent.click(within(panel).getByRole('button', { name: 'Clear all' }));
    expect(savedButton().textContent).toContain('0');
    expect(within(panel).getByText('No saved homes yet')).toBeTruthy();
  }, 20_000);

  it('survives corrupt storage', () => {
    window.localStorage.setItem(STORAGE_KEYS.saved, '{oops');
    window.localStorage.setItem(STORAGE_KEYS.viewed, '"not a list"');
    render(<App />);
    expect(savedButton().textContent).toContain('0');
    expect(screen.queryByText('Previously viewed')).toBeNull();
  });
});

describe('previously viewed', () => {
  it('marks a listing only after its details open, keeps it after reload, and clears', async () => {
    const { unmount } = render(<App />);
    const card = cards()[0];
    await userEvent.hover(card);
    await userEvent.click(within(card).getAllByRole('button')[0]); // select only
    expect(within(cards()[0]).queryByText('Previously viewed')).toBeNull();

    await userEvent.click(within(cards()[0]).getByRole('button', { name: /^View details/ }));
    await userEvent.keyboard('{Escape}');
    expect(within(cards()[0]).getByText('Previously viewed')).toBeTruthy();
    expect(within(cards()[1]).queryByText('Previously viewed')).toBeNull();
    expect(window.location.search).not.toMatch(/view/i);

    unmount();
    render(<App />);
    expect(within(cards()[0]).getByText('Previously viewed')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Clear viewing history' }));
    expect(screen.queryByText('Previously viewed')).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEYS.viewed)).toBeNull();
  }, 20_000);
});

describe('map heat layers', () => {
  it('switches between homes, popular areas and listing density, with a labelled legend', async () => {
    render(<App />);
    const group = screen.getByRole('radiogroup', { name: 'Map view' });
    expect(within(group).getByRole('radio', { name: 'Homes' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.queryByRole('region', { name: /Popular areas/ })).toBeNull();

    await userEvent.click(within(group).getByRole('radio', { name: 'Popular areas' }));
    const popular = screen.getByRole('region', { name: 'Popular areas' });
    await waitFor(() => expect(popular.textContent).toMatch(/ONS mid-year/), { timeout: 10_000 });
    expect(window.location.search).toContain('map=popular');
    expect(document.querySelector('.leaflet-areas-pane svg')).not.toBeNull();
    // Markers stay (as quiet dots) so the map and list stay in sync.
    expect(markers()).toHaveLength(properties.length);
    expect(document.querySelectorAll('.price-marker.is-muted').length).toBeGreaterThan(0);

    await userEvent.click(within(group).getByRole('radio', { name: 'Listing density' }));
    expect(screen.getByRole('region', { name: 'Listing density' }).textContent).toContain(`${properties.length} homes`);
    await userEvent.click(screen.getAllByRole('radio', { name: 'Rent' })[0]);
    expect(screen.getByRole('region', { name: 'Listing density' }).textContent).toContain(`${resultCount()} homes`);

    await userEvent.click(within(group).getByRole('radio', { name: 'Homes' }));
    expect(document.querySelector('.leaflet-areas-pane path')).toBeNull();
    expect(window.location.search).not.toContain('map=');
  }, 20_000);

  it('handles zero results in density mode', async () => {
    window.history.replaceState(null, '', '/?map=density&q=zzzz');
    render(<App />);
    expect(resultCount()).toBe(0);
    await waitFor(() => expect(screen.getByRole('region', { name: 'Listing density' }).textContent).toContain('every area shows zero'), { timeout: 10_000 });
  });
});

describe('shareable search links', () => {
  it('restores filters and map view from a shared link', () => {
    window.history.replaceState(null, '', '/?city=Bristol&for=rent&beds=2-&pets=yes&map=popular');
    render(<App />);
    expect(screen.getByRole('button', { name: 'Remove filter: Bristol' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove filter: Pets allowed' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Popular areas' }).getAttribute('aria-checked')).toBe('true');
    expect(cards().every((c) => c.textContent!.includes('Bristol'))).toBe(true);
  });

  it('writes filter changes to the URL and follows back/forward', async () => {
    render(<App />);
    await userEvent.click(screen.getAllByRole('radio', { name: 'Rent' })[0]);
    expect(window.location.search).toBe('?for=rent');
    const rentCount = resultCount();

    // Simulate the browser going back to the unfiltered page.
    act(() => {
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(resultCount()).toBe(properties.length);
    act(() => {
      window.history.pushState(null, '', '/?for=rent');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(resultCount()).toBe(rentCount);
  });

  it('copies the link and announces success, or offers the link to copy by hand', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<App />);
    await userEvent.click(screen.getAllByRole('radio', { name: 'Buy' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Share search' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('?for=sale'));
    expect(screen.getByText('Link copied')).toBeTruthy();

    writeText.mockRejectedValueOnce(new Error('denied'));
    document.execCommand = vi.fn().mockReturnValue(false);
    await userEvent.click(screen.getByRole('button', { name: 'Share search' }));
    const field = screen.getByLabelText(/Copy this link/) as HTMLInputElement;
    expect(field.value).toContain('?for=sale');
  });
});

describe('suitability filters in the drawer', () => {
  it('filters by couples and teachers, shows chips, and clears them when leaving Rent', async () => {
    render(<App />);
    await userEvent.click(screen.getAllByRole('radio', { name: 'Rent' })[0]);
    const rentCount = resultCount();
    const drawer = await openDrawer();
    expect(within(drawer).getByText(/never need to share your own details/)).toBeTruthy();
    await userEvent.click(within(drawer).getByLabelText('Couples welcome (incl. newlyweds)'));
    await userEvent.click(within(drawer).getByRole('button', { name: 'Teachers' }));
    await userEvent.click(within(drawer).getByRole('radio', { name: 'Not required' }));
    const n = resultCount();
    expect(n).toBeLessThan(rentCount);
    expect(cards()).toHaveLength(n);
    expect(markers()).toHaveLength(n);
    await userEvent.click(within(drawer).getByRole('button', { name: /^Show \d+ results?/ }));
    for (const chip of ['Couples welcome', 'Welcomes teachers', 'No income check']) {
      expect(screen.getByRole('button', { name: `Remove filter: ${chip}` })).toBeTruthy();
    }
    expect(window.location.search).toContain('couples=1');

    await userEvent.click(screen.getAllByRole('radio', { name: 'Buy' })[0]);
    expect(screen.queryByRole('button', { name: 'Remove filter: Couples welcome' })).toBeNull();
    expect(window.location.search).toBe('?for=sale');
  }, 20_000);
});
