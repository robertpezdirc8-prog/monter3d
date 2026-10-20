import { useRef, useEffect, useState } from 'react';
import type { FencePlan } from '../types';

interface FenceVisualizationProps {
  photoUrl: string | null;
  fencePlan: FencePlan | null;
  startPoint: { x: number; y: number } | null;
  endPoint: { x: number; y: number } | null;
  onStartPointChange: (p: { x: number; y: number } | null) => void;
  onEndPointChange: (p: { x: number; y: number } | null) => void;
  fenceHeight: number;
  onFenceHeightChange: (h: number) => void;
  numBoards: number;
  onNumBoardsChange: (n: number) => void;
  color: string;
  onColorChange: (c: string) => void;
}

export function FenceVisualization({
  photoUrl,
  startPoint,
  endPoint,
  onStartPointChange,
  onEndPointChange,
  fenceHeight,
  onFenceHeightChange,
  numBoards,
  onNumBoardsChange,
  color,
  onColorChange
}: FenceVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [placingPoint, setPlacingPoint] = useState<'start' | 'end' | null>(null);
  const [, setImageSize] = useState({ width: 0, height: 0 });

  // Draw fence visualization
  useEffect(() => {
    if (!canvasRef.current || !photoUrl) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      const maxW = 800;
      const scale = Math.min(maxW / img.width, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      setImageSize({ width: canvas.width, height: canvas.height });

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw fence if both points are set
      if (startPoint && endPoint) {
        drawFence(ctx, startPoint, endPoint, fenceHeight, numBoards, color);
      }

      // Draw placement markers
      if (startPoint) {
        drawPoint(ctx, startPoint, '#00ff00', 'Začetek');
      }
      if (endPoint) {
        drawPoint(ctx, endPoint, '#ff0000', 'Konec');
      }
    };
    img.src = photoUrl;
  }, [photoUrl, startPoint, endPoint, fenceHeight, numBoards, color]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!placingPoint) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (e.currentTarget.width / rect.width);
    const y = (e.clientY - rect.top) * (e.currentTarget.height / rect.height);
    const point = { x, y };

    if (placingPoint === 'start') {
      onStartPointChange(point);
    } else {
      onEndPointChange(point);
    }
    setPlacingPoint(null);
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">🎨 Vizualizacija ograje</h3>
        
        {/* Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-xs text-slate-400">Višina ograje (m)</label>
            <input
              type="number"
              step="0.1"
              min="0.5"
              max="3.0"
              value={fenceHeight}
              onChange={e => onFenceHeightChange(parseFloat(e.target.value))}
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Št. desk</label>
            <input
              type="number"
              min="1"
              max="30"
              value={numBoards}
              onChange={e => onNumBoardsChange(parseInt(e.target.value))}
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Barva</label>
            <select
              value={color}
              onChange={e => onColorChange(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white mt-1"
            >
              <option value="#2d3436">Antracit</option>
              <option value="#636e72">Siva</option>
              <option value="#dfe6e9">Bela</option>
              <option value="#b8860b">Bronasta</option>
              <option value="#2c3e50">Temno modra</option>
              <option value="#1a472a">Temno zelena</option>
            </select>
          </div>
          <div className="flex items-end">
            <div className="flex gap-1 w-full">
              <button
                onClick={() => setPlacingPoint('start')}
                className={`flex-1 text-xs py-1.5 rounded font-medium ${
                  placingPoint === 'start' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                📍 Začetek
              </button>
              <button
                onClick={() => setPlacingPoint('end')}
                className={`flex-1 text-xs py-1.5 rounded font-medium ${
                  placingPoint === 'end' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                📍 Konec
              </button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div ref={containerRef} className="relative">
          {photoUrl ? (
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className={`w-full rounded border-2 ${
                placingPoint ? 'border-emerald-500 cursor-crosshair' : 'border-slate-700'
              }`}
            />
          ) : (
            <div className="bg-slate-700 rounded h-64 flex items-center justify-center text-slate-400">
              <p>Nalžite fotografijo za vizualizacijo</p>
            </div>
          )}
          {placingPoint && (
            <div className="absolute top-2 left-2 bg-emerald-600 text-white text-xs px-2 py-1 rounded">
              Kliknite na sliko za {placingPoint === 'start' ? 'začetno' : 'končno'} točko
            </div>
          )}
        </div>

        {/* Info */}
        {startPoint && endPoint && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-700/50 rounded p-2">
              <p className="text-[10px] text-slate-400">Dolžina (px)</p>
              <p className="text-sm font-bold text-slate-200">
                {Math.sqrt((endPoint.x - startPoint.x) ** 2 + (endPoint.y - startPoint.y) ** 2).toFixed(0)}
              </p>
            </div>
            <div className="bg-slate-700/50 rounded p-2">
              <p className="text-[10px] text-slate-400">Višina</p>
              <p className="text-sm font-bold text-slate-200">{fenceHeight} m</p>
            </div>
            <div className="bg-slate-700/50 rounded p-2">
              <p className="text-[10px] text-slate-400">Deske</p>
              <p className="text-sm font-bold text-slate-200">{numBoards}</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Navodila za vizualizacijo</h3>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>1. Nalžite fotografijo objekta</li>
          <li>2. Kliknite "Začetek" in nato točko na sliki, kjer se ograja začne</li>
          <li>3. Kliknite "Konec" in nato točko, kjer se ograja konča</li>
          <li>4. Prilagodite višino, število desk in barvo</li>
          <li>5. Vizualizacija se samodejno posodobi</li>
        </ul>
        <p className="text-xs text-amber-400 mt-2">
          ⚠ Vizualizacija je približna. Za natančne mere uporabite kalibrirano merilo.
        </p>
      </div>
    </div>
  );
}

function drawFence(
  ctx: CanvasRenderingContext2D,
  start: { x: number; y: number },
  end: { x: number; y: number },
  height: number,
  numBoards: number,
  color: string
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const _length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  
  // Fence height in pixels (approximate based on image)
  const fenceHeightPx = Math.min(height * 150, 200);
  
  // Normal vector (perpendicular to fence direction, pointing up)
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);

  ctx.save();
  ctx.globalAlpha = 0.85;

  // Draw fence background panel
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.lineTo(end.x + nx * fenceHeightPx, end.y + ny * fenceHeightPx);
  ctx.lineTo(start.x + nx * fenceHeightPx, start.y + ny * fenceHeightPx);
  ctx.closePath();
  ctx.fill();

  // Draw vertical boards
  ctx.strokeStyle = adjustColor(color, -30);
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= numBoards; i++) {
    const t = i / numBoards;
    const bx = start.x + dx * t;
    const by = start.y + dy * t;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + nx * fenceHeightPx, by + ny * fenceHeightPx);
    ctx.stroke();
  }

  // Draw horizontal rails (top and bottom)
  ctx.strokeStyle = adjustColor(color, -50);
  ctx.lineWidth = 3;
  
  // Bottom rail
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  
  // Top rail
  ctx.beginPath();
  ctx.moveTo(start.x + nx * fenceHeightPx, start.y + ny * fenceHeightPx);
  ctx.lineTo(end.x + nx * fenceHeightPx, end.y + ny * fenceHeightPx);
  ctx.stroke();

  // Draw posts at ends
  ctx.fillStyle = adjustColor(color, -40);
  const postWidth = 6;
  
  // Start post
  ctx.save();
  ctx.translate(start.x, start.y);
  ctx.rotate(angle);
  ctx.fillRect(-postWidth / 2, -fenceHeightPx - 10, postWidth, fenceHeightPx + 10);
  ctx.restore();
  
  // End post
  ctx.save();
  ctx.translate(end.x, end.y);
  ctx.rotate(angle);
  ctx.fillRect(-postWidth / 2, -fenceHeightPx - 10, postWidth, fenceHeightPx + 10);
  ctx.restore();

  ctx.restore();
}

function drawPoint(ctx: CanvasRenderingContext2D, point: { x: number; y: number }, color: string, label: string) {
  ctx.save();
  
  // Outer circle
  ctx.beginPath();
  ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
  ctx.fillStyle = color + '40';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Inner dot
  ctx.beginPath();
  ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  
  // Label
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(label, point.x + 14, point.y + 4);
  
  ctx.restore();
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xFF) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xFF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xFF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
