/**
 * CaptureView.tsx — korak »Zajem«: nalaganje fotografij, voden zajem in
 * prikaz kakovosti posnetkov.
 */
import type { Photo, ObjectType } from '../../types';
import { IconCamera } from '../icons';
import { GuidedCapture } from '../GuidedCapture';
import { CoverageMapView, CameraGuide } from '../CoverageMap';
import { QualityBadge } from './QualityCheckView';
export function CaptureView({ photos, onUpload, fileInputRef, selectedPhoto, onSelectPhoto, onAnalyze, onDeletePhoto, onAnnotate, canvasRef, showInstructions, onToggleInstructions, onOpenCamera, objectType, capturedSteps, onCaptureStep }: {
  photos: Photo[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  selectedPhoto: Photo | null;
  onSelectPhoto: (p: Photo) => void;
  /** FAZA 17: brisanje fotografije iz projekta. */
  onDeletePhoto: (photoId: string) => void;
  /** FAZA 19: risanje označb (skic) čez fotografijo. */
  onAnnotate: (photoId: string) => void;
  onAnalyze: (p: Photo) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  showInstructions: boolean;
  onToggleInstructions: () => void;
  onOpenCamera: () => void;
  objectType: ObjectType;
  capturedSteps: string[];
  onCaptureStep: (stepId: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-emerald-400">📷 Zajem fotografij</h2>
        <button
          onClick={onToggleInstructions}
          className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded text-slate-300"
        >
          {showInstructions ? 'Skrij navodila' : 'Pokaži navodila'}
        </button>
      </div>

      {showInstructions && (
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-blue-300 mb-2">📋 Navodila za zajem</h3>
          <ul className="text-xs text-blue-200 space-y-1">
            <li>• Fotografirajte objekt z vsaj 30% prekrivanja med sosednjimi posnetki</li>
            <li>• Premikajte se počasi in enakomerno</li>
            <li>• Izogibajte se bleščanju in senci</li>
            <li>• Zajemite celoten objekt od začetka do konca</li>
            <li>• Za merilo vključite znan referenčni objekt (npr. meter, letvico)</li>
            <li>• Sistem bo sproti ocenjeval kakovost in pokritost</li>
          </ul>
        </div>
      )}

      {/* Guided Capture */}
      <div className="mb-4">
        <GuidedCapture
          objectType={objectType}
          capturedSteps={capturedSteps}
          onCaptureStep={onCaptureStep}
        />
      </div>

      {/* Kamera za monterje (brez AI) — bližnjica do menija obrti */}
      <div className="mb-4">
        <a
          href="#trade"
          className="block bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 rounded-lg p-3 text-center transition-colors"
        >
          <span className="text-sm font-semibold">📷 Voden zajem po obrti — ograje · keramika · fasade · krovstvo</span>
          <span className="block text-xs opacity-80 mt-0.5">Kamera + skripte, brez AI modela · samodejna prevera ostrine in svetlobe</span>
        </a>
      </div>

      {/* Camera and Upload buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={onOpenCamera}
          className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg p-4 flex flex-col items-center gap-2 transition-colors"
        >
          <IconCamera />
          <span className="text-sm font-medium">Zajem s kamero</span>
          <span className="text-xs opacity-75">Uporabi zadnjo kamero</span>
        </button>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-600 rounded-lg p-4 text-center cursor-pointer hover:border-emerald-500 transition-colors flex flex-col items-center justify-center gap-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={onUpload}
            className="hidden"
          />
          <span className="text-2xl">📁</span>
          <span className="text-sm text-slate-300 font-medium">Naloži datoteke</span>
          <span className="text-xs text-slate-500">JPG, PNG</span>
        </div>
      </div>

      {/* Analysis canvas */}
      {selectedPhoto && (
        <div className="bg-slate-800 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-300">Analiza značilnic</h3>
            <button
              onClick={() => onAnalyze(selectedPhoto)}
              className="text-xs bg-emerald-700 hover:bg-emerald-600 px-3 py-1 rounded text-white"
            >
              Ponovno analiziraj
            </button>
          </div>
          <canvas
            ref={canvasRef}
            className="w-full rounded border border-slate-700 max-h-96 object-contain"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            <QualityBadge label="Kakovost" value={selectedPhoto.quality.overallScore} />
            <QualityBadge label="Ostrina" value={selectedPhoto.quality.sharpness} />
            <QualityBadge label="Svetlost" value={selectedPhoto.quality.brightness} />
            <QualityBadge label="Kontrast" value={selectedPhoto.quality.contrast} />
          </div>
          {selectedPhoto.quality.glareDetected && (
            <div className="mt-2 bg-amber-900/30 border border-amber-700 rounded p-2 text-xs text-amber-300">
              ⚠️ Zaznano bleščanje. Priporočamo ponovni posnetek.
            </div>
          )}
        </div>
      )}

      {/* Coverage Map */}
      {photos.length > 0 && (
        <CoverageMapView photos={photos} gridSize={6} />
      )}



      {/* Camera Guide */}
      {selectedPhoto && (
        <div className="mt-4">
          <CameraGuide
            quality={selectedPhoto.quality}
            photoCount={photos.length}
            imageStable={selectedPhoto.quality.overallScore > 0.5}
          />
        </div>
      )}

      {/* Photo gallery */}
      {photos.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-4 mt-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">
            Zajete fotografije ({photos.length})
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {photos.map(photo => (
              <div
                key={photo.id}
                className={`relative rounded overflow-hidden aspect-video border-2 transition-all ${
                  selectedPhoto?.id === photo.id ? 'border-emerald-400 scale-105' : 'border-slate-700 hover:border-slate-500'
                }`}
              >
                <button
                  type="button"
                  onClick={() => { onSelectPhoto(photo); onAnalyze(photo); }}
                  className="block w-full h-full"
                  title="Izberi in analiziraj fotografijo"
                >
                  <img src={photo.dataUrl} alt="" className="w-full h-full object-cover" />
                </button>
                <div className={`absolute top-1 right-1 w-3 h-3 rounded-full pointer-events-none ${
                  photo.status === 'analyzed' ? 'bg-emerald-400' :
                  photo.status === 'rejected' ? 'bg-red-400' : 'bg-amber-400'
                }`} />
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5 pointer-events-none">
                  <span className="text-[10px] text-white">{(photo.quality.overallScore * 100).toFixed(0)}%</span>
                </div>
                {/* FAZA 19: risanje označb */}
                <button
                  type="button"
                  onClick={() => onAnnotate(photo.id)}
                  className="absolute top-1 left-7 text-[10px] bg-blue-900/80 hover:bg-blue-700 text-white rounded px-1 leading-tight"
                  aria-label={`Označi fotografijo ${photo.id}`}
                  title="Nariši označbe na fotografiji"
                >
                  ✎
                </button>

                {/* FAZA 17: brisanje fotografije */}
                <button
                  type="button"
                  onClick={() => onDeletePhoto(photo.id)}
                  className="absolute top-1 left-1 text-[10px] bg-red-900/80 hover:bg-red-700 text-white rounded px-1 leading-tight"
                  aria-label={`Izbriši fotografijo ${photo.id}`}
                  title="Izbriši fotografijo"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
