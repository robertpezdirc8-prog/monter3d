# FAZA 7 + FAZA 8 — POROČILO (P0 in P1)

**Projekt:** Mera3D Pro (monter3d)
**Veja:** `cline/f0b93cwj`
**Status:** ✅ P0 zaključen, ✅ P1 (matematika, geometrija, offline, orodja) zaključen

---

## FAZA 7 (P0) — popravljeni izgubi podatkov in nedelujoče upravljanje projektov

### 1. Kalibracijska meritev se je štela v dolžino ograje
`setScale` je ustvarjal meritev z `status: 'verified'`, `unit: 'm'` in
`scaleSource: 'manual_reference'`, filter v `calculateFence` pa je take meritve
sprejel. Rezultat: 2 m merilni trak je postal dodaten segment ograje — dolžina,
količine panelov/stekrov in predračun so bili napihnjeni.

**Rešitev:** `isFenceLengthMeasurement()` / `selectFenceLengthMeasurements()`
(`src/utils/geometry.ts`), referenčna meritev je označena
(`source: 'reference_scale'`, `isScaleReference: true`) in je izključena iz dolžine,
količin ter statistike predračuna. Stari zapisi (brez zastave) se izločijo po
`algorithm === 'reference_calibration'`.

### 2. Meritve, načrti in predračun se niso shranjevali
Shranjevale so se le fotografije in osnovni metapodatki projekta. Po osvežitvi
strani so izginile vse meritve, načrt ograje, predračun, merilo in konfiguracije.

**Rešitev:** nov modul `src/utils/projectState.ts` (snapshot / apply / podpis stanja,
`normalizeSettings` popravi poškodovane ali stare nastavitve) in avtomatsko shranjevanje
v `App.tsx`. Stanje se obnovi ob nalaganju projekta.

### 3. Fotografije so bile shranjene dvakrat
`project.photos` in ločena shramba `photos` sta vsebovala isto sliko z `dataUrl`
→ 2× poraba kvote IndexedDB.

**Rešitev:** fotografije se pišejo samo v shrambo fotografij; `loadProjectWithPhotos()`
ob odpiranju stare podvojene zapise preseli in počisti (migracija).

### 4. Obstoječega projekta ni bilo mogoče odpreti
Seznam projektov je bil brez `onClick`, `deleteProject` sploh ni bil uporabljen.

**Rešitev:** odpiranje in preklop projekta (seznam + preklopnik v stranski vrstici),
brisanje s potrditvijo, `deletePhotosByProject()` (brez sirot v bazi).

### 5. Ni bilo poti za varnostno kopijo
Običajni izvoz JSON ni vseboval slik, obnova projekta ni bila mogoča.

**Rešitev:** `src/utils/backup.ts` — versioniran JSON s fotografijami + `restoreBackup()`
(nova oznaka projekta, izvirnik ostane). UI: Izvoz → 🧰, Nov projekt → ⬆.

---

## FAZA 8 (P1) — matematika, geometrija, offline, orodja

### Homografija in RANSAC (`src/utils/cv.ts`)
- `estimateHomography` je zavračal vsak nabor z realnim šumom (absolutni prag ostanka
  `1e-6`) — homografija se na resničnih fotografijah sploh ni izračunala. Zdaj je prag
  **relativni** (`1e-2`; izmerjeno: 0,5 px šum ≈ `1,8e-3`, pokvarjen model ≥ `1e-1`) in
  model se preveri s **reprojekcijo** (vsaj 4 inlierji).
- RANSAC je bil odvisen od `Math.random` → neponovljivi rezultati in občasno neuspešni
  testi. Zdaj je **determinističen** (mulberry32, parameter `seed`), RMSE najboljšega
  modela se izračuna (prej `Infinity`) in refit, ki model poslabša, se zavrne.
- `test-homography.js`: **40/40** (prej 36–38/39) + portan v vitest
  (`src/tests/homography.test.ts`) in vključen v CI.

### Geometrija ograje (`src/utils/fenceGeometry.ts`, `src/components/FenceSegmentEditor.tsx`)
- Vse meritve so se zlepile v eno premico (`heightChange = 0`) — koti in terenski dvigi
  niso bili modelirani. Zdaj vsak segment nosi **azimut** in **dvig**, zato so mogoči
  L-oblike, sklenjene ograje (opozorilo) in razlike v višini.
- **Cene materialov** so del nastavitev projekta (prej trdo zapisane v `App.tsx`).

### Delovanje brez povezave in odpornost
- `public/sw.js` (service worker) + `public/manifest.webmanifest` + `public/icon.svg`:
  glava »Offline ✓« je zdaj resnična.
- `ErrorBoundary` (`src/components/ErrorBoundary.tsx`) — namesto belega zaslona je
  razumljivo sporočilo in podatki ostanejo v napravi.
- Polna kvota IndexedDB → **opozorilo v pasici** (ne blokirajoč `alert`).

### Orodja in higiena
- ESLint (flat config) z vgrajenimi pravili react-hooks: **0 napak**, opozorila pri `any`.
  `npm run lint` je v CI.
- Odstranjene neuporabljene odvisnosti (`date-fns`, `@dnd-kit/utilities`,
  `@types/canvas-confetti`), ime paketa `mera3d-pro`, skripta `test:geometry`.
- 30 poročil iz korena premaknjenih v `docs/porocila/`; README prepisan.

> **Opomba o CI:** spremembe `.github/workflows/test.yml` (korak ESLint in korak
> `test-homography.js`) **ni bilo mogoče potisniti** — uporabljeni GitHub App token
> nima pravice `workflows`. Popravek je pripravljen kot
> `docs/porocila/CI-ENHANCEMENTS.patch` in ga je treba uporabiti ročno
> (`git apply docs/porocila/CI-ENHANCEMENTS.patch`).

---

## Preverjanje

| Preveritev | Rezultat |
|---|---|
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ 0 napak (79 opozoril `any`) |
| `npx vitest run` | ✅ 87/87 |
| `node test-runner.mjs` | ✅ 21/21 |
| `node test-homography.js` | ✅ 40/40 |
| `npm run build` | ✅ |
| `npm audit --omit=dev` | ✅ 0 ranljivosti |

## Kaj ostane (P2)

1. **Dva izračuna ograje**: `geometry.calculateFencePlan` (predračun) in
   `fenceConstruction.calculateFenceConstruction` (tehnična pravila Roksal) sta še
   ločena — pravila iz kataloga bi morala postati del načrta (preverjanje razmakov,
   višine, profilov) in vplivati na predračun.
2. **Galerija slik** še vroče-povezuje 18 slik z `roksal.com` (licenca, offline).
3. **`App.tsx` je 2200+ vrstic** — smiselna razdelitev na komponente po korakih.
4. **Testi komponent**: vitest je v `node` okolju; za UI bi koristil `jsdom` +
   Testing Library (preverjanje tokov: zajem → merilo → predračun).
