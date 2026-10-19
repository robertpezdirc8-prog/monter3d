/**
 * fenceVisualization.ts — geometrija za fotomontažo ograje.
 *
 * Ograjo rišemo v štirikotnik, ki ga uporabnik označi s štirimi vogali
 * (zgoraj levo, zgoraj desno, spodaj desno, spodaj levo). Deske razdelimo
 * po širini (pokončno) ali višini (prečno), tako da prikaz sledi poševnim
 * robovom fotografije.
 *
 * Če je merilo kalibrirano (px/m), se zgornji rob izračuna iz želene višine
 * ograje; sicer ostane pri označenem zgornjem robu, deske pa se razporedijo
 * glede na ocenjeno merilo iz označenega območja.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Quad {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

export interface FenceViewParams {
  orientation: 'vertical' | 'horizontal';
  /** Vidna širina deske v mm (prečno merjenje). */
  boardWidthMm: number;
  /** Razmak med deskami v mm. */
  gapMm: number;
  /** Višina ograje v mm. */
  heightMm: number;
}

function lerp(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t
  };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Vrne zgornji rob ograje. Ob kalibraciji se višina prilagodi glede na
 * razmerje med želeno in označeno višino (ohrani poševnost roba).
 */
export function resolveFenceTop(
  corners: [Point, Point, Point, Point],
  heightMm: number,
  pxPerMeter: number | null
): { topLeft: Point; topRight: Point } {
  const [topLeft, topRight, bottomRight, bottomLeft] = corners;

  if (!pxPerMeter || pxPerMeter <= 0) {
    return { topLeft, topRight };
  }

  const desiredPx = (heightMm / 1000) * pxPerMeter;
  const markedLeft = Math.abs(bottomLeft.y - topLeft.y);
  const markedRight = Math.abs(bottomRight.y - topRight.y);
  const markedAverage = (markedLeft + markedRight) / 2;

  if (markedAverage > 0) {
    const factor = desiredPx / markedAverage;
    return {
      topLeft: { x: topLeft.x, y: bottomLeft.y - markedLeft * factor },
      topRight: { x: topRight.x, y: bottomRight.y - markedRight * factor }
    };
  }

  return {
    topLeft: { x: bottomLeft.x, y: bottomLeft.y - desiredPx },
    topRight: { x: bottomRight.x, y: bottomRight.y - desiredPx }
  };
}

/**
 * Razdeli označeno območje na štirikotnike posameznih desk.
 * Vrne največ 300 desk (zaščita pred nesmiselnimi vrednostmi).
 */
export function buildFenceQuads(
  corners: [Point, Point, Point, Point],
  params: FenceViewParams,
  pxPerMeter: number | null
): Quad[] {
  const [markedTopLeft, markedTopRight, bottomRight, bottomLeft] = corners;
  const { topLeft, topRight } = resolveFenceTop(corners, params.heightMm, pxPerMeter);

  const markedLeft = Math.abs(bottomLeft.y - markedTopLeft.y);
  const markedRight = Math.abs(bottomRight.y - markedTopRight.y);
  const markedAverage = (markedLeft + markedRight) / 2;
  const fallbackScale =
    markedAverage > 0 ? markedAverage / Math.max(0.2, params.heightMm / 1000) : 0;
  const scale = pxPerMeter && pxPerMeter > 0 ? pxPerMeter : fallbackScale;

  if (scale <= 0) return [];

  const pitchMm = Math.max(1, params.boardWidthMm + params.gapMm);
  const boardMm = Math.max(1, params.boardWidthMm);

  if (params.orientation === 'vertical') {
    const bottomLength = distance(bottomLeft, bottomRight);
    if (bottomLength <= 0) return [];

    const pitchU = ((pitchMm / 1000) * scale) / bottomLength;
    const boardU = ((boardMm / 1000) * scale) / bottomLength;
    if (!isFinite(pitchU) || pitchU <= 0) return [];

    const count = Math.min(300, Math.max(1, Math.floor(1 / pitchU)));
    const quads: Quad[] = [];

    for (let i = 0; i < count; i++) {
      const u0 = i * pitchU;
      const u1 = Math.min(1, u0 + boardU);
      if (u1 <= u0) continue;

      quads.push({
        topLeft: lerp(topLeft, topRight, u0),
        topRight: lerp(topLeft, topRight, u1),
        bottomRight: lerp(bottomLeft, bottomRight, u1),
        bottomLeft: lerp(bottomLeft, bottomRight, u0)
      });
    }

    return quads;
  }

  const averageHeight = (distance(topLeft, bottomLeft) + distance(topRight, bottomRight)) / 2;
  if (averageHeight <= 0) return [];

  const pitchV = ((pitchMm / 1000) * scale) / averageHeight;
  const boardV = ((boardMm / 1000) * scale) / averageHeight;
  if (!isFinite(pitchV) || pitchV <= 0) return [];

  const count = Math.min(300, Math.max(1, Math.floor(1 / pitchV)));
  const quads: Quad[] = [];

  for (let i = 0; i < count; i++) {
    const v0 = i * pitchV;
    const v1 = Math.min(1, v0 + boardV);
    if (v1 <= v0) continue;

    quads.push({
      topLeft: lerp(topLeft, bottomLeft, v0),
      topRight: lerp(topRight, bottomRight, v0),
      bottomRight: lerp(topRight, bottomRight, v1),
      bottomLeft: lerp(topLeft, bottomLeft, v1)
    });
  }

  return quads;
}
