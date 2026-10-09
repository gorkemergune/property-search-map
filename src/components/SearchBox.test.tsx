// @vitest-environment jsdom
import '../test/dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { properties } from '../data/properties';
import { DEFAULT_FILTERS, buildCityIndex, updateFilters, type Filters } from '../lib/filters';
import { SearchBox } from './SearchBox';

const CITY_INDEX = buildCityIndex(properties);
const options = () => screen.queryAllByRole('option');

function Harness({ initial = DEFAULT_FILTERS, onFilters = () => {}, onOpenListing = () => {} }: {
  initial?: Filters;
  onFilters?: (f: Filters) => void;
  onOpenListing?: (id: string) => void;
}) {
  const [filters, setFilters] = useState(initial);
  return (
    <SearchBox
      properties={properties}
      filters={filters}
      cityCountry={CITY_INDEX}
      onChange={(patch) =>
        setFilters((prev) => {
          const next = updateFilters(prev, patch, CITY_INDEX);
          onFilters(next);
          return next;
        })
      }
      onOpenListing={onOpenListing}
    />
  );
}

describe('SearchBox', () => {
  it('suggests "Did you mean New York?" for a typo, with the real count', async () => {
    render(<Harness />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Search listings' }), 'New Yrok');
    const option = options().find((o) => o.textContent?.startsWith('Did you mean New York?'));
    expect(option?.textContent).toContain('12 homes');
    // Listing rows show their own title, never a "Did you mean" prefix.
    expect(options().filter((o) => o.textContent?.startsWith('Did you mean'))).toHaveLength(1);
  });

  it('moves through suggestions with the arrow keys and applies one with Enter', async () => {
    const onFilters = vi.fn();
    render(<Harness onFilters={onFilters} />);
    const input = screen.getByRole('combobox', { name: 'Search listings' });
    await userEvent.type(input, 'new yrok');
    // First option is "Search for …", the second is the New York city suggestion.
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    const active = document.getElementById(input.getAttribute('aria-activedescendant')!);
    expect(active!.textContent).toContain('New York');
    await userEvent.keyboard('{Enter}');
    const last = onFilters.mock.calls.at(-1)![0] as Filters;
    expect(last).toMatchObject({ city: 'New York', country: 'US', query: '' });
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps other filters when a suggestion is applied', async () => {
    const onFilters = vi.fn();
    const rent = updateFilters(DEFAULT_FILTERS, { pricePeriod: 'monthly', minBedrooms: 1 }, CITY_INDEX);
    render(<Harness initial={rent} onFilters={onFilters} />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Search listings' }), 'istanbul');
    await userEvent.click(options().find((o) => o.textContent?.startsWith('Istanbul'))!);
    expect(onFilters.mock.calls.at(-1)![0]).toMatchObject({ city: 'Istanbul', pricePeriod: 'monthly', minBedrooms: 1 });
  });

  it('closes the list with Escape and keeps the typed text', async () => {
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: 'Search listings' });
    await userEvent.type(input, 'London');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    await userEvent.keyboard('{Escape}');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect((input as HTMLInputElement).value).toBe('London');
  });

  it('matches Turkish characters typed without diacritics', async () => {
    render(<Harness />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Search listings' }), 'kadikoy');
    expect(options().some((o) => o.textContent?.startsWith('Kadıköy'))).toBe(true);
  });

  it('opens a listing suggestion and shows its price and place', async () => {
    const onOpenListing = vi.fn();
    render(<Harness onOpenListing={onOpenListing} />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Search listings' }), 'brickell');
    const listing = screen.getAllByRole('option').find((o) => o.textContent?.includes('Brickell, Miami') && o.textContent.includes('$'));
    expect(listing).toBeDefined();
    await userEvent.click(listing!);
    expect(onOpenListing).toHaveBeenCalledWith(expect.stringMatching(/^us-mia-0[12]$/));
  });

  it('clears the query with the clear button', async () => {
    const onFilters = vi.fn();
    render(<Harness onFilters={onFilters} />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Search listings' }), 'miami');
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onFilters.mock.calls.at(-1)![0].query).toBe('');
    expect((screen.getByRole('combobox', { name: 'Search listings' }) as HTMLInputElement).value).toBe('');
  });

  it('says nothing matches only when the keyword finds no homes (regression)', async () => {
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: 'Search listings' });
    await userEvent.type(input, 'paris');
    expect(screen.queryByText('No matching places or listings')).not.toBeNull();
    await userEvent.clear(input);
    await userEvent.type(input, 'for rent');
    expect(options()[0].textContent).toContain('37 homes');
    expect(screen.queryByText('No matching places or listings')).toBeNull();
  });
});
