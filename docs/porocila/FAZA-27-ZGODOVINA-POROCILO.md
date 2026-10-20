# FAZA 27 — PREGLED ZGODOVINE PROJEKTA (»kaj je bilo narejeno«)

**Projekt:** Mera3D Pro (monter3d)
**Status:** ✅ zaključeno

---

## Zakaj
Za terensko uporabo je pomembno **sled delu**: kaj je bilo izmerjeno, kdaj je bila dodana
fotografija, kdaj je bil izračunan načrt in predračun. Do sedaj je bila ta sled
razpršena po korakih aplikacije in je ni bilo mogoče pokazati niti stranki niti
obdelovalcu.

## Rešitev
- Nov modul `src/utils/activityLog.ts`: tipi dogodkov (`project_created`,
  `photo_added`, `measurement_added`, `scale_calibrated`, `plan_calculated`,
  `estimate_created`, `export_created`, `backup_created`, …), predstavitveni podatki
  (ikona + oznaka) in varna pretvorba datuma (ISO ↔ Date).
- Nova shramba `activity` v IndexedDB (**DB_VERSION 1 → 2**, dodajanje ne brise obstoječih
  shramb) z API `addActivity()`, `getActivities(projectId)` in `clearActivities()`.
- Nov korak v delovnem toku **»🕘 Zgodovina«** (`src/components/steps/HistoryView.tsx`):
  dogodki od najnovejšega, z ikono, sporočilom, časom in oznako tipa; če je dogodkov
  več, se prikaže »Pokaži vse«.
- Zapisujejo se ključni dogodki: ustvaritev projekta, dodana/odstranjena fotografija,
  dodana/odstranjena meritev, ročno vnesena dolžina, kalibracija merila, izračun
  ograje, izvoz in varnostna kopija. Dnevnik se naloži ob odprtju projekta.

## Testi
- `src/tests/activityLog.test.ts` (5): shranjevanje in vrstni red (najnovejši prvi),
  ločitev med projekti, praznjenje dnevnika, varna datumska pretvorba, predstavitveni
  podatki za vsak tip dogodka;
- UI test: po ustvaritvi projekta korak »Zgodovina« prikaže dogodek o ustvaritvi.

## Preverjanje
`typecheck` (tsc + ESLint 10) ✅ 0 opozoril · `vitest` ✅ **189/189** (3× zaporedoma) ·
`test-runner` 21/21 · `test-homography` 40/40 · `build` ✅

## Opomba
Pri širitvi odvisnosti `useCallback` v `App.tsx` je bila ročna zamenjava spet občutljiva —
odvisnosti so bile zato poštene z **strukturiranim skriptom**, ki za vsak `useCallback`
preveri, ali njegovo telo uporablja `logActivity`, in jo sam dodaja ali odstrani.

## Kaj ostane
1. **Preostale večje komponente** — `GuidedCapture` (587), `MathTestRunner` (577),
   `MeasurementOverlay` (450), `FenceVisualizer` (442), `CameraCapture` (412).
2. **Sinhronizacija med napravami** — za zdaj varen prenos prek varnostne kopije.
3. **Dnevnik v PDF poročilu** — zgodovina dela bi bila del dokumentacije za stranko.
