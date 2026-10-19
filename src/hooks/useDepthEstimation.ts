/**
 * useDepthEstimation.ts — ocena relativne globine v brskalniku
 *
 * Model: onnx-community/depth-anything-v2-small (Apache 2.0, ~26 MB kvantiziran)
 * prek Transformers.js. Vse deluje lokalno — brez strežnika in brez API klicev.
 * Model se prenese enkrat in ostane v brskalniškem cacheu.
 *
 * Rezultat je RELATIVNA globina (0 = najdlje, 100 = najbližje), ne meritve v cm.
 * Za absolutne razdalje bi bila potrebna kalibracija s kamero in referenco.
 */

import { useCallback, useRef, useState } from 'react';

export type DepthStatus = 'idle' | 'loading' | 'running' | 'ready' | 'error';

export interface DepthResult {
  /** Toplotna karta globine (PNG data URL) v velikosti izvorne slike. */
  heatmapDataUrl: string;
  width: number;
  height: number;
}

interface DepthMap {
  data: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
}

let gPipeline: any = null;
let gLoadPromise: Promise<any> | null = null;

async function getPipeline(): Promise<any> {
  if (gPipeline) return gPipeline;
  if (!gLoadPromise) {
    gLoadPromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers');
      const p = await pipeline(
        'depth-estimation',
        'onnx-community/depth-anything-v2-small',
        { dtype: 'q8' } as any
      );
      gPipeline = p;
      return p;
    })();
  }
  return gLoadPromise;
}

/**
 * Pretvori enokanalno globinsko karto v barvno toplotno karto:
 * modra = dlje, rdeča = bližje.
 */
function colorizeDepth(raw: {
  data: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
}): string {
  const { width, height } = raw;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const image = ctx.createImageData(width, height);
  const pixels = width * height;
  const stride = Math.max(1, Math.round(raw.data.length / pixels));

  for (let i = 0; i < pixels; i++) {
    const value = raw.data[i * stride] / 255; // 0 = najdlje, 1 = najbližje
    let r: number;
    let g: number;
    let b: number;

    if (value < 0.5) {
      const t = value / 0.5;
      r = Math.round(20 + 90 * t);
      g = Math.round(90 + 80 * t);
      b = Math.round(200 + 55 * t);
    } else {
      const t = (value - 0.5) / 0.5;
      r = Math.round(110 + 145 * t);
      g = Math.round(170 - 110 * t);
      b = Math.round(255 - 255 * t);
    }

    const o = i * 4;
    image.data[o] = r;
    image.data[o + 1] = g;
    image.data[o + 2] = b;
    image.data[o + 3] = 255;
  }

  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
}

export function useDepthEstimation() {
  const [status, setStatus] = useState<DepthStatus>('idle');
  const [statusText, setStatusText] = useState('');
  const [result, setResult] = useState<DepthResult | null>(null);
  const mapRef = useRef<DepthMap | null>(null);

  const estimate = useCallback(async (source: string): Promise<DepthResult | null> => {
    setStatus('loading');
    setStatusText('⏳ Nalagam model globine (~26 MB) …');

    try {
      const pipe = await getPipeline();
      setStatus('running');
      setStatusText('🌊 Izračunavam globino …');

      const output = await pipe(source);
      const depth = output?.depth;
      if (!depth?.data || !depth.width || !depth.height) {
        throw new Error('Model ni vrnil globinske karte.');
      }

      const heatmapDataUrl = colorizeDepth(depth);
      mapRef.current = { data: depth.data, width: depth.width, height: depth.height };
      const next: DepthResult = {
        heatmapDataUrl,
        width: depth.width,
        height: depth.height
      };
      setResult(next);
      setStatus('ready');
      setStatusText('Globina je pripravljena — kliknite sliko za relativno vrednost.');
      return next;
    } catch (e: any) {
      console.error('Depth estimation error:', e);
      setStatus('error');
      setStatusText(`❌ Globine ni bilo mogoče izračunati: ${e?.message ?? 'neznana napaka'}`);
      return null;
    }
  }, []);

  /**
   * Relativna globina na koordinatah izvorne slike (0–100, 100 = najbližje).
   * Vrne null, če globinska karta še ni izračunana.
   */
  const depthPercentAt = useCallback((x: number, y: number): number | null => {
    const map = mapRef.current;
    if (!map) return null;

    const px = Math.max(0, Math.min(map.width - 1, Math.round(x)));
    const py = Math.max(0, Math.min(map.height - 1, Math.round(y)));
    const stride = Math.max(1, Math.round(map.data.length / (map.width * map.height)));
    const value = map.data[(py * map.width + px) * stride];
    return Math.round((value / 255) * 100);
  }, []);

  const reset = useCallback(() => {
    mapRef.current = null;
    setResult(null);
    setStatus('idle');
    setStatusText('');
  }, []);

  return { status, statusText, result, estimate, depthPercentAt, reset };
}
