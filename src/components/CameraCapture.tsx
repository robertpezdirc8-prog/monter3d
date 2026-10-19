/**
 * Mera3D Pro - Camera Capture Component
 * 
 * Real camera access using MediaDevices API (getUserMedia).
 * Supports rear camera on mobile devices.
 * Provides live preview, capture, retake, and quality assessment.
 * 
 * AI detection: RF-DETR Nano (brezplačen, Apache 2.0) prek Transformers.js.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { assessImageQuality } from '../utils/cv';
import type { ImageQuality } from '../types';
import { useAiDetection } from '../hooks/useAiDetection';
import { useDepthEstimation } from '../hooks/useDepthEstimation';
import { useSegmentation } from '../hooks/useSegmentation';
import { AiOverlay } from './AiOverlay';
import { displayPointToImage } from '../utils/imageCoords';

interface CameraCaptureProps {
  onCapture: (dataUrl: string, quality: ImageQuality, stepId?: string) => void;
  onClose?: () => void;
  stepId?: string;
}

export function CameraCapture({ onCapture, onClose, stepId }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const aiTimerRef = useRef<number | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedQuality, setCapturedQuality] = useState<ImageQuality | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState({ w: 0, h: 0 });

  const { status: aiStatus, detections, statusText: aiText, loadModel, detect, clearDetections } = useAiDetection();
  const {
    status: depthStatus,
    statusText: depthText,
    result: depthResult,
    estimate: estimateDepth,
    depthPercentAt,
    reset: resetDepth
  } = useDepthEstimation();
  const {
    status: segStatus,
    statusText: segText,
    result: segResult,
    segmentAt,
    reset: resetSegmentation
  } = useSegmentation();

  // Orodja za obdelavo zajete fotografije
  const [previewMode, setPreviewMode] = useState<'none' | 'depth' | 'segment'>('none');
  const [depthOpacity, setDepthOpacity] = useState(0.65);
  const [depthPoint, setDepthPoint] = useState<{ xPct: number; yPct: number; percent: number } | null>(null);

  const resetAnalysis = useCallback(() => {
    setPreviewMode('none');
    setDepthPoint(null);
    resetDepth();
    resetSegmentation();
  }, [resetDepth, resetSegmentation]);

  // Check if camera API is available
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Kamera ni podprta v tem brskalniku. Uporabite Chrome, Firefox ali Safari na mobilni napravi.');
      setCameraSupported(false);
    }
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    setError(null);
    setCapturedImage(null);
    setCapturedQuality(null);
    clearDetections();

    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
        // Track video dimensions once available
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        setVideoDimensions({ w: settings.width ?? 640, h: settings.height ?? 480 });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Neznana napaka';
      if (message.includes('NotAllowedError') || message.includes('Permission')) {
        setError('Dostop do kamere je bil zavrnjen. Omogočite dovoljenja v nastavitvah brskalnika.');
      } else if (message.includes('NotFoundError') || message.includes('DevicesNotFound')) {
        setError('Kamera ni bila najdena. Preverite, ali je naprava pravilno povezana.');
      } else if (message.includes('NotReadableError')) {
        setError('Kamera je že v uporabi. Zaprite druge aplikacije, ki uporabljajo kamero.');
      } else {
        setError(`Napaka kamere: ${message}`);
      }
      setIsStreaming(false);
    }
  }, [facingMode, clearDetections]);

  // Start camera on mount
  useEffect(() => {
    if (cameraSupported) {
      startCamera();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [cameraSupported, startCamera]);

  // Periodična AI detekcija na živem videu (vsako sekundo)
  useEffect(() => {
    if (!aiEnabled || !isStreaming || aiStatus !== 'ready') return;

    const runAi = async () => {
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        await detect(videoRef.current);
      }
    };

    // Prvi klic takoj, potem vsako sekundo
    runAi();
    aiTimerRef.current = window.setInterval(runAi, 1000);

    return () => {
      if (aiTimerRef.current !== null) {
        clearInterval(aiTimerRef.current);
        aiTimerRef.current = null;
      }
    };
  }, [aiEnabled, isStreaming, aiStatus, detect]);

  // Vklop/izklop AI
  const toggleAi = useCallback(async () => {
    if (!aiEnabled) {
      // Vklop — najprej naložimo model
      await loadModel();
      setAiEnabled(true);
    } else {
      // Izklop
      setAiEnabled(false);
      clearDetections();
      if (aiTimerRef.current !== null) {
        clearInterval(aiTimerRef.current);
        aiTimerRef.current = null;
      }
    }
  }, [aiEnabled, loadModel, clearDetections]);

  // 🌊 Globina — zaženi analizo zajete fotografije
  const startDepthAnalysis = useCallback(async () => {
    if (!capturedImage) return;
    setPreviewMode('depth');
    setDepthPoint(null);
    if (!depthResult) {
      await estimateDepth(capturedImage);
    }
  }, [capturedImage, depthResult, estimateDepth]);

  // 🪄 Segmentacija — klik na objekt
  const startSegmentTool = useCallback(() => {
    setPreviewMode('segment');
    setDepthPoint(null);
    resetSegmentation();
  }, [resetSegmentation]);

  const handlePreviewClick = useCallback(async (e: React.MouseEvent<HTMLImageElement>) => {
    if (previewMode === 'none') return;

    const img = e.currentTarget;
    const point = displayPointToImage(
      e.clientX,
      e.clientY,
      img.getBoundingClientRect(),
      img.naturalWidth,
      img.naturalHeight
    );

    if (previewMode === 'depth') {
      const percent = depthPercentAt(point.x, point.y);
      if (percent !== null) {
        setDepthPoint({
          xPct: (point.x / img.naturalWidth) * 100,
          yPct: (point.y / img.naturalHeight) * 100,
          percent
        });
      }
      return;
    }

    if (capturedImage) {
      await segmentAt(capturedImage, point.x, point.y);
    }
  }, [previewMode, depthPercentAt, segmentAt, capturedImage]);

  const applyCutout = useCallback(() => {
    if (!segResult) return;
    setCapturedImage(segResult.cutoutDataUrl);
    resetAnalysis();
  }, [segResult, resetAnalysis]);

  // Capture photo from video
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    // Get image data for quality assessment
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const quality = assessImageQuality(imageData);

    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    setCapturedImage(dataUrl);
    setCapturedQuality(quality);
    setIsCapturing(false);
    resetAnalysis();

    // Stop camera stream after capture
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);

    // Ustavimo AI timer
    if (aiTimerRef.current !== null) {
      clearInterval(aiTimerRef.current);
      aiTimerRef.current = null;
    }
  }, [assessImageQuality, resetAnalysis]);

  // Confirm captured photo
  const confirmCapture = useCallback(() => {
    if (capturedImage && capturedQuality) {
      onCapture(capturedImage, capturedQuality, stepId);
    }
  }, [capturedImage, capturedQuality, onCapture, stepId]);

  // Retake photo
  const retakePhoto = useCallback(() => {
    resetAnalysis();
    setCapturedImage(null);
    setCapturedQuality(null);
    startCamera();
  }, [startCamera, resetAnalysis]);

  // Switch camera
  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  }, []);

  // Close
  const handleClose = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (aiTimerRef.current !== null) {
      clearInterval(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    clearDetections();
    resetAnalysis();
    if (onClose) onClose();
  }, [onClose, clearDetections, resetAnalysis]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-black/80">
        <button
          onClick={handleClose}
          className="text-white px-3 py-1 text-sm"
        >
          ✕ Zapri
        </button>
        <span className="text-white text-sm font-medium">
          {capturedImage ? 'Predogled' : 'Zajem fotografije'}
        </span>
        <div className="flex gap-2">
          {isStreaming && (
            <button
              onClick={toggleAi}
              className={`text-white px-3 py-1 text-sm rounded ${
                aiEnabled ? 'bg-emerald-600' : 'bg-slate-700'
              }`}
            >
              {aiEnabled ? '🧠 AI vklopljen' : '🧠 AI'}
            </button>
          )}
          {isStreaming && (
            <button
              onClick={switchCamera}
              className="text-white px-3 py-1 text-sm bg-slate-700 rounded"
            >
              🔄 Obrni
            </button>
          )}
          {!isStreaming && <div className="w-16" />}
        </div>
      </div>

      {/* Video / Image area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
        {error && (
          <div className="text-center p-6 max-w-md">
            <div className="text-4xl mb-4">📷</div>
            <p className="text-white mb-4">{error}</p>
            <p className="text-gray-400 text-sm">
              Za zajem fotografij uporabite gumb "Naloži fotografijo" v glavnem vmesniku.
            </p>
          </div>
        )}

        {/* AI status text */}
        {aiStatus === 'loading' && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 bg-blue-800/80 text-white px-3 py-1 rounded-full text-xs">
            {aiText}
          </div>
        )}
        {aiStatus === 'error' && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 bg-red-800/80 text-white px-3 py-1 rounded-full text-xs">
            {aiText}
          </div>
        )}

        {/* Live video */}
        {isStreaming && !capturedImage && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="max-w-full max-h-full object-contain"
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />
            {/* AI overlay — samo če je vklopljen in pripravljen */}
            {aiEnabled && aiStatus === 'ready' && videoDimensions.w > 0 && (
              <AiOverlay
                detections={detections}
                width={videoDimensions.w}
                height={videoDimensions.h}
                useVideoDimensions
              />
            )}
            {/* Capture guide overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Corner markers */}
              <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-white/60" />
              <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-white/60" />
              <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 border-white/60" />
              <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-white/60" />
              {/* Center crosshair */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-6 h-px bg-white/40" />
                <div className="w-px h-6 bg-white/40 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              {/* Instructions */}
              <div className="absolute bottom-16 left-0 right-0 text-center">
                <p className="text-white/80 text-xs bg-black/50 inline-block px-3 py-1 rounded">
                  Poravnajte objekt znotraj okvirja • Vključite referenčno mero
                </p>
              </div>
              {/* AI detection count */}
              {aiEnabled && aiStatus === 'ready' && detections.length > 0 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                  🧠 {detections.length} objektov zaznanih
                </div>
              )}
            </div>
          </>
        )}

        {/* Captured image preview */}
        {capturedImage && (
          <div className="max-w-full max-h-full flex flex-col items-center">
            <div className="relative inline-block max-w-full">
              <img
                src={capturedImage}
                alt="Zajeta fotografija"
                onClick={handlePreviewClick}
                className={`max-w-full max-h-[62vh] object-contain ${
                  previewMode !== 'none' ? 'cursor-crosshair' : ''
                }`}
              />

              {/* Globinska karta */}
              {previewMode === 'depth' && depthResult && (
                <img
                  src={depthResult.heatmapDataUrl}
                  alt="Globinska karta"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  style={{ opacity: depthOpacity }}
                />
              )}

              {/* Maska izrezanega objekta */}
              {previewMode === 'segment' && segResult && (
                <img
                  src={segResult.maskDataUrl}
                  alt="Maska objekta"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />
              )}

              {/* Točka z relativno globino */}
              {previewMode === 'depth' && depthPoint && (
                <>
                  <span
                    className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white border-2 border-emerald-500 pointer-events-none"
                    style={{ left: `${depthPoint.xPct}%`, top: `${depthPoint.yPct}%` }}
                  />
                  <span
                    className="absolute -translate-x-1/2 -translate-y-[150%] whitespace-nowrap bg-black/80 text-white text-[11px] px-2 py-0.5 rounded pointer-events-none"
                    style={{ left: `${depthPoint.xPct}%`, top: `${depthPoint.yPct}%` }}
                  >
                    Globina: {depthPoint.percent} % {depthPoint.percent >= 50 ? '(bližje)' : '(dlje)'}
                  </span>
                </>
              )}
            </div>

            {capturedQuality && (
              <div className="mt-3 flex gap-2 flex-wrap justify-center px-4">
                <QualityBadge label="Kakovost" value={capturedQuality.overallScore} />
                <QualityBadge label="Ostrina" value={capturedQuality.sharpness} />
                <QualityBadge label="Svetlost" value={capturedQuality.brightness} />
                {capturedQuality.glareDetected && (
                  <span className="text-xs bg-amber-900/60 text-amber-200 px-2 py-1 rounded">
                    ⚠️ Bleščanje
                  </span>
                )}
                {capturedQuality.overallScore < 0.3 && (
                  <span className="text-xs bg-red-900/60 text-red-200 px-2 py-1 rounded">
                    ⚠️ Nizka kakovost - priporočamo ponovni posnetek
                  </span>
                )}
              </div>
            )}

            {/* Orodja: globina in izrez objekta */}
            <div className="mt-3 w-full max-w-xl px-4 space-y-2">
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => void startDepthAnalysis()}
                  disabled={depthStatus === 'loading' || depthStatus === 'running'}
                  className={`px-3 py-2 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                    previewMode === 'depth'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                  }`}
                >
                  🌊 Globina
                </button>
                <button
                  onClick={startSegmentTool}
                  disabled={segStatus === 'loading' || segStatus === 'running'}
                  className={`px-3 py-2 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                    previewMode === 'segment'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                  }`}
                >
                  🪄 Izreži objekt
                </button>
                {previewMode !== 'none' && (
                  <button
                    onClick={resetAnalysis}
                    className="px-3 py-2 rounded text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-100"
                  >
                    ✕ Prekliči orodje
                  </button>
                )}
              </div>

              {previewMode === 'depth' && (
                <div className="bg-slate-800/90 border border-slate-700 rounded p-2 text-[11px] text-slate-300 space-y-1">
                  {(depthStatus === 'loading' || depthStatus === 'running') && (
                    <p className="text-blue-300">{depthText}</p>
                  )}
                  {depthStatus === 'error' && <p className="text-red-400">{depthText}</p>}
                  {depthResult && (
                    <>
                      <p>
                        Kliknite sliko za relativno globino.{' '}
                        <span className="text-slate-400">Rdeče = bližje, modro = dlje.</span>
                      </p>
                      <label className="flex items-center gap-2">
                        <span className="shrink-0">Prosojnost</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={Math.round(depthOpacity * 100)}
                          onChange={(e) => setDepthOpacity(Number(e.target.value) / 100)}
                          className="w-full"
                        />
                      </label>
                      <p className="text-amber-300/90">
                        ⚠️ Relativna ocena iz fotografije — ni meritev v centimetrih.
                      </p>
                    </>
                  )}
                </div>
              )}

              {previewMode === 'segment' && (
                <div className="bg-slate-800/90 border border-slate-700 rounded p-2 text-[11px] text-slate-300 space-y-2">
                  {(segStatus === 'loading' || segStatus === 'running') && (
                    <p className="text-blue-300">{segText}</p>
                  )}
                  {segStatus === 'error' && <p className="text-red-400">{segText}</p>}
                  {segStatus !== 'loading' && segStatus !== 'running' && segStatus !== 'error' && !segResult && (
                    <p>Kliknite objekt na fotografiji — izrezali ga bomo s prosojnim ozadjem.</p>
                  )}
                  {segResult && (
                    <div className="flex flex-wrap items-center gap-3">
                      <div
                        className="rounded p-1"
                        style={{
                          backgroundImage:
                            'linear-gradient(45deg, #334155 25%, transparent 25%, transparent 75%, #334155 75%), linear-gradient(45deg, #334155 25%, #1e293b 25%, #1e293b 75%, #334155 75%)',
                          backgroundSize: '12px 12px',
                          backgroundPosition: '0 0, 6px 6px'
                        }}
                      >
                        <img
                          src={segResult.cutoutDataUrl}
                          alt="Izrez objekta"
                          className="h-16 w-auto object-contain"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-emerald-300">
                          Objekt pokriva {Math.round(segResult.coverage * 100)} % fotografije.
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={applyCutout}
                            className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                          >
                            ✓ Uporabi izrez
                          </button>
                          <button
                            onClick={resetSegmentation}
                            className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs"
                          >
                            ↺ Ponovi
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="p-4 bg-black/80 flex items-center justify-center gap-4">
        {isStreaming && !capturedImage && (
          <button
            onClick={capturePhoto}
            disabled={isCapturing}
            className="w-16 h-16 rounded-full bg-white border-4 border-slate-300 
                       hover:bg-gray-100 active:scale-95 transition-all
                       disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-full bg-white border-2 border-slate-400 mx-auto" />
          </button>
        )}

        {capturedImage && (
          <>
            <button
              onClick={retakePhoto}
              className="px-5 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
            >
              🔄 Ponovno
            </button>
            <button
              onClick={confirmCapture}
              className="px-5 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-medium"
            >
              ✓ Uporabi
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Quality badge component
function QualityBadge({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? 'bg-emerald-900/60 text-emerald-200' :
                pct >= 40 ? 'bg-amber-900/60 text-amber-200' :
                'bg-red-900/60 text-red-200';
  return (
    <span className={`text-xs px-2 py-1 rounded ${color}`}>
      {label}: {pct}%
    </span>
  );
}