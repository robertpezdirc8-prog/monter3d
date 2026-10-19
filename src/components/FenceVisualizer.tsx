/**
 * Mera3D Pro - Fence Visualizer Component
 *
 * Fotografija + fotomontaža Roksalove ograje:
 * - oznaka območja s štirimi vogali (perspektiva),
 * - izbira profila, barve, orientacije in razmaka,
 * - kalibracija merila (px/m) za nadzor višine,
 * - before/after primerjava z drsnikom.
 *
 * Geometrija je v utils/fenceVisualization.ts in pokrita s testi.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Photo } from '../types';
import { getVerticalProfiles, getHorizontalProfiles } from '../data/roksalCatalog';
import type { RoksalProfile, RoksalColor } from '../data/roksalCatalog';
import { buildFenceQuads, type Point, type Quad } from '../utils/fenceVisualization';

interface FenceVisualizerProps {
  photo: Photo;
  onClose: () => void;
}

interface FenceConfig {
  profile: RoksalProfile;
  color: RoksalColor;
  orientation: 'vertical' | 'horizontal';
  boardSpacing: number; // mm
  fenceHeight: number; // mm
}

type Mode = 'idle' | 'corners' | 'calibrate';

const MAX_CANVAS_WIDTH = 900;
const MAX_CANVAS_HEIGHT = 620;
const CORNER_NAMES = ['zgoraj levo', 'zgoraj desno', 'spodaj desno', 'spodaj levo'];

function fenceProfiles(orientation: 'vertical' | 'horizontal'): RoksalProfile[] {
  const profiles = orientation === 'vertical' ? getVerticalProfiles() : getHorizontalProfiles();
  return profiles.filter(p => p.kind !== 'partition');
}

function pickInitialProfile(): RoksalProfile {
  return fenceProfiles('vertical')[0];
}

function drawQuads(
  ctx: CanvasRenderingContext2D,
  quads: Quad[],
  color: string,
  lineWidth = 1
) {
  ctx.save();
  ctx.globalAlpha = 0.87;
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.lineWidth = lineWidth;

  for (const quad of quads) {
    ctx.beginPath();
    ctx.moveTo(quad.topLeft.x, quad.topLeft.y);
    ctx.lineTo(quad.topRight.x, quad.topRight.y);
    ctx.lineTo(quad.bottomRight.x, quad.bottomRight.y);
    ctx.lineTo(quad.bottomLeft.x, quad.bottomLeft.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawGuides(
  ctx: CanvasRenderingContext2D,
  corners: Point[],
  calibrationPoints: Point[]
) {
  // Obris označenega območja
  if (corners.length > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    if (corners.length === 4) {
      ctx.closePath();
    }
    ctx.stroke();
    ctx.restore();
  }

  // Oštevilčene točke
  corners.forEach((point, index) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(point.x, point.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.95)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(index + 1), point.x, point.y);
    ctx.restore();
  });

  // Referenčna linija za kalibracijo
  if (calibrationPoints.length > 0) {
    ctx.save();
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(calibrationPoints[0].x, calibrationPoints[0].y);
    if (calibrationPoints[1]) {
      ctx.lineTo(calibrationPoints[1].x, calibrationPoints[1].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    for (const point of calibrationPoints) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#22d3ee';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0e7490';
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function FenceVisualizer({ photo, onClose }: FenceVisualizerProps) {
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const guideCanvasRef = useRef<HTMLCanvasElement>(null);

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const [corners, setCorners] = useState<Point[]>([]);
  const [mode, setMode] = useState<Mode>('idle');
  const [calibrationPoints, setCalibrationPoints] = useState<Point[]>([]);
  const [pendingCalibration, setPendingCalibration] = useState<{ pixels: number } | null>(null);
  const [referenceCm, setReferenceCm] = useState('180');
  const [pxPerMeter, setPxPerMeter] = useState<number | null>(null);

  const [sliderPosition, setSliderPosition] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const [config, setConfig] = useState<FenceConfig>(() => {
    const profile = pickInitialProfile();
    return {
      profile,
      color: profile.colors[0],
      orientation: 'vertical',
      boardSpacing: profile.recommendedBoardSpacing,
      fenceHeight: 1000
    };
  });

  // Naloži fotografijo in določi velikost platna
  useEffect(() => {
    let cancelled = false;
    const img = new Image();

    img.onload = () => {
      if (cancelled) return;
      const scale = Math.min(
        1,
        MAX_CANVAS_WIDTH / img.naturalWidth,
        MAX_CANVAS_HEIGHT / img.naturalHeight
      );
      setImage(img);
      setCanvasSize({
        width: Math.round(img.naturalWidth * scale),
        height: Math.round(img.naturalHeight * scale)
      });
      setCorners([]);
      setCalibrationPoints([]);
      setPendingCalibration(null);
      setPxPerMeter(null);
      setMode('idle');
      setNotice(null);
    };

    img.onerror = () => {
      if (!cancelled) setNotice('Fotografije ni bilo mogoče naložiti.');
    };

    img.src = photo.dataUrl;
    return () => {
      cancelled = true;
    };
  }, [photo]);

  // Originalna fotografija
  useEffect(() => {
    const canvas = baseCanvasRef.current;
    if (!canvas || !image || canvasSize.width <= 0) return;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  }, [image, canvasSize]);

  // Fotomontaža (brez fotografije, da jo lahko prekriva before/after)
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (corners.length !== 4) return;

    const quads = buildFenceQuads(
      corners as [Point, Point, Point, Point],
      {
        orientation: config.orientation,
        boardWidthMm: config.profile.width,
        gapMm: config.boardSpacing,
        heightMm: config.fenceHeight
      },
      pxPerMeter
    );

    drawQuads(ctx, quads, config.color.hex);

    // Rahla senca na tleh
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(corners[3].x, corners[3].y);
    ctx.lineTo(corners[2].x, corners[2].y);
    ctx.stroke();
    ctx.restore();
  }, [canvasSize, corners, config, pxPerMeter]);

  // Vodila (vogali, referenčna linija) — vedno vidna
  useEffect(() => {
    const canvas = guideCanvasRef.current;
    if (!canvas) return;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGuides(ctx, corners, calibrationPoints);
  }, [canvasSize, corners, calibrationPoints]);

  const handleSurfaceClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (canvasSize.width <= 0) return;

      const rect = event.currentTarget.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const point: Point = {
        x: (event.clientX - rect.left) * (canvasSize.width / rect.width),
        y: (event.clientY - rect.top) * (canvasSize.height / rect.height)
      };

      if (mode === 'corners') {
        const next = [...corners.slice(0, 3), point];
        setCorners(next);
        setNotice(null);
        if (next.length === 4) {
          setMode('idle');
          setNotice(
            pxPerMeter
              ? 'Območje je označeno. Višino lahko prilagodite z drsnikom.'
              : 'Območje je označeno. Za nadzor višine kalibrirajte merilo (📏).'
          );
        }
        return;
      }

      if (mode === 'calibrate') {
        if (calibrationPoints.length === 0) {
          setCalibrationPoints([point]);
          return;
        }

        const start = calibrationPoints[0];
        const pixels = Math.hypot(point.x - start.x, point.y - start.y);
        if (pixels < 8) {
          setNotice('Točki sta preblizu — kliknite dlje narazen.');
          return;
        }

        setCalibrationPoints([start, point]);
        setPendingCalibration({ pixels });
        setMode('idle');
        setNotice(null);
      }
    },
    [canvasSize, mode, corners, calibrationPoints, pxPerMeter]
  );

  const toggleMarkArea = () => {
    if (mode === 'corners') {
      setMode('idle');
      return;
    }
    setCorners([]);
    setCalibrationPoints([]);
    setPendingCalibration(null);
    setSliderPosition(0);
    setMode('corners');
    setNotice(null);
  };

  const toggleCalibrate = () => {
    if (mode === 'calibrate') {
      setMode('idle');
      return;
    }
    setCalibrationPoints([]);
    setPendingCalibration(null);
    setMode('calibrate');
    setNotice(null);
  };

  const confirmCalibration = () => {
    if (!pendingCalibration) return;

    const cm = Number.parseFloat(referenceCm.replace(',', '.'));
    if (!Number.isFinite(cm) || cm <= 0) {
      setNotice('Vnesite veljavno dolžino v cm.');
      return;
    }

    const meters = cm / 100;
    const scale = pendingCalibration.pixels / meters;
    setPxPerMeter(scale);
    setPendingCalibration(null);
    setNotice(`Merilo: ${Math.round(scale)} px/m. Višina ograje se zdaj prilagaja drsniku.`);
  };

  const cancelCalibration = () => {
    setPendingCalibration(null);
    setCalibrationPoints([]);
    setNotice(null);
  };

  const resetCalibration = () => {
    setPxPerMeter(null);
    setCalibrationPoints([]);
    setPendingCalibration(null);
    setMode('idle');
    setNotice('Merilo je ponastavljeno.');
  };

  const resetArea = () => {
    setCorners([]);
    setMode('idle');
    setNotice(null);
  };

  const downloadMontage = useCallback(() => {
    if (!image || corners.length !== 4 || canvasSize.width <= 0) return;

    const width = image.naturalWidth;
    const height = image.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(image, 0, 0, width, height);

    const scaleX = width / canvasSize.width;
    const scaleY = height / canvasSize.height;
    const scale = (scaleX + scaleY) / 2;
    const scaledCorners = corners.map(point => ({
      x: point.x * scaleX,
      y: point.y * scaleY
    })) as [Point, Point, Point, Point];

    const quads = buildFenceQuads(
      scaledCorners,
      {
        orientation: config.orientation,
        boardWidthMm: config.profile.width,
        gapMm: config.boardSpacing,
        heightMm: config.fenceHeight
      },
      pxPerMeter ? pxPerMeter * scale : null
    );

    drawQuads(ctx, quads, config.color.hex, scale);

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(scaledCorners[3].x, scaledCorners[3].y);
    ctx.lineTo(scaledCorners[2].x, scaledCorners[2].y);
    ctx.stroke();
    ctx.restore();

    const link = document.createElement('a');
    link.download = `roksal-vizualizacija-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [image, canvasSize, corners, config, pxPerMeter]);

  const availableProfiles = fenceProfiles(config.orientation);

  const changeOrientation = (orientation: 'vertical' | 'horizontal') => {
    const profiles = fenceProfiles(orientation);
    setConfig(prev => {
      const profile = profiles.find(p => p.id === prev.profile.id) ?? profiles[0] ?? prev.profile;
      const color = profile.colors.find(c => c.id === prev.color.id) ?? profile.colors[0] ?? prev.color;
      return {
        ...prev,
        orientation,
        profile,
        color,
        boardSpacing: profile.recommendedBoardSpacing
      };
    });
  };

  const updateProfile = (profileId: string) => {
    const profile = availableProfiles.find(p => p.id === profileId);
    if (!profile) return;
    setConfig(prev => ({
      ...prev,
      profile,
      color: profile.colors[0] ?? prev.color,
      boardSpacing: profile.recommendedBoardSpacing
    }));
  };

  const updateColor = (colorId: string) => {
    const color = config.profile.colors.find(c => c.id === colorId);
    if (color) {
      setConfig(prev => ({ ...prev, color }));
    }
  };

  const cornersDone = corners.length === 4;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">🏗️ Roksal vizualizator</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl"
            aria-label="Zapri"
          >
            ✕
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Platno */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900 rounded-lg p-4">
              <div
                className={`relative select-none overflow-hidden rounded border-2 border-slate-700 ${
                  mode === 'idle' ? 'cursor-default' : 'cursor-crosshair'
                }`}
                onClick={handleSurfaceClick}
              >
                <canvas ref={baseCanvasRef} className="block w-full h-auto" />

                {cornersDone && (
                  <canvas
                    ref={overlayCanvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
                  />
                )}

                <canvas
                  ref={guideCanvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />

                {cornersDone && sliderPosition > 0 && sliderPosition < 100 && (
                  <div
                    className="pointer-events-none absolute inset-y-0 z-10"
                    style={{ left: `${sliderPosition}%` }}
                  >
                    <div className="absolute inset-y-0 -ml-px w-0.5 bg-white/80" />
                    <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-slate-900">
                      ↔
                    </div>
                  </div>
                )}
              </div>

              {/* Before/After */}
              {cornersDone && (
                <div className="mt-4">
                  <label className="text-sm text-slate-300 mb-2 block">
                    Primerjava: original ↔ vizualizacija
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderPosition}
                    onChange={e => setSliderPosition(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Original</span>
                    <span>Vizualizacija</span>
                  </div>
                </div>
              )}
            </div>

            {/* Kontrole */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={toggleMarkArea}
                className={`px-4 py-2 rounded font-medium ${
                  mode === 'corners'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {mode === 'corners' ? '🛑 Končaj označevanje' : '✏️ Označi območje'}
              </button>
              <button
                onClick={toggleCalibrate}
                className={`px-4 py-2 rounded font-medium ${
                  mode === 'calibrate'
                    ? 'bg-cyan-700 hover:bg-cyan-800 text-white'
                    : 'bg-slate-600 hover:bg-slate-700 text-white'
                }`}
              >
                {mode === 'calibrate' ? '🛑 Končaj kalibracijo' : '📏 Kalibriraj merilo'}
              </button>
              <button
                onClick={resetArea}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded font-medium"
              >
                🗑️ Počisti območje
              </button>
              <button
                onClick={downloadMontage}
                disabled={!cornersDone}
                className={`px-4 py-2 rounded font-medium ${
                  cornersDone
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                💾 Prenesi montažo
              </button>
            </div>

            {mode === 'corners' && (
              <div className="mt-2 text-sm text-emerald-300">
                Kliknite {CORNER_NAMES[corners.length] ?? 'zadnji vogal'} — označite 4 vogale
                ograje po vrsti: zgoraj levo, zgoraj desno, spodaj desno, spodaj levo.
                {corners.length > 0 && ` (${corners.length}/4)`}
              </div>
            )}

            {mode === 'calibrate' && (
              <div className="mt-2 text-sm text-cyan-300">
                Kliknite začetek in konec znane dolžine (npr. višina osebe ali obstoječe ograje).
                {calibrationPoints.length === 1 && ' Zdaj kliknite še drugo točko.'}
              </div>
            )}

            {pendingCalibration && (
              <div className="mt-3 rounded border border-cyan-700 bg-slate-900 p-3">
                <p className="text-sm text-cyan-200 mb-2">
                  Znana dolžina med označenima točkama:
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={referenceCm}
                    onChange={e => setReferenceCm(e.target.value)}
                    className="w-24 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white"
                  />
                  <span className="text-sm text-slate-300">cm</span>
                  <button
                    onClick={confirmCalibration}
                    className="rounded bg-cyan-600 px-3 py-1 text-sm font-medium text-white hover:bg-cyan-700"
                  >
                    ✓ Potrdi merilo
                  </button>
                  <button
                    onClick={cancelCalibration}
                    className="rounded bg-slate-600 px-3 py-1 text-sm font-medium text-white hover:bg-slate-700"
                  >
                    Prekliči
                  </button>
                </div>
              </div>
            )}

            {notice && <div className="mt-2 text-sm text-amber-300">{notice}</div>}

            <div className="mt-2 text-xs">
              {pxPerMeter ? (
                <span className="text-emerald-400">
                  📏 Merilo: {Math.round(pxPerMeter)} px/m
                  <button onClick={resetCalibration} className="ml-2 underline hover:text-emerald-300">
                    ponastavi
                  </button>
                </span>
              ) : (
                <span className="text-slate-400">
                  Merilo ni kalibrirano — višina ograje je vezana na označeno območje.
                </span>
              )}
            </div>

            {cornersDone && (
              <div className="mt-2 text-sm text-emerald-400">
                ✓ Območje označeno. Izberite profil in barvo ter primerjajte z originalom.
              </div>
            )}
          </div>

          {/* Nastavitve */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Orientacija desk
              </label>
              <select
                value={config.orientation}
                onChange={e => changeOrientation(e.target.value as 'vertical' | 'horizontal')}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
              >
                <option value="vertical">Pokončno (vertikalno)</option>
                <option value="horizontal">Prečno (horizontalno)</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Profil</label>
              <select
                value={config.profile.id}
                onChange={e => updateProfile(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
              >
                {availableProfiles.map(profile => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name} ({profile.width}×{profile.thickness}mm)
                  </option>
                ))}
              </select>
              {config.profile.notes && (
                <p className="text-xs text-slate-400 mt-1">{config.profile.notes}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Barva</label>
              <div className="grid grid-cols-3 gap-2">
                {config.profile.colors.map(color => (
                  <button
                    key={color.id}
                    onClick={() => updateColor(color.id)}
                    className={`aspect-square rounded border-2 transition-all ${
                      config.color.id === color.id
                        ? 'border-emerald-500 scale-110'
                        : 'border-slate-600 hover:border-slate-500'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                    aria-label={color.name}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {config.color.name}
                {config.color.notes && ` - ${config.color.notes}`}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Razmak med deskami: {config.boardSpacing} mm
              </label>
              <input
                type="range"
                min={config.profile.minBoardSpacing}
                max={config.profile.maxBoardSpacing}
                value={config.boardSpacing}
                onChange={e => setConfig({ ...config, boardSpacing: Number(e.target.value) })}
                className="w-full accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>{config.profile.minBoardSpacing} mm</span>
                <span>{config.profile.maxBoardSpacing} mm</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Višina ograje:{' '}
                {pxPerMeter ? `${config.fenceHeight} mm` : 'po označenem območju'}
              </label>
              <input
                type="range"
                min="800"
                max="2000"
                step="50"
                value={config.fenceHeight}
                disabled={!pxPerMeter}
                onChange={e => setConfig({ ...config, fenceHeight: Number(e.target.value) })}
                className={`w-full accent-emerald-500 ${pxPerMeter ? '' : 'opacity-40'}`}
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>800 mm</span>
                <span>2000 mm</span>
              </div>
              {!pxPerMeter && (
                <p className="mt-1 text-xs text-amber-400">
                  📏 Za spreminjanje višine kalibrirajte merilo (npr. višina osebe).
                </p>
              )}
            </div>

            <div className="bg-blue-900/30 border border-blue-700 rounded p-3">
              <p className="text-xs text-blue-200">
                <strong>⚠️ Opomba:</strong> Vizualizacija je približna in služi predogledu.
                Višina je natančna le ob kalibraciji; perspektiva je ocenjena iz označenih vogalov.
                Barve so iz uradnega Roksal kataloga.
              </p>
              <p className="text-xs text-slate-400 mt-2">
                <strong>Vir podatkov:</strong> https://roksal.com/
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
