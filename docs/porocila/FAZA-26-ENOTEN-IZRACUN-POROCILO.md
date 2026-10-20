# FAZA 26 — ENOTEN IZRAČUN ORAJE (panelna + deskna konstrukcija)

**Projekt:** Mera3D Pro (monter3d)
**Status:** ✅ zaključeno

---

## Problem
Aplikacija je imela **dve ločeni poti izračuna ograje** v `App.tsx`:
- **panelna** konstrukcija (`geometry.calculateFencePlan` + `estimateFenceMaterials`),
- **deskna** konstrukcija (`boardFence.buildBoardFencePlan` + `estimateBoardMaterials`).

Vsaka pot je imela svojo geometrijo, svoje pogoje za napake in svoj predračun — ista
koda je bila dvakrat, spremembe pa so lahko razšle v eni poti in ne v drugi.

## Rešitev
Nov modul `src/utils/fenceCalculation.ts` z eno funkcijo:

```ts
calculateFenceCalculation({ segments, config, profile, prices }): FenceCalculationResult
```

Cev je enak za obe konstrukciji:
1. **geometrija** (koti, dvigi, povezani segmenti) — skupna;
2. **konstrukcija** — panelna (model rezanja) ali deskna (pravila kataloga);
3. **preverjanje pravil profila** (razmak stebrov) — v obeh primerih;
4. **materialna lista** — iz istega vira cene;
5. **enoten rezultat**: `plan | boardPlan`, `materials`, `totalLength`, `errors`, `warnings`.

`App.tsx` je zdaj tan: izbere meritve, sestavi segmente in pokliče en cev. Vse napake in
opozorila se prikažejo v načrtu, predračun pa nastane samo, če ni napak — pri obeh
konstrukcijah enako.

## Testi
`src/tests/fenceCalculation.test.ts` (5 testov):
- panelna konstrukcija: načrt, materiali, dolžina 8 m iz dveh segmentov;
- deskna konstrukcija: katalog, deske in stebri, ista dolžina;
- deskna brez profila → napaka (ne tiho prazno);
- neveljavni segment (dolžina 0) → napaka;
- kršitev tehničnih pravil profila (razmak stebrov 1860 mm > limit 1500 mm) → **ni predračuna**.

## Popravek flakinessa
Pri večkratnem ponavljanju celotnega niza se je očitoval občasni padec testa
»uvoz neveljavne datoteke …« — uvoz gre skozi asinhrono branje datoteke, `waitFor` pa je
imel privzeto mejo 1 s, kar pod obremenitvi (paralelni workerji) ni zadostovalo. Meja je
zdaj 5 s.

## Preverjanje
`typecheck` (tsc + ESLint 10) ✅ 0 opozoril · `vitest` ✅ **183/183** (8× zaporedoma brez
flakinessa, tudi na Node 20) · `test-runner` 21/21 · `test-homography` 40/40 · `build` ✅

## Kaj ostane
1. **Preostale večje komponente** — `GuidedCapture` (587), `MathTestRunner` (577),
   `MeasurementOverlay` (450), `FenceVisualizer` (442), `CameraCapture` (412).
2. **Pregled zgodovine** (»kaj je bilo narejeno«).
3. **Sinhronizacija med napravami** — za zdaj varen prenos prek varnostne kopije.
