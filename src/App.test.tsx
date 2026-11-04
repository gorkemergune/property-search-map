// @vitest-environment jsdom
import './test/dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const cards = () => [...document.querySelectorAll<HTMLElement>('article[id^="card-"]')];
const markers = () => document.querySelectorAll('.leaflet-marker-icon');
const search = async (text: string) => {
  const box = screen.getAllByRole('textbox', { name: 'Describe the home you want' })[0];
  await userEvent.clear(box);
  await userEvent.type(box, `${text}{Enter}`);
};

beforeEach(() => {
  // Live sources (postcodes.io, OpenStreetMap) are not reachable in tests; the UI must cope.
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
});

describe('App', { timeout: 30_000 }, () => {
  it('opens on the discover page with a large search box, example searches and cities', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/What kind of home/);
    expect(screen.getByRole('textbox', { name: 'Describe the home you want' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Near the Tube/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /London/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Manchester/ })).toBeTruthy();
    expect(cards().length).toBeGreaterThan(0); // trending carousel
  });

  it('turns a sentence into filters plus ranked, explained results that match the map', async () => {
    render(<App />);
    await search('2 bed flat to rent near a hospital and a GP, step free');
    expect(window.location.search).toContain('q=');
    expect(window.location.search).toContain('for=rent');
    const understood = screen.getByLabelText('What we understood');
    for (const label of ['For rent', 'Near a hospital', 'Near a GP', 'Step-free']) expect(within(understood).getByText(label)).toBeTruthy();
    expect(cards().length).toBeGreaterThan(0);
    expect(markers()).toHaveLength(cards().length);
    expect(within(cards()[0]).getByText('Why it matched?')).toBeTruthy();
    expect(cards()[0].textContent).toMatch(/matches all 3 things you asked for/);
  });

  it('removes a criterion chip from the sentence', async () => {
    render(<App />);
    await search('flat in Leeds near a park with a balcony');
    await userEvent.click(screen.getByRole('button', { name: 'Remove Balcony / terrace' }));
    expect(new URLSearchParams(window.location.search).get('q')).not.toMatch(/balcony/);
  });

  it('suggests relaxations with counts when nothing matches', async () => {
    render(<App />);
    await search('2 bed flat in Hackney near the tube with a garden under £2,500 pcm');
    expect(screen.getByText(/No home ticks every box yet/)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Close matches' })).toBeTruthy();
  });

  it('shows AI summary, nearby schools/hospitals, popularity and local voices in details', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Manchester/ }));
    await userEvent.click(within(cards()[0]).getByRole('button', { name: /^View details/ }));
    const dialog = screen.getByRole('dialog');
    for (const heading of ['AI summary', "What's nearby", 'Popularity']) expect(within(dialog).getByText(heading)).toBeTruthy();
    expect(within(dialog).getByText(/What locals say about/)).toBeTruthy();
    expect(within(dialog).getByText('Hospital (A&E)')).toBeTruthy();
    expect(await within(dialog).findByText(/Live sources did not answer/)).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('learns from saved homes: common traits in the basket and recommendations on the home page', async () => {
    render(<App />);
    await search('2 bed flat to rent in London');
    for (const card of cards().slice(0, 3)) await userEvent.click(within(card).getByRole('button', { name: /^Save:/ }));
    expect(screen.getByRole('button', { name: /Saved\s*3/ })).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: /Saved\s*3/ }));
    const basket = screen.getByRole('dialog');
    expect(within(basket).getByText('What your saved homes have in common')).toBeTruthy();
    expect(within(basket).getByText('In London')).toBeTruthy();
    expect(within(basket).getByText('You might also like')).toBeTruthy();
    await userEvent.keyboard('{Escape}');

    await userEvent.click(screen.getByRole('button', { name: 'evara home' }));
    expect(screen.getByRole('heading', { name: 'Recommended for you' })).toBeTruthy();
  });

  it('restores a search from a shared link and keeps the filter drawer working', async () => {
    window.history.replaceState(null, '', '/?q=student+house+near+university&city=Leeds');
    render(<App />);
    expect(screen.getByText('“student house near university”')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeTruthy();
  });
});
