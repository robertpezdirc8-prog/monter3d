/**
 * QualityCheckView.tsx — korak »Kakovost«: pregled kakovosti posnetkov.
 */
import type { Photo } from '../../types';
import { IconCheck, IconWarning, IconX } from '../icons';
export function QualityBadge({ label, value }: { label: string; value: number }) {
  const color = value > 0.7 ? 'text-emerald-400' : value > 0.4 ? 'text-amber-400' : 'text-red-400';
  const bg = value > 0.7 ? 'bg-emerald-900/30' : value > 0.4 ? 'bg-amber-900/30' : 'bg-red-900/30';
  return (
    <div className={`${bg} rounded p-2 text-center`}>
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{(value * 100).toFixed(0)}%</p>
    </div>
  );
}

export function QualityCheckView({ photos, onSelectPhoto }: { photos: Photo[]; onSelectPhoto: (p: Photo) => void }) {
  const accepted = photos.filter(p => p.status === 'analyzed');
  const rejected = photos.filter(p => p.status === 'rejected');
  const pending = photos.filter(p => p.status === 'pending');

  return (
    <div>
      <h2 className="text-xl font-bold text-emerald-400 mb-4">✅ Kontrola kakovosti</h2>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-emerald-400">{accepted.length}</p>
          <p className="text-xs text-emerald-300">Sprejeto</p>
        </div>
        <div className="bg-amber-900/20 border border-amber-800 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-amber-400">{pending.length}</p>
          <p className="text-xs text-amber-300">V čakanju</p>
        </div>
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-red-400">{rejected.length}</p>
          <p className="text-xs text-red-300">Zavrnjeno</p>
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p>Ni fotografij. Najprej zajemite fotografije.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {photos.map(photo => (
            <div key={photo.id} className="bg-slate-800 rounded-lg p-3 flex items-center gap-3">
              <img src={photo.dataUrl} alt="" className="w-16 h-12 object-cover rounded" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <StatusIcon status={photo.status} />
                  <span className="text-sm text-slate-200">
                    {photo.timestamp.toLocaleTimeString('sl-SI')}
                  </span>
                </div>
                <div className="flex gap-3 mt-1 text-xs text-slate-400">
                  <span>Ostrina: {(photo.quality.sharpness * 100).toFixed(0)}%</span>
                  <span>Svetlost: {(photo.quality.brightness * 100).toFixed(0)}%</span>
                  {photo.quality.glareDetected && <span className="text-amber-400">⚠ Bleščanje</span>}
                </div>
                {photo.rejectionReason && (
                  <p className="text-xs text-red-400 mt-1">{photo.rejectionReason}</p>
                )}
              </div>
              <button
                onClick={() => onSelectPhoto(photo)}
                className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300"
              >
                Odpri
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StatusIcon({ status }: { status: string }) {
  if (status === 'analyzed') return <span className="text-emerald-400"><IconCheck /></span>;
  if (status === 'rejected') return <span className="text-red-400"><IconX /></span>;
  return <span className="text-amber-400"><IconWarning /></span>;
}
