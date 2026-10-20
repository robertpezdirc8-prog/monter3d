/**
 * RoksalImageView.tsx — FAZA 10 (P2)
 *
 * Varen prikaz slike iz galerije Roksal.
 *
 * Slike so naložene z roksal.com (zunanji vir), zato jih brez povezave ni mogoče
 * prikazati. Namesto praznega okvirja se prikaže nadomestek z barvnim vzorcem
 * iz kataloga in sporočilom — uporabnik dobi uporabno informacijo, ne okna.
 */
import { useState } from 'react';
import type { RoksalImage } from '../data/roksalGallery';
import { getColorById } from '../data/roksalCatalog';

interface RoksalImageViewProps {
  image: RoksalImage;
  className?: string;
  /** Dodatna oznaka (npr. »Vzorec«). */
  badge?: string;
}

type Source = 'local' | 'remote' | 'failed';

export function RoksalImageView({ image, className = '', badge }: RoksalImageViewProps) {
  const [source, setSource] = useState<Source>('local');
  const color = image.colorId ? getColorById(image.colorId) : undefined;

  if (source === 'failed') {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 bg-slate-800 p-2 text-center ${className}`}
        role="img"
        aria-label={`${image.title} (slika ni dosegljiva)`}
      >
        {color && (
          <span
            className="block h-6 w-12 rounded"
            style={{ backgroundColor: color.hex }}
            aria-hidden
          />
        )}
        <span className="text-[10px] text-slate-400">Slika ni dosegljiva (offline)</span>
        <span className="text-[10px] text-slate-500 line-clamp-2">{image.title}</span>
        {color && <span className="text-[10px] text-slate-500">{color.name}</span>}
      </div>
    );
  }

  const src = source === 'local' && image.localPath ? image.localPath : image.url;

  return (
    <>
      <img
        src={src}
        alt={image.title}
        className={className}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => {
          // Najprej poskusiš lokalno kopijo, nato izvirnik, nazadnje nadomestek.
          if (source === 'local' && image.localPath && image.url !== image.localPath) {
            setSource('remote');
          } else {
            setSource('failed');
          }
        }}
      />
      {badge && (
        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
          {badge}
        </div>
      )}
    </>
  );
}
