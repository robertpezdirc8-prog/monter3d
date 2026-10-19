/**
 * TradeCapture.tsx — Voden zajem po obrti (brez AI, samo kamera + skripte)
 * Uporablja cameraSDK (MediaDevices / ImageCapture / Canvas / DeviceOrientation).
 */
import { useEffect, useRef, useState } from 'react';
import {
  cameraSDK, collectCaptureMeta, TRADE_PROFILES,
  type TradeId, type FrameStats, type CaptureMeta,
  type CameraCapabilitiesInfo,
} from '../utils/cameraSDK';

interface CapturedShot {
  id: string;
  requirementId: string;
  dataUrl: string;
  stats: FrameStats;
  meta: CaptureMeta;
}

export default function TradeCapture({ trade, onBack }: { trade: TradeId; onBack: () => void }) {
  const profile = TRADE_PROFILES[trade];
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopWatchRef = useRef<(() => void) | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [stats, setStats] = useState<FrameStats | null>(null);
  const [caps, setCaps] = useState<CameraCapabilitiesInfo | null>(null);
  const [zoom, setZoom] = useState(1);
  const [torchOn, setTorchOn] = useState(false);
  const [activeReq, setActiveReq] = useState(profile.requirements[0].id);
  const [shots, setShots] = useState<CapturedShot[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!videoRef.current) return;
        await cameraSDK.start(videoRef.current, { facingMode: 'environment' });
        if (cancelled) return;
        setLive(true);
        setCaps(cameraSDK.getCapabilitiesInfo());
        stopWatchRef.current = cameraSDK.startLiveQualityWatch(setStats, 300);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Kamere ni bilo mogoče zagnati.');
      }
    })();
    return () => {
      cancelled = true;
      stopWatchRef.current?.();
      cameraSDK.stop();
    };
  }, []);

  const reqShots = (id: string) => shots.filter(s => s.requirementId === id);

  async function handleCapture() {
    if (!cameraSDK.isLive || busy) return;
    setBusy(true);
    try {
      const { dataUrl, stats: st } = await cameraSDK.capturePhoto(2048);
      const meta = await collectCaptureMeta();
      setShots(prev => [...prev, {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        requirementId: activeReq, dataUrl, stats: st, meta,
      }]);
    } catch (e: any) {
      setError(e?.message ?? 'Zajem ni uspel.');
    } finally {
      setBusy(false);
    }
  }

  async function handleZoom(v: number) {
    setZoom(v);
    await cameraSDK.setZoom(v);
  }

  async function handleTorch() {
    const next = !torchOn;
    const ok = await cameraSDK.setTorch(next);
    setTorchOn(ok ? next : torchOn);
  }

  async function handleFlip() {
    const cur = cameraSDK.activeTrack?.getSettings().facingMode;
    const target = cur === 'user' ? 'environment' : 'user';
    await cameraSDK.switchCamera(target as any);
    setCaps(cameraSDK.getCapabilitiesInfo());
  }

  function deleteShot(id: string) {
    setShots(prev => prev.filter(s => s.id !== id));
  }

  const activeRequirement = profile.requirements.find(r => r.id === activeReq)!;
  const doneCount = profile.requirements.filter(r => reqShots(r.id).length >= r.minPhotos).length;
  const qualityBadge = stats
    ? stats.quality === 'good'
      ? { txt: '✓ Kader je dober', cls: 'bg-green-600/90 text-white' }
      : stats.quality === 'blurry'
        ? { txt: '✋ Drži mirno — slika je zamegljena', cls: 'bg-amber-500/90 text-black' }
        : stats.quality === 'too_dark'
          ? { txt: '🔦 Premalo svetlobe — prižgi bliskavico', cls: 'bg-amber-500/90 text-black' }
          : { txt: '☀️ Preveč svetlobe / odsev', cls: 'bg-amber-500/90 text-black' }
    : null;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 max-w-2xl mx-auto">
      {/* Glava */}
      <div className="flex items-center gap-3 mb-3">
        <button onClick={onBack} className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600">← Nazaj</button>
        <h1 className="text-xl font-bold">{profile.icon} {profile.name}</h1>
        <span className="ml-auto text-sm bg-slate-700 px-2 py-1 rounded">
          Koraki: {doneCount}/{profile.requirements.length}
        </span>
      </div>

      {error && (
        <div className="mb-3 p-3 rounded bg-red-800/80 text-sm">{error}</div>
      )}

      {/* Izbor koraka za zajem */}
      <div className="flex flex-wrap gap-2 mb-3">
        {profile.requirements.map((r, i) => {
          const have = reqShots(r.id).length;
          const done = have >= r.minPhotos;
          return (
            <button key={r.id} onClick={() => setActiveReq(r.id)}
              className={`px-3 py-1.5 rounded-full text-xs border ${
                activeReq === r.id
                  ? 'bg-blue-600 border-blue-400'
                  : done ? 'bg-green-800 border-green-600' : 'bg-slate-800 border-slate-600'}`}>
              {i + 1}. {r.label} {done ? '✓' : `(${have}/${r.minPhotos})`}
            </button>
          );
        })}
      </div>

      <p className="text-sm text-slate-300 mb-2">📷 {activeRequirement.hint}
        {activeRequirement.reference && (
          <span className="ml-2 text-xs bg-slate-700 px-2 py-0.5 rounded">
            merilo: {activeRequirement.reference === 'a4' ? 'A4 papir'
              : activeRequirement.reference === 'metro' ? 'merilni trak'
              : activeRequirement.reference === 'level' ? 'vodotok/level' : 'kovanec'}
          </span>
        )}
      </p>

      {/* Živi predogled */}
      <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] mb-3"
        onPointerDown={e => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          cameraSDK.focusAt(e.clientX - rect.left, e.clientY - rect.top);
        }}>
        <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
        {!live && !error && <div className="absolute inset-0 grid place-items-center text-slate-400">Zaganjam kamero…</div>}
        {qualityBadge && live && (
          <div className={`absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold ${qualityBadge.cls}`}>
            {qualityBadge.txt}
          </div>
        )}
        {stats && live && (
          <div className="absolute bottom-2 right-2 text-[10px] bg-black/60 rounded px-2 py-1">
            ostrina {stats.sharpness} · svetl. {stats.meanBrightness}
          </div>
        )}
      </div>

      {/* Kontrolna vrstica */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button onClick={handleCapture} disabled={!live || busy}
          className="flex-1 min-w-32 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 font-bold">
          {busy ? '…' : '⬤ Posnemi'}
        </button>
        {caps?.zoomRange && caps.zoomRange.max > caps.zoomRange.min && (
          <label className="flex items-center gap-2 text-xs">
            🔍 <input type="range" min={caps.zoomRange.min} max={caps.zoomRange.max}
              step={caps.zoomRange.step} value={zoom}
              onChange={e => handleZoom(+e.target.value)} className="w-24 accent-blue-500" />
            {zoom.toFixed(1)}×
          </label>
        )}
        {caps?.torchSupported && (
          <button onClick={handleTorch}
            className={`px-3 py-2 rounded-lg text-sm ${torchOn ? 'bg-yellow-500 text-black' : 'bg-slate-700'}`}>
            🔦
          </button>
        )}
        {(caps?.facingModes.length ?? 0) > 1 && (
          <button onClick={handleFlip} className="px-3 py-2 rounded-lg bg-slate-700 text-sm">🔄</button>
        )}
      </div>

      {/* Galerija posnetih korakov */}
      <div className="grid grid-cols-3 gap-2">
        {shots.filter(s => s.requirementId === activeReq).map(s => (
          <div key={s.id} className="relative rounded-lg overflow-hidden border border-slate-700">
            <img src={s.dataUrl} alt="" className="w-full h-24 object-cover" />
            <div className="absolute top-1 right-1 flex gap-1">
              <span className={`text-[9px] px-1 rounded ${s.stats.quality === 'good' ? 'bg-green-600' : 'bg-amber-600'}`}>
                {s.stats.quality === 'good' ? 'OK' : s.stats.quality}
              </span>
              <button onClick={() => deleteShot(s.id)} className="text-[9px] px-1 rounded bg-red-700">✕</button>
            </div>
            <div className="text-[9px] bg-slate-800 px-1 py-0.5 truncate">
              {s.meta.tiltDeg != null && <>↡{s.meta.tiltDeg}° </>}
              {s.meta.headingDeg != null && <>🧭{s.meta.headingDeg}° </>}
              {s.meta.lat != null && <>📍</>}
            </div>
          </div>
        ))}
        {reqShots(activeReq).length === 0 && (
          <p className="col-span-3 text-sm text-slate-400">Za ta korak še ni posnetkov.</p>
        )}
      </div>
    </div>
  );
}
