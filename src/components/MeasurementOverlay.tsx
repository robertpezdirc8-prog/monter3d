/**
 * Mera3D Pro - Measurement Overlay Component
 * 
 * Interactive overlay for marking reference distances and measurement points
 * on a photo. Calculates real-world measurements using pixel-to-meter scale.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { calculateScaleFromReference, calculateRealDistance, assessMeasurementReliability } from '../utils/cv';
import type { Point2D } from '../utils/cv';

interface MeasurementPoint {
  id: string;
  point: Point2D;
  label?: string;
}

interface MeasurementSegment {
  id: string;
  from: MeasurementPoint;
  to: MeasurementPoint;
  pixelDistance: number;
  realDistance: number | null;
  reliability: number;
  warnings: string[];
}

interface MeasurementOverlayProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  onMeasurementsChange?: (segments: MeasurementSegment[]) => void;
}

type Mode = 'idle' | 'reference' | 'measure';

export function MeasurementOverlay({
  imageUrl,
  imageWidth: propWidth,
  imageHeight: propHeight,
  onMeasurementsChange
}: MeasurementOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<Mode>('idle');
  const [referencePoints, setReferencePoints] = useState<Point2D[]>([]);
  const [referenceDistance, setReferenceDistance] = useState<string>('');
  const [pixelToMeter, setPixelToMeter] = useState<number | null>(null);
  const [measurePoints, setMeasurePoints] = useState<MeasurementPoint[]>([]);
  const [segments, setSegments] = useState<MeasurementSegment[]>([]);
  const [displayScale, setDisplayScale] = useState(1);
  
  // Get actual image dimensions if props are missing or fallback values
  const [actualDimensions, setActualDimensions] = useState<{ width: number; height: number } | null>(null);
  
  useEffect(() => {
    // If props have valid dimensions (> 1), use them
    if (propWidth > 1 && propHeight > 1) {
      setActualDimensions({ width: propWidth, height: propHeight });
      return;
    }
    
    // Otherwise, load image to get actual dimensions
    const img = new Image();
    img.onload = () => {
      setActualDimensions({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      // Fallback to props or default
      setActualDimensions({ 
        width: propWidth > 1 ? propWidth : 800, 
        height: propHeight > 1 ? propHeight : 600 
      });
    };
    img.src = imageUrl;
  }, [imageUrl, propWidth, propHeight]);
  
  const imageWidth = actualDimensions?.width || propWidth;
  const imageHeight = actualDimensions?.height || propHeight;

  // Calculate display scale to fit image in container
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      const scale = Math.min(containerWidth / imageWidth, 1);
      setDisplayScale(scale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [imageWidth, imageHeight]);

  // Draw overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = imageWidth * displayScale;
    canvas.height = imageHeight * displayScale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw reference line
    if (referencePoints.length === 2) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(referencePoints[0].x * displayScale, referencePoints[0].y * displayScale);
      ctx.lineTo(referencePoints[1].x * displayScale, referencePoints[1].y * displayScale);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw reference points
      for (const p of referencePoints) {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(p.x * displayScale, p.y * displayScale, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Label
      const midX = (referencePoints[0].x + referencePoints[1].x) / 2 * displayScale;
      const midY = (referencePoints[0].y + referencePoints[1].y) / 2 * displayScale;
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${referenceDistance} m`, midX, midY - 12);
    }

    // Draw measurement points and segments
    for (const seg of segments) {
      // Line
      const color = seg.realDistance !== null ? '#10b981' : '#ef4444';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(seg.from.point.x * displayScale, seg.from.point.y * displayScale);
      ctx.lineTo(seg.to.point.x * displayScale, seg.to.point.y * displayScale);
      ctx.stroke();

      // Points
      for (const p of [seg.from, seg.to]) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.point.x * displayScale, p.point.y * displayScale, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Label
      const midX = (seg.from.point.x + seg.to.point.x) / 2 * displayScale;
      const midY = (seg.from.point.y + seg.to.point.y) / 2 * displayScale;
      ctx.fillStyle = color;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      const label = seg.realDistance !== null 
        ? `${seg.realDistance.toFixed(3)} m`
        : '—';
      ctx.fillText(label, midX, midY - 10);

      // Reliability indicator
      if (seg.reliability < 0.7) {
        ctx.fillStyle = '#ef4444';
        ctx.font = '10px sans-serif';
        ctx.fillText(`⚠ ${(seg.reliability * 100).toFixed(0)}%`, midX, midY + 14);
      }
    }

    // Draw pending measure points
    if (measurePoints.length > 0 && mode === 'measure') {
      for (const p of measurePoints) {
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(p.point.x * displayScale, p.point.y * displayScale, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }, [referencePoints, measurePoints, segments, displayScale, imageWidth, imageHeight, mode, referenceDistance]);

  // Handle canvas click
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / displayScale;
    const y = (e.clientY - rect.top) / displayScale;

    if (mode === 'reference') {
      const newRefPoints = [...referencePoints, { x, y }];
      if (newRefPoints.length > 2) {
        // Reset - start new reference
        setReferencePoints([{ x, y }]);
      } else {
        setReferencePoints(newRefPoints);
      }
    } else if (mode === 'measure') {
      const newPoint: MeasurementPoint = {
        id: `mp-${Date.now()}`,
        point: { x, y }
      };
      const newMeasurePoints = [...measurePoints, newPoint];
      setMeasurePoints(newMeasurePoints);

      // Create segment when we have 2 points
      if (newMeasurePoints.length >= 2) {
        const from = newMeasurePoints[newMeasurePoints.length - 2];
        const to = newMeasurePoints[newMeasurePoints.length - 1];
        const pixelDist = Math.sqrt(
          (to.point.x - from.point.x) ** 2 + (to.point.y - from.point.y) ** 2
        );
        
        let realDist: number | null = null;
        if (pixelToMeter) {
          realDist = calculateRealDistance(from.point, to.point, pixelToMeter);
        }

        const reliabilityResult = pixelToMeter 
          ? assessMeasurementReliability(pixelDist, imageWidth, imageHeight, 
              referencePoints.length === 2 
                ? Math.sqrt((referencePoints[1].x - referencePoints[0].x) ** 2 + (referencePoints[1].y - referencePoints[0].y) ** 2)
                : 0)
          : { reliability: 0, warnings: ['Ni nastavljene reference'] };

        const segment: MeasurementSegment = {
          id: `seg-${Date.now()}`,
          from,
          to,
          pixelDistance: pixelDist,
          realDistance: realDist,
          reliability: reliabilityResult.reliability,
          warnings: reliabilityResult.warnings
        };

        const newSegments = [...segments, segment];
        setSegments(newSegments);
        onMeasurementsChange?.(newSegments);
      }
    }
  }, [mode, referencePoints, measurePoints, segments, pixelToMeter, displayScale, imageWidth, imageHeight, onMeasurementsChange]);

  // Confirm reference distance
  const confirmReference = useCallback(() => {
    const dist = parseFloat(referenceDistance);
    if (isNaN(dist) || dist <= 0 || referencePoints.length !== 2) return;

    const scale = calculateScaleFromReference(referencePoints[0], referencePoints[1], dist);
    setPixelToMeter(scale);
    setMode('measure');
  }, [referenceDistance, referencePoints]);

  // Reset reference
  const resetReference = useCallback(() => {
    setReferencePoints([]);
    setReferenceDistance('');
    setPixelToMeter(null);
    setMode('idle');
  }, []);

  // Clear measurements
  const clearMeasurements = useCallback(() => {
    setMeasurePoints([]);
    setSegments([]);
    onMeasurementsChange?.([]);
  }, [onMeasurementsChange]);

  return (
    <div className="space-y-4">
      {/* Mode controls */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => { setMode('reference'); resetReference(); }}
          className={`px-3 py-2 rounded text-sm font-medium ${
            mode === 'reference' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          📏 Nastavi referenco
        </button>
        <button
          onClick={() => setMode('measure')}
          disabled={!pixelToMeter}
          className={`px-3 py-2 rounded text-sm font-medium ${
            mode === 'measure' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          📐 Meri
        </button>
        <button
          onClick={clearMeasurements}
          className="px-3 py-2 rounded text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600"
        >
          🗑 Počisti mere
        </button>
      </div>

      {/* Reference input */}
      {mode === 'reference' && (
        <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3">
          <p className="text-amber-200 text-sm mb-2">
            {referencePoints.length === 0 && 'Kliknite na začetek referenčne mere na fotografiji'}
            {referencePoints.length === 1 && 'Kliknite na konec referenčne mere'}
            {referencePoints.length === 2 && 'Vnesite dejansko dolžino reference v metrih'}
          </p>
          {referencePoints.length === 2 && (
            <div className="flex gap-2 items-center">
              <input
                type="number"
                step="0.001"
                min="0.01"
                value={referenceDistance}
                onChange={(e) => setReferenceDistance(e.target.value)}
                placeholder="npr. 1.80"
                className="bg-slate-800 border border-slate-600 rounded px-3 py-1 text-white text-sm w-32"
              />
              <span className="text-amber-200 text-sm">m</span>
              <button
                onClick={confirmReference}
                disabled={!referenceDistance || parseFloat(referenceDistance) <= 0}
                className="px-3 py-1 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-500 disabled:opacity-50"
              >
                ✓ Potrdi
              </button>
            </div>
          )}
        </div>
      )}

      {/* Scale info */}
      {pixelToMeter && (
        <div className="bg-emerald-900/30 border border-emerald-700 rounded-lg p-3">
          <p className="text-emerald-200 text-sm">
            ✓ Merilo nastavljeno: <strong>{(pixelToMeter * 100).toFixed(3)} cm/piksel</strong>
            {' '}({pixelToMeter.toFixed(6)} m/piksel)
          </p>
          {mode === 'measure' && (
            <p className="text-emerald-300 text-xs mt-1">
              Kliknite na fotografijo za označitev merilnih točk. Vsaka dva klika ustvarita meritev.
            </p>
          )}
        </div>
      )}

      {/* Image with overlay */}
      <div ref={containerRef} className="relative border border-slate-700 rounded-lg overflow-hidden bg-slate-900">
        <img
          src={imageUrl}
          alt="Fotografija za merjenje"
          className="w-full block"
          style={{ cursor: mode !== 'idle' ? 'crosshair' : 'default' }}
        />
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="absolute top-0 left-0 w-full h-full"
          style={{ cursor: mode !== 'idle' ? 'crosshair' : 'default' }}
        />
      </div>

      {/* Measurement results */}
      {segments.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">
            Izmerjeni odseki ({segments.length})
          </h3>
          <div className="space-y-2">
            {segments.map((seg, i) => (
              <div key={seg.id} className="flex items-center justify-between bg-slate-700/50 rounded p-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">#{i + 1}</span>
                  <span className="text-sm text-white font-mono">
                    {seg.realDistance !== null 
                      ? `${seg.realDistance.toFixed(3)} m`
                      : '—'
                    }
                  </span>
                  <span className="text-xs text-slate-400">
                    ({seg.pixelDistance.toFixed(0)} px)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    seg.reliability >= 0.8 ? 'bg-emerald-900/60 text-emerald-300' :
                    seg.reliability >= 0.5 ? 'bg-amber-900/60 text-amber-300' :
                    'bg-red-900/60 text-red-300'
                  }`}>
                    {(seg.reliability * 100).toFixed(0)}% zanesljivo
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Total length */}
          {segments.every(s => s.realDistance !== null) && (
            <div className="mt-3 pt-3 border-t border-slate-600">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Skupna dolžina:</span>
                <span className="text-lg font-bold text-emerald-400">
                  {segments.reduce((sum, s) => sum + (s.realDistance || 0), 0).toFixed(3)} m
                </span>
              </div>
            </div>
          )}

          {/* Warnings */}
          {segments.some(s => s.warnings.length > 0) && (
            <div className="mt-3 pt-3 border-t border-slate-600">
              <p className="text-xs text-amber-400 mb-1">⚠ Opozorila:</p>
              {segments.flatMap(s => s.warnings).map((w, i) => (
                <p key={i} className="text-xs text-amber-300">• {w}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {mode === 'idle' && !pixelToMeter && (
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
          <h4 className="text-blue-200 font-medium text-sm mb-2">Navodila za merjenje:</h4>
          <ol className="text-blue-300 text-xs space-y-1 list-decimal list-inside">
            <li>Kliknite "Nastavi referenco" in označite začetek in konec znane razdalje</li>
            <li>Vnesite dejansko dolžino reference v metrih (npr. višina vrat, dolžina letvice)</li>
            <li>Potrdite referenco</li>
            <li>Kliknite "Meri" in označite točke za merjenje</li>
            <li>Vsaka dva klika ustvarita en merilni odsek</li>
          </ol>
          <p className="text-blue-400 text-xs mt-2">
            💡 Namig: Za najboljšo natančnost uporabite referenco, ki je vsaj 20% velikosti slike.
          </p>
        </div>
      )}
    </div>
  );
}
