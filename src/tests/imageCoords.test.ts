/**
 * Testi preslikave klika v koordinate izvorne fotografije (object-contain).
 */

import { describe, expect, it } from 'vitest';
import { displayPointToImage } from '../utils/imageCoords';

describe('displayPointToImage', () => {
  it('preslika točko pri enakem razmerju', () => {
    const p = displayPointToImage(100, 50, { left: 0, top: 0, width: 200, height: 100 }, 1000, 500);
    expect(p).toEqual({ x: 500, y: 250 });
  });

  it('upošteva navpične prazne robove (širša slika)', () => {
    // okvir 200×200, slika 1000×500 → narisano 200×100, offsetY = 50
    const p = displayPointToImage(100, 100, { left: 0, top: 0, width: 200, height: 200 }, 1000, 500);
    expect(p.x).toBeCloseTo(500);
    expect(p.y).toBeCloseTo(250);
  });

  it('upošteva vodoravne prazne robove (višja slika)', () => {
    // okvir 200×200, slika 500×1000 → narisano 100×200, offsetX = 50
    const p = displayPointToImage(50, 100, { left: 0, top: 0, width: 200, height: 200 }, 500, 1000);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(500);
  });

  it('upošteva odmik elementa na strani', () => {
    const p = displayPointToImage(150, 120, { left: 100, top: 20, width: 200, height: 200 }, 1000, 1000);
    expect(p).toEqual({ x: 250, y: 500 });
  });

  it('omeji točke zunaj slike', () => {
    const p = displayPointToImage(-50, 500, { left: 0, top: 0, width: 100, height: 100 }, 500, 500);
    expect(p).toEqual({ x: 0, y: 499 });
  });
});
