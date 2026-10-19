/**
 * Galerija fotomontaž, shranjenih v projekt.
 * Uporablja se v koraku vizualizacije in pri izvozu/ponudbi.
 */

import type { ProjectMontage } from '../types';

interface MontageGalleryProps {
  montages: ProjectMontage[];
  onDelete: (montageId: string) => void;
  title?: string;
  emptyHint?: string;
}

export function MontageGallery({
  montages,
  onDelete,
  title = '📸 Shranjene fotomontaže',
  emptyHint
}: MontageGalleryProps) {
  if (montages.length === 0) {
    if (!emptyHint) return null;
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <p className="text-sm text-slate-400">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {montages.map(montage => {
          const created = new Date(montage.createdAt);
          const dateLabel = Number.isNaN(created.getTime())
            ? ''
            : created.toLocaleDateString('sl-SI');
          const fileDate = Number.isNaN(created.getTime())
            ? 'montaza'
            : created.toISOString().slice(0, 10);

          return (
            <figure
              key={montage.id}
              className="bg-slate-900 rounded-lg overflow-hidden border border-slate-700"
            >
              <img
                src={montage.dataUrl}
                alt={`Fotomontaža ${montage.profileName}`}
                className="w-full h-auto"
                loading="lazy"
              />
              <figcaption className="p-3 text-xs text-slate-400 space-y-2">
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    {montage.profileName} · {montage.colorName}
                  </p>
                  <p>
                    {montage.orientation === 'vertical' ? 'Pokončno' : 'Prečno'} · višina{' '}
                    {(montage.fenceHeightMm / 1000).toFixed(2)} m · razmik{' '}
                    {montage.boardSpacingMm} mm
                  </p>
                  {dateLabel && <p>Shranjeno {dateLabel}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={montage.dataUrl}
                    download={`roksal-montaza-${fileDate}.png`}
                    className="rounded bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
                  >
                    💾 Prenesi
                  </a>
                  <button
                    onClick={() => onDelete(montage.id)}
                    className="rounded bg-slate-700 px-3 py-1.5 font-medium text-slate-200 hover:bg-red-700 hover:text-white"
                  >
                    🗑️ Odstrani
                  </button>
                </div>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
