/**
 * Mera3D Pro - Perspective Fence Visualizer
 * 
 * User marks 4 corners of a fence area on a photo.
 * Creates a perspective-aligned preview with Roksal profile rendering.
 * 
 * ⚠️ LIMITATIONS:
 * - 2D perspective alignment does NOT reconstruct depth
 * - No photorealistic occlusion handling
 * - For true 3D, use COLMAP (separate process)
 * - Accuracy depends on correct corner marking
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Photo } from '../types';
import { ROKSAL_PROFILES, ROKSAL_COLORS, getVerticalProfiles, getHorizontalProfiles } from '../data/roksalCatalog';
import type { RoksalProfile, RoksalColor } from '../data/roksalCatalog';
import { computePerspectiveMatrix, type PerspectiveCorners } from '../utils/perspectiveTransform';
import { loadOpenCV, isOpenCVLoaded, imageToMat, matToImageData } from '../utils/opencvLoader';

interface PerspectiveFenceVisualizerProps {
  photo: Photo;
  onClose: () => void;
}

type CornerKey = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft';

export function PerspectiveFenceVisualizer({ photo, onClose }: PerspectiveFenceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [corners, setCorners] = useState<Partial<Record<CornerKey, { x: number; y: number }>>>({});
  const [currentCorner, setCurrentCorner] = useState<CornerKey>('topLeft');
  const [isWarping, setIsWarping] = useState(false);
  const [warpedImage, setWarpedImage] = useState<ImageData | null>(null);
  const [opencvReady, setOpenCVReady] = useState(isOpenCVLoaded());
  const [error, setError] = useState<string | null>(null);
  
  const [config, setConfig] = useState({
    profile: ROKSAL_PROFILES[0],
    color: ROKSAL_COLORS['anthracite'],
    orientation: 'vertical' as 'vertical' | 'horizontal',
    boardSpacing: 20,
    fenceHeight: 1000
  });

  // Load OpenCV on mount
  useEffect(() => {
    loadOpenCV()
      .then(() => setOpenCVReady(true))
      .catch(err => {
        setError(`OpenCV.js ni bilo mogoče naložiti: ${err.message}. Uporabljam rezervni 2D način.`);
        console.warn('OpenCV.js load failed:', err);
      });
  }, []);

  // Draw base image
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
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
      
      // Also set overlay canvas size
      if (overlayCanvasRef.current) {
        overlayCanvasRef.current.width = width;
        overlayCanvasRef.current.height = height;
      }
    };
    img.src = photo.dataUrl;
  }, [photo]);

  // Draw corner markers and polygon
  const drawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const cornerList = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as CornerKey[];
    const placedCorners = cornerList.filter(k => corners[k]);
    
    // Draw polygon if we have at least 2 corners
    if (placedCorners.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      
      const first = corners[placedCorners[0]]!;
      ctx.moveTo(first.x, first.y);
      
      for (let i = 1; i < placedCorners.length; i++) {
        const c = corners[placedCorners[i]]!;
        ctx.lineTo(c.x, c.y);
      }
      
      // Close if all 4 corners placed
      if (placedCorners.length === 4) {
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        ctx.fill();
      }
      
      ctx.stroke();
    }
    
    // Draw corner markers
    const labels: Record<CornerKey, string> = {
      topLeft: '↖ ZG-Levo',
      topRight: '↗ ZG-Desno',
      bottomRight: '↘ SP-Desno',
      bottomLeft: '↙ SP-Levo'
    };
    
    for (const key of cornerList) {
      const c = corners[key];
      if (!c) continue;
      
      const isCurrent = key === currentCorner;
      const isPlaced = !!c;
      
      // Draw marker
      ctx.beginPath();
      ctx.arc(c.x, c.y, isCurrent ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = isPlaced ? '#00ff00' : '#ff6600';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(labels[key], c.x + 12, c.y - 5);
    }
    
    // Show instruction for next corner
    if (placedCorners.length < 4) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, canvas.height - 40, 350, 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = '13px sans-serif';
      ctx.fillText(`Kliknite na fotografijo za: ${labels[currentCorner]}`, 20, canvas.height - 20);
    }
  }, [corners, currentCorner]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  // Handle canvas click
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const cornerOrder: CornerKey[] = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
    const currentIndex = cornerOrder.indexOf(currentCorner);
    
    setCorners(prev => ({ ...prev, [currentCorner]: { x, y } }));
    
    // Move to next corner
    if (currentIndex < 3) {
      setCurrentCorner(cornerOrder[currentIndex + 1]);
    }
  }, [currentCorner]);

  // Reset corners
  const handleReset = useCallback(() => {
    setCorners({});
    setCurrentCorner('topLeft');
    setWarpedImage(null);
  }, []);

  // Perform perspective warp
  const handleWarp = useCallback(async () => {
    if (!corners.topLeft || !corners.topRight || !corners.bottomRight || !corners.bottomLeft) {
      setError('Označite vse 4 vogale pred warpom.');
      return;
    }
    
    setIsWarping(true);
    setError(null);
    
    try {
      const perspectiveCorners: PerspectiveCorners = {
        topLeft: corners.topLeft,
        topRight: corners.topRight,
        bottomRight: corners.bottomRight,
        bottomLeft: corners.bottomLeft
      };
      
      // Calculate output dimensions
      const widthTop = Math.sqrt(
        (corners.topRight.x - corners.topLeft.x) ** 2 + 
        (corners.topRight.y - corners.topLeft.y) ** 2
      );
      const widthBottom = Math.sqrt(
        (corners.bottomRight.x - corners.bottomLeft.x) ** 2 + 
        (corners.bottomRight.y - corners.bottomLeft.y) ** 2
      );
      const heightLeft = Math.sqrt(
        (corners.bottomLeft.x - corners.topLeft.x) ** 2 + 
        (corners.bottomLeft.y - corners.topLeft.y) ** 2
      );
      const heightRight = Math.sqrt(
        (corners.bottomRight.x - corners.topRight.x) ** 2 + 
        (corners.bottomRight.y - corners.topRight.y) ** 2
      );
      
      const outputWidth = Math.round((widthTop + widthBottom) / 2);
      const outputHeight = Math.round((heightLeft + heightRight) / 2);
      
      if (opencvReady) {
        // Use OpenCV for accurate perspective warp
        const cv = await loadOpenCV();
        
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = photo.dataUrl;
        });
        
        const srcMat = imageToMat(cv, img);
        const dstMat = new cv.Mat(outputHeight, outputWidth, cv.CV_8UC4);
        
        try {
          const srcPoints = new cv.Mat(4, 1, cv.CV_32FC2);
          srcPoints.data32F[0] = perspectiveCorners.topLeft.x;
          srcPoints.data32F[1] = perspectiveCorners.topLeft.y;
          srcPoints.data32F[2] = perspectiveCorners.topRight.x;
          srcPoints.data32F[3] = perspectiveCorners.topRight.y;
          srcPoints.data32F[4] = perspectiveCorners.bottomRight.x;
          srcPoints.data32F[5] = perspectiveCorners.bottomRight.y;
          srcPoints.data32F[6] = perspectiveCorners.bottomLeft.x;
          srcPoints.data32F[7] = perspectiveCorners.bottomLeft.y;
          
          const dstPoints = new cv.Mat(4, 1, cv.CV_32FC2);
          dstPoints.data32F[0] = 0;
          dstPoints.data32F[1] = 0;
          dstPoints.data32F[2] = outputWidth - 1;
          dstPoints.data32F[3] = 0;
          dstPoints.data32F[4] = outputWidth - 1;
          dstPoints.data32F[5] = outputHeight - 1;
          dstPoints.data32F[6] = 0;
          dstPoints.data32F[7] = outputHeight - 1;
          
          const M = cv.getPerspectiveTransform(srcPoints, dstPoints);
          cv.warpPerspective(srcMat, dstMat, M, new cv.Size(outputWidth, outputHeight));
          
          const resultImageData = matToImageData(cv, dstMat);
          setWarpedImage(resultImageData);
          
          srcPoints.delete();
          dstPoints.delete();
          M.delete();
        } finally {
          srcMat.delete();
          dstMat.delete();
        }
      } else {
        // Fallback: use pure JS DLT
        const matrix = computePerspectiveMatrix(perspectiveCorners, outputWidth, outputHeight);
        console.log('Using JS DLT fallback, matrix:', matrix);
        // TODO: Implement JS-based warp as fallback
        setError('OpenCV.js ni na voljo. JS fallback še ni implementiran.');
      }
    } catch (err) {
      setError(`Napaka pri perspektivni transformaciji: ${err instanceof Error ? err.message : 'Neznana napaka'}`);
    } finally {
      setIsWarping(false);
    }
  }, [corners, opencvReady, photo.dataUrl]);

  const allCornersPlaced = corners.topLeft && corners.topRight && corners.bottomRight && corners.bottomLeft;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">📐 Perspektivni Visualizer</h2>
            <p className="text-xs text-slate-400 mt-1">
              Označite 4 vogale ograje za perspektivno poravnan predogled
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">✕</button>
        </div>

        {/* Limitation Warning */}
        <div className="mx-4 mt-4 bg-amber-900/30 border border-amber-700 rounded-lg p-3">
          <p className="text-xs text-amber-200">
            ⚠️ <strong>Opozorilo:</strong> 2D perspektivna poravnava NE zagotavlja rekonstrukcije globine 
            ali fotorealistične okluzije. Za natančno 3D rekonstrukcijo uporabite COLMAP (ločen proces).
            {opencvReady ? ' ✅ OpenCV.js je pripravljen.' : ' ⏳ OpenCV.js se nalaga...'}
          </p>
        </div>

        {error && (
          <div className="mx-4 mt-2 bg-red-900/30 border border-red-700 rounded-lg p-3">
            <p className="text-xs text-red-200">❌ {error}</p>
          </div>
        )}

        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Canvas area */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900 rounded-lg p-4 relative">
              <div className="relative inline-block">
                <canvas ref={canvasRef} className="block rounded" />
                <canvas
                  ref={overlayCanvasRef}
                  onClick={handleCanvasClick}
                  className="absolute top-0 left-0 cursor-crosshair rounded"
                />
              </div>
              
              {/* Controls */}
              <div className="mt-4 flex gap-2 flex-wrap">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm"
                >
                  🔄 Ponastavi
                </button>
                <button
                  onClick={handleWarp}
                  disabled={!allCornersPlaced || isWarping}
                  className={`px-4 py-2 rounded text-white text-sm font-medium ${
                    allCornersPlaced && !isWarping
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-slate-600 cursor-not-allowed'
                  }`}
                >
                  {isWarping ? '⏳ Obdelava...' : '📐 Perspektivna transformacija'}
                </button>
              </div>
              
              {/* Corner status */}
              <div className="mt-3 grid grid-cols-4 gap-2">
                {(['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as CornerKey[]).map(key => (
                  <div
                    key={key}
                    className={`text-xs p-2 rounded text-center ${
                      corners[key] ? 'bg-emerald-900/50 text-emerald-300' : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {key === 'topLeft' && '↖ ZG-Levo'}
                    {key === 'topRight' && '↗ ZG-Desno'}
                    {key === 'bottomRight' && '↘ SP-Desno'}
                    {key === 'bottomLeft' && '↙ SP-Levo'}
                    {corners[key] && ' ✓'}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Configuration panel */}
          <div className="space-y-4">
            {/* Profile selection */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Profil</label>
              <select
                value={config.profile.id}
                onChange={(e) => {
                  const profile = ROKSAL_PROFILES.find(p => p.id === e.target.value);
                  if (profile) setConfig(prev => ({ ...prev, profile }));
                }}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
              >
                {ROKSAL_PROFILES.map(profile => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name} ({profile.width}×{profile.thickness}mm)
                  </option>
                ))}
              </select>
            </div>

            {/* Color selection */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Barva</label>
              <div className="grid grid-cols-4 gap-2">
                {config.profile.colors.map(color => (
                  <button
                    key={color.id}
                    onClick={() => setConfig(prev => ({ ...prev, color: ROKSAL_COLORS[color.id] || prev.color }))}
                    className={`aspect-square rounded border-2 ${
                      config.color.id === color.id ? 'border-emerald-500 scale-110' : 'border-slate-600'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">{config.color.name}</p>
            </div>

            {/* Board spacing */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Razmak: {config.boardSpacing}mm
              </label>
              <input
                type="range"
                min={config.profile.minBoardSpacing}
                max={config.profile.maxBoardSpacing}
                value={config.boardSpacing}
                onChange={(e) => setConfig(prev => ({ ...prev, boardSpacing: Number(e.target.value) }))}
                className="w-full"
              />
            </div>

            {/* Warped result */}
            {warpedImage && (
              <div>
                <label className="text-sm font-medium text-emerald-400 mb-2 block">
                  ✅ Perspektivno poravnan predogled
                </label>
                <canvas
                  ref={(canvas) => {
                    if (canvas && warpedImage) {
                      canvas.width = warpedImage.width;
                      canvas.height = warpedImage.height;
                      const ctx = canvas.getContext('2d');
                      if (ctx) ctx.putImageData(warpedImage, 0, 0);
                    }
                  }}
                  className="w-full border border-emerald-700 rounded"
                  style={{ maxHeight: '200px', objectFit: 'contain' }}
                />
                <p className="text-xs text-slate-400 mt-1">
                  {warpedImage.width}×{warpedImage.height}px
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
