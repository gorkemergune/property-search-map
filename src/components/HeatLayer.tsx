import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import type { HeatPoint } from '../lib/heat';

export interface HeatStyle {
  /** Colour stops from faint to intense, as [offset 0–1, CSS colour]. */
  stops: readonly [number, string][];
  /** Blur radius in metres on the ground; converted to pixels per zoom level (clamped). */
  radiusMeters: number;
  /** Opacity one point of weight 1 contributes at its centre. */
  intensity: number;
}

/**
 * A small canvas heat layer: each point is drawn as a soft grey blob, overlapping
 * blobs add up, and the summed alpha is mapped onto a colour ramp. No plugin is
 * needed for a few hundred points. Canvas-less environments (jsdom) draw nothing.
 */
class HeatCanvas extends L.Layer {
  private canvas: HTMLCanvasElement = L.DomUtil.create('canvas', 'heat-layer leaflet-zoom-hide');
  private target: L.Map | null = null;
  private points: HeatPoint[] = [];
  private style: HeatStyle | null = null;
  private ramp: Uint8ClampedArray | null = null;

  setData(points: HeatPoint[], style: HeatStyle) {
    if (style !== this.style) this.ramp = buildRamp(style.stops);
    this.points = points;
    this.style = style;
    this.redraw();
  }

  onAdd(map: L.Map) {
    this.target = map;
    map.getPanes().overlayPane.appendChild(this.canvas);
    map.on('moveend zoomend resize viewreset', this.redraw, this);
    this.redraw();
    return this;
  }

  onRemove(map: L.Map) {
    map.off('moveend zoomend resize viewreset', this.redraw, this);
    this.canvas.remove();
    this.target = null;
    return this;
  }

  private redraw() {
    const map = this.target;
    const style = this.style;
    if (!map || !style) return;
    const size = map.getSize();
    const canvas = this.canvas;
    canvas.width = size.x;
    canvas.height = size.y;
    canvas.style.width = `${size.x}px`;
    canvas.style.height = `${size.y}px`;
    L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]));
    const ctx = getContext(canvas);
    if (!ctx || !this.ramp || size.x === 0 || size.y === 0) return;
    ctx.clearRect(0, 0, size.x, size.y);

    const centre = map.getCenter();
    const metresPerDegree = 111_320 * Math.cos((centre.lat * Math.PI) / 180);
    const a = map.latLngToContainerPoint(centre);
    const b = map.latLngToContainerPoint([centre.lat, centre.lng + style.radiusMeters / metresPerDegree]);
    const r = Math.max(24, Math.min(110, Math.abs(b.x - a.x)));

    for (const p of this.points) {
      const pt = map.latLngToContainerPoint([p.lat, p.lng]);
      if (pt.x < -r || pt.y < -r || pt.x > size.x + r || pt.y > size.y + r) continue;
      const g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r);
      g.addColorStop(0, `rgba(0,0,0,${Math.min(1, style.intensity * p.weight)})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(pt.x - r, pt.y - r, r * 2, r * 2);
    }

    const image = ctx.getImageData(0, 0, size.x, size.y);
    const data = image.data;
    const ramp = this.ramp;
    for (let i = 3; i < data.length; i += 4) {
      const alpha = data[i];
      if (alpha === 0) continue;
      const j = alpha * 4;
      data[i - 3] = ramp[j];
      data[i - 2] = ramp[j + 1];
      data[i - 1] = ramp[j + 2];
      data[i] = Math.min(220, ramp[j + 3]);
    }
    ctx.putImageData(image, 0, 0);
  }
}

function getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  try {
    return canvas.getContext('2d', { willReadFrequently: true });
  } catch {
    return null;
  }
}

/** 256 RGBA entries sampled from the colour stops; entry `n` colours summed alpha `n`. */
function buildRamp(stops: HeatStyle['stops']): Uint8ClampedArray | null {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1;
  const ctx = getContext(canvas);
  if (!ctx) return null;
  const gradient = ctx.createLinearGradient(0, 0, 256, 0);
  for (const [offset, colour] of stops) gradient.addColorStop(offset, colour);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 1);
  return ctx.getImageData(0, 0, 256, 1).data;
}

/** Draws `points` under the markers. Mount it only while a heat mode is on. */
export function HeatLayer({ points, style }: { points: HeatPoint[]; style: HeatStyle }) {
  const map = useMap();
  const layer = useRef<HeatCanvas | null>(null);

  useEffect(() => {
    const heat = new HeatCanvas();
    heat.addTo(map);
    layer.current = heat;
    return () => {
      heat.remove();
      layer.current = null;
    };
  }, [map]);

  useEffect(() => {
    layer.current?.setData(points, style);
  }, [points, style]);

  return null;
}
