/**
 * PhotoSheetView.tsx — FAZA 18
 *
 * Dokumentacijska lista (contact sheet) iz zajetih fotografij: mreža z napisi,
 * glava (ime projekta, datum) in noga (ključni podatki). Izvoz v PNG.
 *
 * Vse se izračuna in izriše lokalno v brskalniku — brez strežnika, brez nalaganja
 * fotografij na internet, deluje brez povezave.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Measurement, Photo, Project } from '../types';
import { buildPhotoSheetLayout, renderPhotoSheet, PHOTO_SHEET_PRESETS, type PhotoSheetLayoutKind } from '../utils/photoSheet';
import { generatePhotoSheetPDF } from '../utils/pdfExport';

interface PhotoSheetViewProps {
  photos: Photo[];
  measurements: Measurement[];
  projectName: string;
  /** Ključni podatki v nogi. */
  summary?: string;
  /** Za PDF izvoz (tisk) potrebujemo tudi projekt. */
  project?: Project;
  onClose: () => void;
}

export function PhotoSheetView({ photos, measurements, projectName, summary, project, onClose }: PhotoSheetViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [presetId, setPresetId] = useState(PHOTO_SHEET_PRESETS[0].id);
  const [columns, setColumns] = useState(3);
  const [layoutKind, setLayoutKind] = useState<PhotoSheetLayoutKind>('grid');
  // FAZA 21: uporabnik sam izbere fotografije, ki gredo v listo (PixGrid).
  const [selectedIds, setSelectedIds] = useState<string[]>(() => photos.map(p => p.id));
  const [showPicker, setShowPicker] = useState(false);

  const selectedPhotos = photos.filter(p => selectedIds.includes(p.id));
  const [status, setStatus] = useState<string | null>(null);

  const layout = buildPhotoSheetLayout({
    photos: selectedPhotos,
    measurements,
    projectName,
    summary,
    presetId,
    columns,
    layoutKind,
  });

  // Predogled se izriše ob vsaki spremembi.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    void renderPhotoSheet(canvas, layout, selectedPhotos).catch(err => {
      if (!cancelled) console.error('Failed to render photo sheet:', err);
    });
    return () => { cancelled = true; };
  }, [layout, selectedPhotos]);

  const handleExport = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setStatus('Pripravljam PNG …');
    try {
      // Zagotovi, da je canvas narisan pred izvozom.
      await renderPhotoSheet(canvas, layout, selectedPhotos);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Brskalnik ni uspel ustvariti slike');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dokumentacija-${(projectName || 'projekt').replace(/[^\w-]+/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus('✓ PNG je prenesen');
    } catch (err) {
      console.error('Failed to export photo sheet:', err);
      setStatus('Izvoz ni uspel — poskusi z manjšo sliko.');
    }
  }, [layout, selectedPhotos, projectName, setStatus]);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg max-w-5xl w-full max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
          <div>
            <h2 className="text-xl font-bold text-white">📸 Dokumentacijska lista</h2>
            <p className="text-xs text-slate-400 mt-1">
              Fotografije za stranko — izdelano lokalno v brskalniku, brez nalaganja na internet.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl" aria-label="Zapri">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {photos.length === 0 ? (
            <p className="text-sm text-slate-400">Ni fotografij — najprej zajemi posnetke.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label htmlFor="sheet-preset" className="text-xs text-slate-400 block mb-1">Format</label>
                  <select
                    id="sheet-preset"
                    value={presetId}
                    onChange={e => setPresetId(e.target.value)}
                    className="bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white"
                  >
                    {PHOTO_SHEET_PRESETS.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="sheet-layout" className="text-xs text-slate-400 block mb-1">Postavitev</label>
                  <select
                    id="sheet-layout"
                    value={layoutKind}
                    onChange={e => setLayoutKind(e.target.value as PhotoSheetLayoutKind)}
                    className="bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white"
                  >
                    <option value="grid">Mreža</option>
                    <option value="strip">Trak (vrstica)</option>
                    <option value="compare">Primerjava pred / po</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="sheet-columns" className="text-xs text-slate-400 block mb-1">Stolpci</label>
                  <input
                    id="sheet-columns"
                    type="number"
                    min={1}
                    max={6}
                    value={columns}
                    onChange={e => setColumns(Math.max(1, Math.min(6, parseInt(e.target.value) || 1)))}
                    className="w-20 bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white"
                  />
                </div>
                <button
                  onClick={() => setShowPicker(v => !v)}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded text-sm font-medium"
                  title="Izberi fotografije, ki gredo v dokumentacijsko listo"
                >
                  🖼 {selectedPhotos.length}/{photos.length} fotografij
                </button>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium"
                >
                  ⬇ Izvozi PNG
                </button>
                {project && (
                  <button
                    onClick={() => generatePhotoSheetPDF(project, photos, measurements, summary)}
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded text-sm font-medium"
                    title="Odpre tiskalni pogovor — shrani kot PDF (A4 ležeče)"
                  >
                    🖨 PDF za tisk
                  </button>
                )}
                {status && <span className="text-xs text-slate-300">{status}</span>}
              </div>

              {showPicker && (
                <div className="rounded border border-slate-700 bg-slate-900 p-3">
                  <p className="text-xs text-slate-400 mb-2">
                    Klikni fotografijo, da jo dodas ali odstranis iz liste.
                  </p>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {photos.map(photo => {
                      const selected = selectedIds.includes(photo.id);
                      return (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => setSelectedIds(prev =>
                            selected ? prev.filter(id => id !== photo.id) : [...prev, photo.id]
                          )}
                          className={`relative rounded overflow-hidden aspect-video border-2 ${
                            selected ? 'border-emerald-400' : 'border-slate-700 opacity-50'
                          }`}
                          aria-pressed={selected}
                          aria-label={`${selected ? 'Odstrani' : 'Dodaj'} fotografijo ${photo.id}`}
                        >
                          <img src={photo.dataUrl} alt="" className="w-full h-full object-cover" />
                          {selected && (
                            <span className="absolute top-1 right-1 text-[10px] bg-emerald-600 text-white rounded px-1">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="overflow-auto rounded border border-slate-700 bg-slate-900 p-2">
                <canvas ref={canvasRef} className="max-w-full h-auto" aria-label="Predogled dokumentacijske liste" />
              </div>

              <p className="text-xs text-slate-500">
                Napis pod fotografijo je meritev (če obstaja) in čas posnetka. Skupaj
                {' '}{layout.cells.length} fotografij; v list je vključenih največ 24.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
