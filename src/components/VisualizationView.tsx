/**
 * Korak vizualizacije: izbira fotografije, odprtje Roksal vizualizatorja
 * in pregled shranjenih fotomontaž.
 */

import type { Photo, FencePlan, RoksalQuote, ProjectMontage } from '../types';
import { MontageGallery } from './MontageGallery';

interface VisualizationViewProps {
  photo: Photo | null;
  fencePlan: FencePlan | null;
  roksalQuote: RoksalQuote | null;
  montages: ProjectMontage[];
  onOpenVisualizer: () => void;
  onGoToCapture: () => void;
  onDeleteMontage: (montageId: string) => void;
}

export function VisualizationView({
  photo,
  fencePlan,
  roksalQuote,
  montages,
  onOpenVisualizer,
  onGoToCapture,
  onDeleteMontage
}: VisualizationViewProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-emerald-400">🏗️ Vizualizacija ograje</h2>
        <p className="text-sm text-slate-400 mt-1">
          Na fotografijo objekta postavite izbrani Roksal profil in primerjajte rezultat z
          originalom. Shranjena montaža se doda v dokumentacijo projekta.
        </p>
      </div>

      <div className="bg-slate-800 rounded-lg p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            {photo ? (
              <div className="relative">
                <img
                  src={photo.dataUrl}
                  alt="Izhodiščna fotografija za vizualizacijo"
                  className="w-full max-h-[480px] object-contain rounded border border-slate-700 bg-slate-900"
                />
                <span className="absolute left-2 top-2 rounded bg-slate-900/80 px-2 py-1 text-xs text-slate-200">
                  Izhodiščna fotografija
                </span>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                  {(photo.width ?? 0) > 0 && (photo.height ?? 0) > 0 && (
                    <span>
                      {photo.width ?? 0} × {photo.height ?? 0} px
                    </span>
                  )}
                  <span>Kakovost fotografije: {photo.quality.overallScore}/100</span>
                </div>
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center gap-3 rounded border border-dashed border-slate-600 bg-slate-900/60 p-6 text-center">
                <p className="text-slate-300">Ni izbrane fotografije za vizualizacijo.</p>
                <p className="max-w-md text-sm text-slate-400">
                  Fotografirajte objekt ali izberite obstoječo fotografijo v koraku zajema.
                </p>
                <button
                  onClick={onGoToCapture}
                  className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  📷 Pojdi na zajem
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Kaj lahko naredite?</h3>
              <ol className="mt-2 space-y-1 text-xs text-slate-400">
                <li>1. Označite štiri vogale obstoječe ograje ali predvidenega območja.</li>
                <li>2. Izberite profil, barvo in orientacijo desk.</li>
                <li>3. Po potrebi kalibrirajte merilo za realno višino.</li>
                <li>4. Primerjajte original in montažo ter jo shranite v projekt.</li>
              </ol>
            </div>

            <button
              onClick={onOpenVisualizer}
              disabled={!photo}
              className={`w-full rounded px-4 py-2.5 text-sm font-medium ${
                photo
                  ? 'bg-purple-600 text-white hover:bg-purple-500'
                  : 'cursor-not-allowed bg-slate-700 text-slate-500'
              }`}
            >
              🏗️ Odpri vizualizator
            </button>

            {!photo && (
              <p className="text-xs text-amber-400">
                Za vizualizacijo najprej izberite ali zajemite fotografijo.
              </p>
            )}

            {roksalQuote && (
              <div className="rounded border border-indigo-700 bg-indigo-900/30 p-3 text-xs text-indigo-100">
                <p className="font-semibold text-indigo-200">Izhodišče iz ponudbe</p>
                <p className="mt-1">
                  {roksalQuote.configuration.profileName} · {roksalQuote.configuration.colorName}
                </p>
                <p>
                  {roksalQuote.configuration.orientation === 'vertical' ? 'Pokončno' : 'Prečno'} ·{' '}
                  {(roksalQuote.configuration.fenceHeightMm / 1000).toFixed(2)} m · razmik{' '}
                  {roksalQuote.configuration.boardSpacingMm} mm
                </p>
              </div>
            )}

            {!roksalQuote && fencePlan && (
              <div className="rounded border border-slate-600 bg-slate-900/60 p-3 text-xs text-slate-300">
                <p className="font-semibold text-slate-200">Izhodišče iz načrta</p>
                <p className="mt-1">
                  Dolžina {fencePlan.totalLength.toFixed(2)} m · višina{' '}
                  {fencePlan.panelHeight.toFixed(2)} m · {fencePlan.totalPanels} polj
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <MontageGallery
        montages={montages}
        onDelete={onDeleteMontage}
        emptyHint="Shranjene fotomontaže se bodo prikazale tukaj. Zadnja shranjena montaža se doda tudi v PDF/ponudbo."
      />

      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Nasveti za dobro montažo</h3>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>• Fotografirajte z višine oči in zajemite celotno ograjo ter nekaj okolice.</li>
          <li>• Vogale označite po vrsti: zgoraj levo, zgoraj desno, spodaj desno, spodaj levo.</li>
          <li>• Za realno višino kalibrirajte merilo na znani predmet (npr. višina osebe).</li>
          <li>• Brez kalibracije je višina vezana na označeno območje in je približna.</li>
        </ul>
        <p className="mt-2 text-xs text-amber-400">
          ⚠️ Fotomontaža je predogled. Za izvedbo uporabite izmerjene mere in potrjeno kosovnico.
        </p>
      </div>
    </div>
  );
}
