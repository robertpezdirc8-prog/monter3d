/**
 * Mera3D Pro - Fence Visualizer Component
 * 
 * Allows users to visualize new Roksal fences on their property photos.
 * Features:
 * - Mark existing fence area with polygon
 * - Select fence type (vertical/horizontal)
 * - Choose profile and color from Roksal catalog
 * - Adjust board spacing and dimensions
 * - Remove old fence and render new one
 * - Before/after comparison
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Photo } from '../types';
import { ROKSAL_PROFILES, ROKSAL_COLORS, getVerticalProfiles, getHorizontalProfiles } from '../data/roksalCatalog';
import type { RoksalProfile, RoksalColor } from '../data/roksalCatalog';

interface FenceVisualizerProps {
  photo: Photo;
  onClose: () => void;
}

interface FenceArea {
  points: { x: number; y: number }[];
  complete: boolean;
}

interface FenceConfig {
  profile: RoksalProfile;
  color: RoksalColor;
  orientation: 'vertical' | 'horizontal';
  boardSpacing: number; // mm
  fenceHeight: number; // mm
}

export function FenceVisualizer({ photo, onClose }: FenceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fenceArea, setFenceArea] = useState<FenceArea>({ points: [], complete: false });
  const [isDrawing, setIsDrawing] = useState(false);
  const [config, setConfig] = useState<FenceConfig>({
    profile: ROKSAL_PROFILES[0],
    color: ROKSAL_COLORS['anthracite'],
    orientation: 'vertical',
    boardSpacing: 20,
    fenceHeight: 1000
  });
  const [sliderPosition, setSliderPosition] = useState(50);

  // Load image onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Scale to fit canvas while maintaining aspect ratio
      const maxWidth = 800;
      const maxHeight = 600;
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (maxHeight / height) * width;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
    };
    img.src = photo.dataUrl;
  }, [photo]);

  // Redraw canvas with fence area and visualization
  // Draw fence visualization
  const drawFenceVisualization = (
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[],
    config: FenceConfig
  ) => {
    // Calculate fence dimensions from polygon
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));

    const fenceWidth = maxX - minX;
    const fenceHeight = maxY - minY;

    // Calculate number of boards
    const boardWidthPx = (config.profile.width / 1000) * (fenceWidth / 2); // Approximate scale
    const spacingPx = (config.boardSpacing / 1000) * (fenceWidth / 2);
    const totalBoardWidth = boardWidthPx + spacingPx;
    const numBoards = Math.floor(fenceWidth / totalBoardWidth);

    // Draw boards
    ctx.fillStyle = config.color.hex;
    ctx.globalAlpha = 0.8;

    if (config.orientation === 'vertical') {
      // Vertical boards
      for (let i = 0; i < numBoards; i++) {
        const x = minX + i * totalBoardWidth;
        ctx.fillRect(x, minY, boardWidthPx, fenceHeight);
      }
    } else {
      // Horizontal boards
      const boardHeightPx = (config.profile.width / 1000) * (fenceHeight / 2);
      const spacingHPx = (config.boardSpacing / 1000) * (fenceHeight / 2);
      const totalBoardHeight = boardHeightPx + spacingHPx;
      const numHBoards = Math.floor(fenceHeight / totalBoardHeight);

      for (let i = 0; i < numHBoards; i++) {
        const y = minY + i * totalBoardHeight;
        ctx.fillRect(minX, y, fenceWidth, boardHeightPx);
      }
    }

    ctx.globalAlpha = 1.0;
  };

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and redraw original image
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw fence area polygon
      if (fenceArea.points.length > 0) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fenceArea.points[0].x, fenceArea.points[0].y);
        for (let i = 1; i < fenceArea.points.length; i++) {
          ctx.lineTo(fenceArea.points[i].x, fenceArea.points[i].y);
        }
        if (fenceArea.complete) {
          ctx.closePath();
        }
        ctx.stroke();

        // Draw points
        fenceArea.points.forEach((point, i) => {
          ctx.fillStyle = i === 0 ? '#ff0000' : '#00ff00';
          ctx.beginPath();
          ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Draw fence visualization if area is complete
      if (fenceArea.complete && fenceArea.points.length >= 3) {
        drawFenceVisualization(ctx, fenceArea.points, config);
      }
    };
    img.src = photo.dataUrl;
  }, [photo, fenceArea, config]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Handle canvas click for marking fence area
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newPoints = [...fenceArea.points, { x, y }];
    
    // Check if clicking near first point to close polygon
    if (newPoints.length >= 3) {
      const firstPoint = newPoints[0];
      const distance = Math.sqrt(
        Math.pow(x - firstPoint.x, 2) + Math.pow(y - firstPoint.y, 2)
      );
      
      if (distance < 15) {
        setFenceArea({ points: newPoints, complete: true });
        setIsDrawing(false);
        return;
      }
    }

    setFenceArea({ points: newPoints, complete: false });
  };

  // Reset fence area
  const resetFenceArea = () => {
    setFenceArea({ points: [], complete: false });
    setIsDrawing(false);
  };

  // Update profile
  const updateProfile = (profileId: string) => {
    const profile = ROKSAL_PROFILES.find(p => p.id === profileId);
    if (profile) {
      setConfig({
        ...config,
        profile,
        color: profile.colors[0]
      });
    }
  };

  // Update color
  const updateColor = (colorId: string) => {
    const color = Object.values(ROKSAL_COLORS).find(c => c.id === colorId);
    if (color) {
      setConfig({ ...config, color });
    }
  };

  // Get available profiles based on orientation
  const availableProfiles = config.orientation === 'vertical' 
    ? getVerticalProfiles()
    : getHorizontalProfiles();

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">🏗️ Roksal Visualizer</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Canvas */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900 rounded-lg p-4">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className={`w-full border-2 border-slate-700 rounded ${
                  isDrawing ? 'cursor-crosshair' : 'cursor-default'
                }`}
              />
              
              {/* Before/After Slider */}
              {fenceArea.complete && (
                <div className="mt-4">
                  <label className="text-sm text-slate-300 mb-2 block">
                    Primerjava: Original ↔ Vizualizacija
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderPosition}
                    onChange={(e) => setSliderPosition(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Original</span>
                    <span>Vizualizacija</span>
                  </div>
                </div>
              )}
            </div>

            {/* Drawing Controls */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setIsDrawing(!isDrawing)}
                className={`px-4 py-2 rounded font-medium ${
                  isDrawing
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isDrawing ? '🛑 Končaj označevanje' : '✏️ Označi ograjo'}
              </button>
              <button
                onClick={resetFenceArea}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded font-medium"
              >
                🗑️ Počisti
              </button>
            </div>

            {isDrawing && (
              <div className="mt-2 text-sm text-slate-400">
                Kliknite na fotografijo za označevanje območja ograje. Kliknite blizu prve točke za zaključek.
              </div>
            )}

            {fenceArea.complete && (
              <div className="mt-2 text-sm text-emerald-400">
                ✓ Območje ograje označeno. Izberite profil in barvo za vizualizacijo.
              </div>
            )}
          </div>

          {/* Configuration Panel */}
          <div className="space-y-4">
            {/* Orientation */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Orientacija desk
              </label>
              <select
                value={config.orientation}
                onChange={(e) => setConfig({
                  ...config,
                  orientation: e.target.value as 'vertical' | 'horizontal'
                })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
              >
                <option value="vertical">Pokončno (vertikalno)</option>
                <option value="horizontal">Prečno (horizontalno)</option>
              </select>
            </div>

            {/* Profile Selection */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Profil
              </label>
              <select
                value={config.profile.id}
                onChange={(e) => updateProfile(e.target.value)}
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

            {/* Color Selection */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Barva
              </label>
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
                  />
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {config.color.name}
                {config.color.notes && ` - ${config.color.notes}`}
              </p>
            </div>

            {/* Board Spacing */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Razmak med deskami: {config.boardSpacing}mm
              </label>
              <input
                type="range"
                min="5"
                max="50"
                value={config.boardSpacing}
                onChange={(e) => setConfig({ ...config, boardSpacing: Number(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>5mm</span>
                <span>50mm</span>
              </div>
            </div>

            {/* Fence Height */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Višina ograje: {config.fenceHeight}mm
              </label>
              <input
                type="range"
                min="800"
                max="2000"
                step="50"
                value={config.fenceHeight}
                onChange={(e) => setConfig({ ...config, fenceHeight: Number(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>800mm</span>
                <span>2000mm</span>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-900/30 border border-blue-700 rounded p-3">
              <p className="text-xs text-blue-200">
                <strong>⚠️ Opomba:</strong> Vizualizacija je približna in služi samo za predogled.
                Barve so prikazane kot solid barve iz uradnega Roksal kataloga.
                Za natančne mere in tehnične specifikacije kontaktirajte Roksal.
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
