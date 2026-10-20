/**
 * Mera3D Pro - Roksal Gallery Component
 * 
 * Displays original Roksal product images with filtering options.
 */

import { useState } from 'react';
import { ROKSAL_GALLERY, getImagesByProfile, getImagesByColor, getImagesByCategory, getImagesByOrientation } from '../data/roksalGallery';
import { ROKSAL_PROFILES, ROKSAL_COLORS, getColorById } from '../data/roksalCatalog';
import { RoksalImageView } from './RoksalImageView';
import type { RoksalImage } from '../data/roksalGallery';

interface RoksalGalleryViewProps {
  onClose?: () => void;
}

export function RoksalGalleryView({ onClose }: RoksalGalleryViewProps) {
  const [filterProfile, setFilterProfile] = useState<string>('');
  const [filterColor, setFilterColor] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterOrientation, setFilterOrientation] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<RoksalImage | null>(null);

  // Filter images
  const filteredImages = ROKSAL_GALLERY.filter(img => {
    if (filterProfile && img.profileId !== filterProfile) return false;
    if (filterColor && img.colorId !== filterColor) return false;
    if (filterCategory && img.category !== filterCategory) return false;
    if (filterOrientation && img.orientation !== filterOrientation) return false;
    return true;
  });

  const resetFilters = () => {
    setFilterProfile('');
    setFilterColor('');
    setFilterCategory('');
    setFilterOrientation('');
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
          <div>
            <h2 className="text-xl font-bold text-white">🖼️ Roksal Galerija</h2>
            <p className="text-xs text-slate-400 mt-1">
              Originalne fotografije iz roksal.com • {filteredImages.length} slik
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-2xl"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-700 bg-slate-900/50">
          {/* FAZA 10 (P2): slike so zunanji vir — brez povezave se prikaže nadomestek. */}
          <p className="mb-3 rounded border border-slate-600 bg-slate-800/60 px-3 py-2 text-xs text-slate-400">
            Slike so shranjene <b>lokalno</b> (delujejo brez povezave). Če lokalna kopija ni
            na voljo, se naloži izvirnik z roksal.com, sicer je prikazan nadomestek z barvnim
            vzorcem. Vir slik: roksal.com.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Profil</label>
              <select
                value={filterProfile}
                onChange={(e) => setFilterProfile(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
              >
                <option value="">Vsi profili</option>
                {ROKSAL_PROFILES.map(profile => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Barva</label>
              <select
                value={filterColor}
                onChange={(e) => setFilterColor(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
              >
                <option value="">Vse barve</option>
                {Object.values(ROKSAL_COLORS).map(color => (
                  <option key={color.id} value={color.id}>
                    {color.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Kategorija</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
              >
                <option value="">Vse kategorije</option>
                <option value="installation">Izvedbe ograj</option>
                <option value="profile">Profili</option>
                <option value="color-swatch">Barvni vzorci</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Orientacija</label>
              <select
                value={filterOrientation}
                onChange={(e) => setFilterOrientation(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
              >
                <option value="">Vse orientacije</option>
                <option value="vertical">Pokončno</option>
                <option value="horizontal">Prečno</option>
              </select>
            </div>
          </div>

          {(filterProfile || filterColor || filterCategory || filterOrientation) && (
            <button
              onClick={resetFilters}
              className="mt-3 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded text-sm"
            >
              🗑️ Počisti filtre
            </button>
          )}
        </div>

        {/* Gallery Grid */}
        <div className="p-4">
          {filteredImages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400">Ni slik za izbrane filtre.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredImages.map(image => (
                <div
                  key={image.id}
                  onClick={() => setSelectedImage(image)}
                  className="bg-slate-900 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all"
                >
                  <div className="aspect-video bg-slate-800 relative">
                    <RoksalImageView
                      image={image}
                      className="w-full h-full object-cover"
                      badge={image.category === 'color-swatch' ? 'Vzorec' : undefined}
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-white mb-1 line-clamp-2">
                      {image.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {image.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Image Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div
              className="bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">{selectedImage.title}</h3>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="text-slate-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-4">
                <RoksalImageView
                  image={selectedImage}
                  className="w-full rounded-lg mb-4"
                />

                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-1">Opis</h4>
                    <p className="text-sm text-slate-400">{selectedImage.description}</p>
                  </div>

                  {selectedImage.profileId && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-300 mb-1">Profil</h4>
                      <p className="text-sm text-emerald-400">
                        {ROKSAL_PROFILES.find(p => p.id === selectedImage.profileId)?.name || 'Neznano'}
                      </p>
                    </div>
                  )}

                  {selectedImage.colorId && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-300 mb-1">Barva</h4>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border-2 border-slate-600"
                          style={{ backgroundColor: getColorById(selectedImage.colorId)?.hex }}
                        />
                        <span className="text-sm text-emerald-400">
                          {getColorById(selectedImage.colorId)?.name || 'Neznano'}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedImage.orientation && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-300 mb-1">Orientacija</h4>
                      <p className="text-sm text-slate-400">
                        {selectedImage.orientation === 'vertical' ? 'Pokončno' : 'Prečno'}
                      </p>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-1">Vir</h4>
                    <a
                      href={selectedImage.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300 break-all"
                    >
                      {selectedImage.source}
                    </a>
                  </div>

                  {selectedImage.notes && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-300 mb-1">Opombe</h4>
                      <p className="text-sm text-amber-400">{selectedImage.notes}</p>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-700">
                    <p className="text-xs text-slate-500">
                      © Roksal d.o.o. • Slika uporabljena z dovoljenjem
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
