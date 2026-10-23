import { expect, it } from 'vitest';
import { clusterByDistance } from './cluster';
it('clusters nearby homes without losing or duplicating members', () => {
  const points = [{ id: 1, x: 0, y: 0 }, { id: 2, x: 4, y: 3 }, { id: 3, x: 100, y: 100 }];
  const groups = clusterByDistance(points, (p) => p, 10);
  expect(groups.map((g) => g.items.length)).toEqual([2, 1]);
  expect(groups.flatMap((g) => g.items.map((p) => p.id))).toEqual([1, 2, 3]);
  expect(groups[0].x).toBe(2);
  expect(clusterByDistance([], (p: { x: number; y: number }) => p, 10)).toEqual([]);
});
