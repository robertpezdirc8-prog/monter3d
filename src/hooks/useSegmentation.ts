/**
 * useSegmentation.ts — interaktivna segmentacija s klikom (SlimSAM)
 *
 * Model: Xenova/slimsam-77-uniform (Apache 2.0, ~13 MB kvantiziran) prek
 * Transformers.js. Uporabnik klikne objekt na fotografiji, model vrne masko
 * in izrez s prosojnim ozadjem. Vse deluje lokalno v brskalniku.
 */

import { useCallback, useState } from 'react';

export type SegmentationStatus = 'idle' | 'loading' | 'running' | 'ready' | 'error';

export interface SegmentationResult {
  /** Maska objekta kot prosojen zelen sloj (PNG data URL). */
  maskDataUrl: string;
  /** Izrez objekta s prosojnim ozadjem (PNG data URL). */
  cutoutDataUrl: string;
  /** Delež slike, ki ga pokriva maska (0–1). */
  coverage: number;
  /** Zaupanje modela v izbrano masko (0–1). */
  score: number;
  width: number;
  height: number;
}

let gModel: any = null;
let gProcessor: any = null;
let gLoadPromise: Promise<{ model: any; processor: any }> | null = null;

async function getSam() {
  if (gModel && gProcessor) return { model: gModel, processor: gProcessor };
  if (!gLoadPromise) {
    gLoadPromise = (async () => {
      const { SamModel, AutoProcessor } = await import('@huggingface/transformers');
      const modelId = 'Xenova/slimsam-77-uniform';
      const [model, processor] = await Promise.all([
        SamModel.from_pretrained(modelId, { dtype: 'q8' } as any),
        AutoProcessor.from_pretrained(modelId)
      ]);
      gModel = model;
      gProcessor = processor;
      return { model, processor };
    })();
  }
  return gLoadPromise;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Fotografije ni bilo mogoče prebrati.'));
    img.src = src;
  });
}

export function useSegmentation() {
  const [status, setStatus] = useState<SegmentationStatus>('idle');
  const [statusText, setStatusText] = useState('');
  const [result, setResult] = useState<SegmentationResult | null>(null);

  const segmentAt = useCallback(async (
    imageSrc: string,
    x: number,
    y: number
  ): Promise<SegmentationResult | null> => {
    setStatus('loading');
    setStatusText('⏳ Nalagam model segmentacije (~13 MB) …');

    try {
      const [{ model, processor }, image] = await Promise.all([
        getSam(),
        loadImage(imageSrc)
      ]);

      setStatus('running');
      setStatusText('🪄 Izrezujem objekt …');

      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Slika ni na voljo.');
      ctx.drawImage(image, 0, 0);

      const { RawImage } = await import('@huggingface/transformers');
      const rawImage = RawImage.fromCanvas(canvas);

      const inputs = await processor(rawImage, { input_points: [[[x, y]]] });
      const outputs = await model(inputs);
      const masks = await processor.post_process_masks(
        outputs.pred_masks,
        inputs.original_sizes,
        inputs.reshaped_input_sizes
      );

      const maskTensor: any = masks?.[0];
      if (!maskTensor?.dims || !maskTensor?.data) {
        throw new Error('Model ni vrnil maske.');
      }

      // dims: [1, 3, H, W] — tri možne maske, izberemo tisto z najvišjo oceno
      const dims: number[] = maskTensor.dims;
      const numMasks = dims[1] ?? 3;
      const height = dims[2];
      const width = dims[3];
      const scores: Float32Array = outputs.iou_scores?.data ?? new Float32Array(numMasks);
      let best = 0;
      for (let i = 1; i < numMasks; i++) {
        if ((scores[i] ?? 0) > (scores[best] ?? 0)) best = i;
      }

      const pixels = width * height;
      const maskData: Uint8Array = maskTensor.data;
      const offset = best * pixels;

      // Zelen prosojen sloj maske
      const overlay = document.createElement('canvas');
      overlay.width = width;
      overlay.height = height;
      const overlayCtx = overlay.getContext('2d');
      if (!overlayCtx) throw new Error('Slike ni mogoče pripraviti.');
      const overlayImage = overlayCtx.createImageData(width, height);

      // Izrez z alfa kanalom
      const cutout = document.createElement('canvas');
      cutout.width = width;
      cutout.height = height;
      const cutoutCtx = cutout.getContext('2d');
      if (!cutoutCtx) throw new Error('Slike ni mogoče pripraviti.');
      cutoutCtx.drawImage(image, 0, 0, width, height);
      const cutoutImage = cutoutCtx.getImageData(0, 0, width, height);

      let covered = 0;
      for (let i = 0; i < pixels; i++) {
        const isObject = maskData[offset + i] > 0;
        if (isObject) {
          covered++;
          const o = i * 4;
          overlayImage.data[o] = 16;
          overlayImage.data[o + 1] = 185;
          overlayImage.data[o + 2] = 129;
          overlayImage.data[o + 3] = 140;
        } else {
          cutoutImage.data[i * 4 + 3] = 0;
        }
      }

      overlayCtx.putImageData(overlayImage, 0, 0);
      cutoutCtx.putImageData(cutoutImage, 0, 0);

      const next: SegmentationResult = {
        maskDataUrl: overlay.toDataURL('image/png'),
        cutoutDataUrl: cutout.toDataURL('image/png'),
        coverage: covered / pixels,
        score: scores[best] ?? 0,
        width,
        height
      };
      setResult(next);
      setStatus('ready');
      setStatusText('Objekt je izrezan.');
      return next;
    } catch (e: any) {
      console.error('Segmentation error:', e);
      setStatus('error');
      setStatusText(`❌ Segmentacije ni bilo mogoče izvesti: ${e?.message ?? 'neznana napaka'}`);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setStatus('idle');
    setStatusText('');
  }, []);

  return { status, statusText, result, segmentAt, reset };
}
