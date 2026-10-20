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

export function RoksalImageView({ image, className = '', badge }: RoksalImageViewProps) {
  const [failed, setFailed] = useState(false);
  const color = image.colorId ? getColorById(image.colorId) : undefined;

  if (failed) {
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

  return (
    <>
      <img
        src={image.url}
        alt={image.title}
        className={className}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
      {badge && (
        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
          {badge}
        </div>
      )}
    </>
  );
}
