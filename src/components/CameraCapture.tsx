/**
 * Mera3D Pro - Camera Capture Component
 * 
 * Real camera access using MediaDevices API (getUserMedia).
 * Supports rear camera on mobile devices.
 * Provides live preview, capture, retake, and quality assessment.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { assessImageQuality } from '../utils/cv';
import type { ImageQuality } from '../types';

interface CameraCaptureProps {
  onCapture: (dataUrl: string, quality: ImageQuality, stepId?: string) => void;
  onClose?: () => void;
  stepId?: string;
}

export function CameraCapture({ onCapture, onClose, stepId }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedQuality, setCapturedQuality] = useState<ImageQuality | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(true);

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
  }, [facingMode]);

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

    // Stop camera stream after capture
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Confirm captured photo
  const confirmCapture = useCallback(() => {
    if (capturedImage && capturedQuality) {
      onCapture(capturedImage, capturedQuality, stepId);
    }
  }, [capturedImage, capturedQuality, onCapture, stepId]);

  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setCapturedQuality(null);
    startCamera();
  }, [startCamera]);

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
    if (onClose) onClose();
  }, [onClose]);

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
            </div>
          </>
        )}

        {/* Captured image preview */}
        {capturedImage && (
          <div className="max-w-full max-h-full flex flex-col items-center">
            <img
              src={capturedImage}
              alt="Zajeta fotografija"
              className="max-w-full max-h-[70vh] object-contain"
            />
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
