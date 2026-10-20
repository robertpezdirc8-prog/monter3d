/**
 * PhotoAnnotator.tsx — FAZA 19
 *
 * Risanje skic čez fotografijo (kot »annotations« pri CompanyCam): uporabnik nariše
 * s prstom ali miško, skica pa se shrani skupaj s fotografijo (vektor, zato ostane
 * ostra pri vsaki velikosti).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Photo, PhotoAnnotation } from '../types';
import {
  ANNOTATION_COLORS, ANNOTATION_WIDTH, addStroke, drawAnnotation,
  emptyAnnotation, setNoteOnLastStroke, toNormalizedPoint, undoStroke,
} from '../utils/annotation';

interface PhotoAnnotatorProps {
  photo: Photo;
  onSave: (annotation: PhotoAnnotation) => void;
  onClose: () => void;
}

export function PhotoAnnotator({ photo, onSave, onClose }: PhotoAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const [annotation, setAnnotation] = useState<PhotoAnnotation>(photo.annotation ?? emptyAnnotation());
  const [color, setColor] = useState(ANNOTATION_COLORS[0].hex);
  const [size, setSize] = useState(1);
  // FAZA 23: besedilna opomba zadnji skici (npr. »vrtanje tukaj«)
  const [note, setNote] = useState('');

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawAnnotation(ctx, annotation, canvas.width, canvas.height);
    if (currentStrokeRef.current.length > 0) {
      drawAnnotation(ctx, {
        strokes: [{ points: currentStrokeRef.current, color, width: ANNOTATION_WIDTH * size }],
      }, canvas.width, canvas.height);
    }
  }, [annotation, color, size]);

  useEffect(() => {
    render();
  }, [render]);

  const pointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return toNormalizedPoint(e.clientX, e.clientY, rect);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // setPointerCapture ni v vseh brskalnikih (in ne v jsdom) — ignoriramo, če manjka.
    if (typeof e.currentTarget.setPointerCapture === 'function') {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    drawingRef.current = true;
    currentStrokeRef.current = [pointerPos(e)];
    render();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    currentStrokeRef.current.push(pointerPos(e));
    render();
  };

  const handlePointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const points = currentStrokeRef.current;
    currentStrokeRef.current = [];
    if (points.length > 0) {
      setAnnotation(prev => addStroke(prev, { points, color, width: ANNOTATION_WIDTH * size }));
      setNote('');
    } else {
      render();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg max-w-3xl w-full max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-white">✎ Označbe na fotografiji</h2>
            <p className="text-xs text-slate-400 mt-1">
              Nariši s prstom ali miško (označi detajl, poškodbo, mesto vrtanja).
              Skica se shrani skupaj s fotografijo.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl" aria-label="Zapri">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="relative inline-block w-full">
            <img
              src={photo.dataUrl}
              alt={photo.id}
              className="w-full rounded-lg select-none pointer-events-none"
              onLoad={() => {
                const canvas = canvasRef.current;
                const img = canvas?.previousElementSibling as HTMLImageElement | null;
                if (canvas && img) {
                  canvas.width = img.clientWidth || img.naturalWidth || 800;
                  canvas.height = img.clientHeight || img.naturalHeight || 600;
                  render();
                }
              }}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full rounded-lg touch-none cursor-crosshair"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              aria-label="Platno za risanje označb"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              {ANNOTATION_COLORS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setColor(c.hex)}
                  className={`w-7 h-7 rounded-full border-2 ${color === c.hex ? 'border-white scale-110' : 'border-slate-600'}`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                  aria-label={`Barva ${c.label}`}
                />
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300">
              Debelina
              <input
                type="range"
                min={0.5}
                max={3}
                step={0.5}
                value={size}
                onChange={e => setSize(parseFloat(e.target.value))}
                className="accent-emerald-500"
                aria-label="Debelina črte"
              />
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-300">
              Opomba
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && note.trim()) {
                    setAnnotation(prev => setNoteOnLastStroke(prev, note));
                    setNote('');
                  }
                }}
                placeholder="npr. vrtanje tukaj"
                aria-label="Opomba ob zadnji skici"
                className="w-44 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
              />
            </label>
            <button
              onClick={() => {
                if (!note.trim()) return;
                setAnnotation(prev => setNoteOnLastStroke(prev, note));
                setNote('');
              }}
              disabled={!note.trim()}
              className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-xs text-slate-200"
            >
              ⌨ Pripni opombo
            </button>
            <button
              onClick={() => setAnnotation(prev => undoStroke(prev))}
              className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-xs text-slate-200"
            >
              ↶ Razveljavi
            </button>
            <button
              onClick={() => setAnnotation(emptyAnnotation())}
              className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-xs text-slate-200"
            >
              🗑 Počisti
            </button>

            <div className="ml-auto flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm text-slate-200"
              >
                Prekliči
              </button>
              <button
                onClick={() => onSave(annotation)}
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-sm text-white font-medium"
              >
                ✓ Shrani skico
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Shranjena skica se prikaže tudi v dokumentacijski listi in pri izvozu v PNG.
          </p>
        </div>
      </div>
    </div>
  );
}
