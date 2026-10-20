# FAZA 12 — ČIŠČENJE KODE (ESLint brez opozoril) in popravljen prikaz ujemanja

**Projekt:** Mera3D Pro (monter3d)
**Status:** ✅ zaključeno

---

## 1. ESLint: 93 opozoril → 0

Po razčlenitvi `App.tsx` je ostalo 93 opozoril (predvsem `any` v propih, neuporabljeni
uvozi in spremenljivke, dve opozorili `react-hooks/exhaustive-deps`). Zdaj je
`npx eslint .` **čist brez enega opozorila**.

Kaj je bilo storjeno (ne le poštenje pravil, temveč prava čiščenja):

- **mrtva koda odstranjena** (`src/utils/cv.ts`): `jacobiEigenSolver`,
  `solveLeastSquares`, `gaussianElimination` in `normalize` (zamenjani z enotsko
  Jacobi-SVD metodo) — skupaj ~130 vrstic mrtve kode;
- **neuporabljeni uvozi**: iz `App.tsx` (ikone, `CoverageMapView`, `ProjectSummary`,
  `GuidedCapture`, `FenceSegmentEditor`, `formatMeasurement`, …), `cv.ts`,
  `naturalLanguageParser.ts`, `photoMatching.ts`, `CoverageMap.tsx`,
  `RoksalGalleryView.tsx`;
- **neuporabljeni propi in stanja**: `AiOverlay.useVideoDimensions`,
  `FenceVisualization.fencePlan`, `PhotoMatchingView.onSelectPhoto`,
  `MeasurementsView.measurePoints/onAnalyze`, `ScaleView.onAnalyze`,
  `FenceVisualizer.showOriginal`;
- **`any` nadomeščen s pravimi tipi**: `MaterialView` (`FenceConfig`, `StairsConfig`),
  `geometry.exportProjectJSON(project: Project)`, `cameraSDK` (lasten `TrackCapabilities`,
  `ImageCaptureLike`, `AdvancedTrack` — namesto `(window as any).ImageCapture`),
  `useAiDetection` (tip `DetectionPipeline` za transformers.js), `catch (e: any)` →
  `catch (e: unknown)` z varovanim dostopom do `message`;
- **react-hooks opozorili**: `FeatureMatching.processMatching` je postal `useCallback` z
  odvisnostmi in je vključen v `useEffect`; odvečna odvisnost `assessImageQuality`
  v `CameraCapture` je odstranjena.

## 2. Popravljen prikaz ujemanja fotografij

Med čiščenjem je odkrita še ena neskladnost: `PhotoMatchingView` je prikazoval
statistiko, a **ni dobil podatkov za risanje povezav** (`features1Points`,
`features2Points`, `inlierMatches`) — vizualizacija ujemanja je bila zato prazna.
Podatki so zdaj posredovani, tip `PhotoPairMatching` je izvožen (prej je bil lokalen
in je-tip `any[]` v `App.tsx` zakril neskladje).

## Preverjanje
`typecheck` ✅ · `eslint` ✅ **0 opozoril** · `vitest` ✅ 130/130 · `build` ✅

## Kaj ostane
1. **UI testi** — PDF poročilo, uvoz varnostne kopije, korak »Kakovost«.
2. **Konfigurator** (`FenceConfigurator`) — samostojen modal; uporablja ista pravila kot
   glavni tok, a ga je smiselno preoblikovati v »napredno« različico istega zaslona.
3. **Tipi v `TradeCapture`/`FenceConfigurator`** — `catch` bloki so tipizirani, a
   posamezni dinamični klici (npr. `ImageCapture`) so še opisani z lastnimi vmesnimi tipi.
