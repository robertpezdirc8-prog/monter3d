/**
 * useAiDetection.ts — Brezplačna AI detekcija objektov v brskalniku
 *
 * Uporablja RF-DETR Nano (Apache 2.0) prek Transformers.js.
 * Vse deluje lokalno v brskalniku — nič strežnika, nič API klicov.
 *
 * Model: onnx-community/rfdetr_nano-ONNX (~29 MB, Apache 2.0 — popolnoma brezplačno)
 * Prenese se enkrat v brskalnikov cache, potem deluje offline.
 */

import { useRef, useCallback, useState } from 'react';

export interface DetectedObject {
  label: string;
  score: number;
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
}

export type AiStatus = 'idle' | 'loading' | 'ready' | 'error';

// Globalni singleton pipeline — naloži se samo enkrat
let gPipeline: any = null;
let gLoadPromise: Promise<any> | null = null;

async function getPipeline(): Promise<any> {
  if (gPipeline) return gPipeline;
  if (gLoadPromise) return gLoadPromise;
  gLoadPromise = (async () => {
    const transformers = await import('@huggingface/transformers');
    const p = await transformers.pipeline(
      'object-detection',
      'onnx-community/rfdetr_nano-ONNX',
      {  } as any // quantized: true — potihoma ignorirano za TS
    );
    gPipeline = p;
    return p;
  })();
  return gLoadPromise;
}

export function useAiDetection() {
  const [status, setStatus] = useState<AiStatus>('idle');
  const [detections, setDetections] = useState<DetectedObject[]>([]);
  const [statusText, setStatusText] = useState<string>('');

  const loadModel = useCallback(async () => {
    if (status === 'loading' || status === 'ready') return;
    setStatus('loading');
    setStatusText('⏳ Nalagam AI model (~29 MB) …');
    try {
      await getPipeline();
      setStatus('ready');
      setStatusText('✅ AI model pripravljen');
    } catch (e: any) {
      setStatus('error');
      setStatusText(`❌ Napaka: ${e?.message ?? 'neznana'}`);
      console.error('AI model load failed:', e);
    }
  }, [status]);

  /**
   * Požene detekcijo na podani sliki/videu.
   * @param source HTMLVideoElement ali HTMLCanvasElement ali ImageData
   */
  const detect = useCallback(async (
    source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
  ): Promise<DetectedObject[]> => {
    if (!gPipeline) {
      setDetections([]);
      return [];
    }
    try {
      // Transformers.js podpira direktno HTML elemente
      const output: any[] = await gPipeline(source, {
        threshold: 0.5,
        percentage: true, // koordinate so 0..1
      });

      const imgWidth = (source as HTMLVideoElement).videoWidth
        ?? (source as HTMLCanvasElement).width
        ?? (source as HTMLImageElement).naturalWidth
        ?? 640;
      const imgHeight = (source as HTMLVideoElement).videoHeight
        ?? (source as HTMLCanvasElement).height
        ?? (source as HTMLImageElement).naturalHeight
        ?? 480;

      const objs: DetectedObject[] = output.map((d: any) => {
        const b = d.box ?? {};
        // percentage koordinate → pixel koordinate
        const xmin = (b.xmin ?? 0) * imgWidth;
        const ymin = (b.ymin ?? 0) * imgHeight;
        const xmax = (b.xmax ?? 0) * imgWidth;
        const ymax = (b.ymax ?? 0) * imgHeight;
        return { label: d.label, score: d.score, box: { xmin, ymin, xmax, ymax } };
      });

      setDetections(objs);
      return objs;
    } catch (e: any) {
      console.error('AI detection error:', e);
      setDetections([]);
      return [];
    }
  }, []);

  const clearDetections = useCallback(() => {
    setDetections([]);
    setStatusText('');
  }, []);

  return { status, detections, statusText, loadModel, detect, clearDetections };
}