/** A group of items close together on screen, positioned at their mean pixel point. */
export interface Cluster<T> {
  items: T[];
  x: number;
  y: number;
}

/**
 * Greedy screen-space clustering: each not-yet-grouped item, in input order,
 * gathers every other free item within `radiusPx` of it. Deterministic for a
 * given order and zoom, and cheap for a few hundred points.
 */
export function clusterByDistance<T>(items: readonly T[], project: (item: T) => { x: number; y: number }, radiusPx: number): Cluster<T>[] {
  const points = items.map(project);
  const taken = new Uint8Array(items.length);
  const r2 = radiusPx * radiusPx;
  const clusters: Cluster<T>[] = [];
  for (let i = 0; i < items.length; i++) {
    if (taken[i]) continue;
    taken[i] = 1;
    const members = [i];
    for (let j = i + 1; j < items.length; j++) {
      if (taken[j]) continue;
      const dx = points[j].x - points[i].x;
      const dy = points[j].y - points[i].y;
      if (dx * dx + dy * dy <= r2) {
        taken[j] = 1;
        members.push(j);
      }
    }
    clusters.push({
      items: members.map((k) => items[k]),
      x: members.reduce((s, k) => s + points[k].x, 0) / members.length,
      y: members.reduce((s, k) => s + points[k].y, 0) / members.length,
    });
  }
  return clusters;
}
