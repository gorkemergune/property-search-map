// @vitest-environment jsdom
import '../test/dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { Header } from './Header';
it('scrolls three cities with mouse buttons, disables at the edges and reveals restored cities', () => {
  const cities = Array.from({ length: 12 }, (_, i) => `City ${i}`);
  const props = { cities, city: 'all', onCityChange: vi.fn(), savedCount: 0, onOpenSaved: vi.fn() };
  const { rerender } = render(<Header {...props} />);
  const strip = document.getElementById('city-tabs')!;
  Object.defineProperties(strip, { scrollWidth: { value: 1040 }, clientWidth: { value: 240 } });
  [...strip.children].forEach((item, i) => Object.defineProperties(item, { offsetLeft: { value: i * 80 }, offsetWidth: { value: 80 } }));
  strip.scrollTo = vi.fn(({ left }: ScrollToOptions) => { strip.scrollLeft = Math.max(0, Math.min(800, left ?? 0)); fireEvent.scroll(strip); }) as HTMLElement['scrollTo'];
  fireEvent.scroll(strip);
  expect((screen.getByRole('button', { name: 'Show previous cities' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Show more cities' }));
  expect(strip.scrollLeft).toBe(236);
  expect((screen.getByRole('button', { name: 'Show previous cities' }) as HTMLButtonElement).disabled).toBe(false);
  rerender(<Header {...props} city="City 11" />);
  expect(strip.scrollLeft).toBe(800);
  expect((screen.getByRole('button', { name: 'Show more cities' }) as HTMLButtonElement).disabled).toBe(true);
});
