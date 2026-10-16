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
  it('suggests "Did you mean London?" for a typo, with the real count', async () => {
    render(<Harness />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Search listings' }), 'Lonndon');
    const option = options().find((o) => o.textContent?.startsWith('Did you mean London?'));
    expect(option?.textContent).toContain('120 homes');
    expect(options().filter((o) => o.textContent?.startsWith('Did you mean'))).toHaveLength(1);
  });

  it('moves through suggestions with the arrow keys and applies one with Enter', async () => {
    const onFilters = vi.fn();
    render(<Harness onFilters={onFilters} />);
    const input = screen.getByRole('combobox', { name: 'Search listings' });
    await userEvent.type(input, 'lonndon');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    const active = document.getElementById(input.getAttribute('aria-activedescendant')!);
    expect(active!.textContent).toContain('London');
    await userEvent.keyboard('{Enter}');
    const last = onFilters.mock.calls.at(-1)![0] as Filters;
    expect(last).toMatchObject({ city: 'London', country: 'GB', query: '' });
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps other filters when a suggestion is applied', async () => {
    const onFilters = vi.fn();
    const rent = updateFilters(DEFAULT_FILTERS, { pricePeriod: 'monthly', minBedrooms: 1 }, CITY_INDEX);
    render(<Harness initial={rent} onFilters={onFilters} />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Search listings' }), 'manchester');
    await userEvent.click(options().find((o) => o.textContent?.startsWith('Manchester'))!);
    expect(onFilters.mock.calls.at(-1)![0]).toMatchObject({ city: 'Manchester', pricePeriod: 'monthly', minBedrooms: 1 });
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

  it('matches UK place names typed with different casing', async () => {
    render(<Harness />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Search listings' }), 'shoreditch');
    expect(options().some((o) => o.textContent?.startsWith('Shoreditch'))).toBe(true);
  });

  it('opens a listing suggestion and shows its price and place', async () => {
    const onOpenListing = vi.fn();
    render(<Harness onOpenListing={onOpenListing} />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Search listings' }), 'shoreditch');
    const listing = screen.getAllByRole('option').find((o) => o.textContent?.includes('Shoreditch, London') && o.textContent.includes('£'));
    expect(listing).toBeDefined();
    await userEvent.click(listing!);
    expect(onOpenListing).toHaveBeenCalledWith(expect.stringMatching(/^gb-lon-\d{3}$/));
  });

  it('clears the query with the clear button', async () => {
    const onFilters = vi.fn();
    render(<Harness onFilters={onFilters} />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Search listings' }), 'bristol');
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
    // "for rent" matches rental listings; exact count depends on dataset but should be > 0.
    expect(options()[0].textContent).toMatch(/\d+ homes?/);
    expect(screen.queryByText('No matching places or listings')).toBeNull();
  });
});
