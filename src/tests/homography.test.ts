/**
 * FAZA 8 (P1) — regresijski testi homografije in RANSAC.
 *
 * Pred popravki je estimateHomography VRAČAL NULL za vsak nabor z realnim šumom
 * (napaka značilnic ~0,5 px), RANSAC pa je bil odvisen od Math.random, zato so
 * bili testi občasno neuspešni. Zdaj: relativni ostanek, validacija s
 * reprojekcijo in deterministični (seed) generator.
 */
import { describe, it, expect } from 'vitest';
import { estimateHomography, ransacHomography, type Point2D } from '../utils/cv';

function applyHomography(H: number[], x: number, y: number): { x: number; y: number } | null {
  const w = H[6] * x + H[7] * y + H[8];
  if (Math.abs(w) < 1e-10) return null;
  return {
    x: (H[0] * x + H[1] * y + H[2]) / w,
    y: (H[3] * x + H[4] * y + H[5]) / w,
  };
}

function maxReprojectionError(src: Point2D[], dst: Point2D[], H: number[]): number {
  let max = 0;
  for (let i = 0; i < src.length; i++) {
    const p = applyHomography(H, src[i].x, src[i].y);
    if (!p) return Infinity;
    max = Math.max(max, Math.hypot(p.x - dst[i].x, p.y - dst[i].y));
  }
  return max;
}

const SQUARE_SRC: Point2D[] = [
  { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 },
];

describe('estimateHomography', () => {
  it('natančna translacija: model je natančen (RMSE ~ 0)', () => {
    const dst = SQUARE_SRC.map(p => ({ x: p.x + 15, y: p.y + 25 }));
    const result = estimateHomography(SQUARE_SRC, dst);

    expect(result).not.toBeNull();
    expect(result!.rmse).toBeLessThan(1e-6);
    expect(maxReprojectionError(SQUARE_SRC, dst, result!.matrix)).toBeLessThan(1e-6);
  });

  it('FAZA 8: nabor 7 točk z realnim šumom (~0,5 px) NE SME biti zavrnjen', () => {
    // To je bil ključni bug: absolutni prag ostanka 1e-6 je zavrnil vsak šumni
    // nabor, zato se homografija na realnih fotografijah sploh ni izračunala.
    const src: Point2D[] = [
      { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 },
      { x: 50, y: 50 }, { x: 25, y: 75 }, { x: 75, y: 25 },
    ];
    const noise = 0.5;
    const dst = src.map((p, i) => ({
      x: p.x + 15 + (i % 2 === 0 ? noise : -noise),
      y: p.y + 25 + (i % 3 === 0 ? noise : -noise),
    }));

    const result = estimateHomography(src, dst);

    expect(result).not.toBeNull();
    expect(result!.rmse).toBeLessThan(2);
    expect(result!.inliers.filter(Boolean).length).toBe(src.length);
  });

  it('kolinearne točke so degenerirane -> null', () => {
    const collinear: Point2D[] = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 },
    ];
    expect(estimateHomography(collinear, collinear.map(p => ({ ...p })))).toBeNull();
  });

  it('premalo točk (< 4) -> null', () => {
    expect(estimateHomography(
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
    )).toBeNull();
    expect(estimateHomography([], [])).toBeNull();
  });

  it('perspektivna transformacija: reprojekcijska napaka < 0,5 px', () => {
    const src: Point2D[] = [
      { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 },
    ];
    const dst: Point2D[] = [
      { x: 10, y: 5 }, { x: 110, y: 0 }, { x: 105, y: 95 }, { x: 5, y: 100 },
    ];
    const result = estimateHomography(src, dst);
    expect(result).not.toBeNull();
    expect(maxReprojectionError(src, dst, result!.matrix)).toBeLessThan(0.5);
  });
});

describe('ransacHomography', () => {
  const src: Point2D[] = [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 },
    { x: 50, y: 50 }, { x: 25, y: 75 }, { x: 75, y: 25 }, { x: 50, y: 0 },
  ];
  // točke 5, 6, 7 so napačna ujemanja (outlierji)
  const dst: Point2D[] = [
    { x: 15, y: 25 }, { x: 115, y: 25 }, { x: 115, y: 125 }, { x: 15, y: 125 },
    { x: 65, y: 75 }, { x: 200, y: 200 }, { x: 300, y: 300 }, { x: 500, y: 500 },
  ];
  const trueInliers = [true, true, true, true, true, false, false, false];

  it('najde prave inlierje in zavrne napačna ujemanja', () => {
    const result = ransacHomography(src, dst, 500, 5.0, 12345);

    expect(result).not.toBeNull();
    expect(result!.inlierCount).toBe(5);
    expect(result!.inliers.slice(0, 5).every(Boolean)).toBe(true);
    expect(result!.inliers[5]).toBe(false);
    expect(result!.inliers[6]).toBe(false);
    expect(result!.inliers[7]).toBe(false);
    expect(result!.rmse).toBeLessThan(5);
  });

  it('je DETERMINISTičen: isti seed da vedno isti rezultat', () => {
    const a = ransacHomography(src, dst, 500, 5.0, 777);
    const b = ransacHomography(src, dst, 500, 5.0, 777);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a!.matrix).toEqual(b!.matrix);
    expect(a!.inliers).toEqual(b!.inliers);
    expect(a!.rmse).toBe(b!.rmse);
  });

  it('je robusten na različne seede: večina tekem najde prave inlierje', () => {
    let correct = 0;
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
    for (const seed of seeds) {
      const r = ransacHomography(src, dst, 500, 5.0, seed);
      if (r && r.inlierCount === 5 && r.inliers.every((v, i) => v === trueInliers[i])) correct++;
    }
    expect(correct).toBeGreaterThanOrEqual(seeds.length - 1); // vsaj 7/8
  });

  it('neenako število src/dst točk -> null (varne podatke zavrne)', () => {
    expect(ransacHomography(src, dst.slice(0, 5), 200, 5.0)).toBeNull();
  });

  it('premalo točk -> null', () => {
    expect(ransacHomography(src.slice(0, 3), dst.slice(0, 3), 200, 5.0)).toBeNull();
  });

  it('na podatku brez outlierjev so vsi točke inlierji', () => {
    const clean = src.slice(0, 6).map(p => ({ x: p.x + 10, y: p.y + 5 }));
    const r = ransacHomography(src.slice(0, 6), clean, 200, 3.0, 99);
    expect(r).not.toBeNull();
    expect(r!.inlierCount).toBe(6);
    expect(r!.rmse).toBeLessThan(1e-6);
  });
});
