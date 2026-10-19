/**
 * AiOverlay.tsx — Prikaz AI detekcijskih boxov na kameri / sliki
 *
 * Risanje na canvas overlay, ki leži čez video element.
 * Prikaže: bounding box + label + confidence score.
 */

import { useRef, useEffect } from 'react';
import type { DetectedObject } from '../hooks/useAiDetection';

interface AiOverlayProps {
  detections: DetectedObject[];
  width: number;
  height: number;
  /** Če true, se boxi rišejo na video dimenzije namesto na client dimenzije */
  useVideoDimensions?: boolean;
}

/** COCO barvna paleta za 80 razredov — vedno enaka barva za isti label */
const LABEL_COLORS: Record<string, string> = {};

function getColor(label: string): string {
  if (LABEL_COLORS[label]) return LABEL_COLORS[label];
  // HSV barvna krogla za 80 barv
  const hue = (Object.keys(LABEL_COLORS).length * 47) % 360;
  LABEL_COLORS[label] = `hsl(${hue}, 80%, 50%)`;
  return LABEL_COLORS[label];
}

export function AiOverlay({ detections, width, height, useVideoDimensions }: AiOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    for (const obj of detections) {
      const { xmin, ymin, xmax, ymax } = obj.box;
      const color = getColor(obj.label);

      // Box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(xmin, ymin, xmax - xmin, ymax - ymin);

      // Label bg
      const label = `${obj.label} ${Math.round(obj.score * 100)}%`;
      ctx.font = 'bold 14px monospace';
      const textW = ctx.measureText(label).width;
      const labelH = 20;

      ctx.fillStyle = color;
      ctx.fillRect(xmin, ymin - labelH, textW + 8, labelH);

      // Besedilo
      ctx.fillStyle = '#fff';
      ctx.fillText(label, xmin + 4, ymin - 6);
    }
  }, [detections, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width, height }}
    />
  );
}