/**
 * Testi geometrije fotomontaže ograje (višina, perspektiva, razpored desk).
 */

import { describe, expect, it } from 'vitest';
import { buildFenceQuads, resolveFenceTop, type Point } from '../utils/fenceVisualization';

const square: [Point, Point, Point, Point] = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 }
];

const params = {
  orientation: 'vertical' as const,
  boardWidthMm: 100,
  gapMm: 0,
  heightMm: 1000
};

describe('resolveFenceTop', () => {
  it('brez merila ohrani označeni zgornji rob', () => {
    const top = resolveFenceTop(square, 1000, null);
    expect(top.topLeft).toEqual({ x: 0, y: 0 });
    expect(top.topRight).toEqual({ x: 100, y: 0 });
  });

  it('z merilom izračuna zgornji rob iz višine', () => {
    const top = resolveFenceTop(square, 1000, 100);
    expect(top.topLeft.y).toBeCloseTo(0);
    expect(top.topRight.y).toBeCloseTo(0);
  });

  it('višja ograja sega nad označeni rob', () => {
    const top = resolveFenceTop(square, 2000, 100);
    expect(top.topLeft.y).toBeCloseTo(-100);
    expect(top.topRight.y).toBeCloseTo(-100);
  });

  it('ohrani poševni zgornji rob', () => {
    const slanted: [Point, Point, Point, Point] = [
      { x: 0, y: 20 },
      { x: 100, y: 10 },
      { x: 100, y: 110 },
      { x: 0, y: 120 }
    ];
    const top = resolveFenceTop(slanted, 1000, 100);
    expect(top.topLeft.y).toBeCloseTo(20);
    expect(top.topRight.y).toBeCloseTo(10);
  });
});

describe('buildFenceQuads', () => {
  it('pokončne deske enakomerne širine', () => {
    const quads = buildFenceQuads(square, params, 100);
    expect(quads).toHaveLength(10);
    expect(quads[0].topLeft).toEqual({ x: 0, y: 0 });
    expect(quads[0].topRight.x).toBeCloseTo(10);
    expect(quads[0].bottomLeft).toEqual({ x: 0, y: 100 });
    expect(quads[9].bottomRight.x).toBeCloseTo(100);
  });

  it('upošteva razmak med deskami', () => {
    const quads = buildFenceQuads(square, { ...params, gapMm: 100 }, 100);
    expect(quads).toHaveLength(5);
    expect(quads[1].bottomLeft.x).toBeCloseTo(20);
  });

  it('višina vpliva na dolžino desk', () => {
    const quads = buildFenceQuads(square, { ...params, heightMm: 500 }, 100);
    expect(quads[0].topLeft.y).toBeCloseTo(50);
    expect(quads[0].bottomLeft.y).toBeCloseTo(100);
  });

  it('brez merila uporabi oceno iz označenega območja', () => {
    const quads = buildFenceQuads(square, params, null);
    // označena višina 100 px za 1000 mm → 100 px/m; deska 100 mm → 10 px
    expect(quads).toHaveLength(10);
    expect(quads[0].topRight.x).toBeCloseTo(10);
  });

  it('prečne deske se zlagajo po višini', () => {
    const quads = buildFenceQuads(
      square,
      { ...params, orientation: 'horizontal' },
      100
    );
    expect(quads).toHaveLength(10);
    expect(quads[0].topLeft.y).toBeCloseTo(0);
    expect(quads[0].bottomLeft.y).toBeCloseTo(10);
    expect(quads[0].topRight.x).toBeCloseTo(100);
  });

  it('prečne deske upoštevajo razmak', () => {
    const quads = buildFenceQuads(
      square,
      { ...params, orientation: 'horizontal', gapMm: 100 },
      100
    );
    expect(quads).toHaveLength(5);
    expect(quads[1].topLeft.y).toBeCloseTo(20);
  });

  it('pri ničelni širini vrne prazen seznam', () => {
    const flat: [Point, Point, Point, Point] = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { x: 0, y: 100 }
    ];
    expect(buildFenceQuads(flat, params, 100)).toEqual([]);
  });
});
