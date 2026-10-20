# FAZA 14 — ROČNI VNOS DOLŽIN (terensko delo brez fotografije)

**Projekt:** Mera3D Pro (monter3d)
**Status:** ✅ zaključeno

---

## Problem
Do sedaj je bila dolžina ograje dosegljiva **le** z meritvijo na fotografiji (dva klika
na sliko + kalibracija). Na terenu pa je dolžina pogosto znana izmerjena z metrom ali
z laserjem, fotografija pa ni nujno — ali je sploh ni.

To je pomenilo, da aplikacija **ni bila uporabna** za »nujno oceno«: uporabnik je moral
za vsak projekt narediti fotografijo in kalibracijo, če je želel le dolžino.

## Rešitev
Nov obrazec v koraku **Meritve** (»⌨️ Ročna dolžina«):
- vnos dolžine v metrih (npr. 6,50 m) + gumb »Dodaj meritve«;
- ustvari meritev z `source: 'manual'`, `algorithm: 'manual_entry'`,
  `scaleSource: 'manual_reference'`, `status: 'verified'`, negotovost 2 %;
- vrednost gre v **načrt in predračun** enako kot meritev na fotografiji
  (`selectFenceLengthMeasurements` jo vključi) in je deležna segmentov, azimutov in
  dvigov;
- polje se po dodajanju počisti, da je mogoče takoj vpisati naslednjo dolžino.

## Testi
`src/tests/ui/qualityStep.test.tsx` (dopolnitev):
- ročno vnesena dolžina se prikaže kot **preverjena** meritev (`6.500 m ±2.0%`);
- ročno vnesena dolžina **pride v načrt ograje** (korak Količine pokaže 6,50 m).

Skupaj: **141 testov**, ESLint brez opozoril.

## Preverjanje
`typecheck` ✅ · `eslint` ✅ 0 opozoril · `vitest` ✅ **141/141** (3× zaporedoma) ·
`test-runner` 21/21 · `test-homography` 40/40 · `build` ✅

## Kaj ostane
1. **CI koraki** (ESLint + `test-homography.js`) — še vedno zahtevajo ročno uporabo
   `docs/porocila/CI-ENHANCEMENTS.patch`.
2. **PWA namestitev** — manifest in service worker sta vgrajena, manjka poziv za
   namestitev in lepši zaslon za offline stanje.
3. **Ročni vnos višine in števila segmentov** — podobno kot dolžina, a manj pogosto
   potrebno.
