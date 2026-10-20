# FAZA 11 — POOENOTENJE MODELOV ORAJE (deskna konstrukcija v predračunu)

**Projekt:** Mera3D Pro (monter3d)
**Status:** ✅ zaključeno

---

## Problem
Aplikacija je imela **dva nepovezana modela ograje**:

| Model | Modul | Kje se je uporabljal |
|---|---|---|
| Panelna ograja (paneli + stebri) | `utils/geometry.ts` | **edini model v predračunu** |
| Deskna ograja (deske + stebri + letve iz kataloga) | `utils/fenceConstruction.ts` | samo v konfiguratorju — izračun nikoli ni prišel v predračun |

Uporabnik je torej moral izračun za naročilni material narediti na dveh mestih, konfiguratorski
izračun pa je bil izoliran od ocene, cen in shranjevanja.

## Rešitev

### 1. Nov modul `src/utils/boardFence.ts`
- `buildBoardFencePlan()` — iz katalogovnega profila in segmentov (dolžina, azimut, dvig)
  sestavi načrt: deske, stebri, nosilci, dolžina materiala, razmiki, potreba po ALU cevi.
  Pravila so prevzeta iz `calculateFenceConstruction` (vir je en), dodat pa je odpad 5 %.
- `estimateBoardMaterials()` — materialna lista (deske po profilih, stebri, letve, ALU cev,
  pritrditev) z **istimi cenami** kot panelna konstrukcija.

### 2. Povezava z glavnim tokom
- `FenceConfig` dobi `constructionType: 'panel' | 'board'` in `boardSpacing` (mm);
- korak **Materiali** ima preklop »Konstrukcija« (panelna / deskna) in vnos razmika med
  deskami; pri deskni konstrukciji je **profil obvezen** (iz njega prihajajo pravila);
- `calculateFence` pri deskni konstrukciji izračuna deskni načrt, iz njega materiale in
  **predračun** — napake tehničnih pravil pomenijo, da predračuna ni (enako kot pri panelni);
- korak **Količine** prikaže deskni načrt (deske, stebri, nosilci, razmiki, ALU cev);
- načrt se shrani skupaj s projektom (`Project.boardPlan`) in se obnovi ob nalaganju.

### 3. Cene
`MaterialPrices` dobi `boardPricePerM` (€/m desk, privzeto 35) in `aluTubePricePerM`
(€/m, privzeto 8) — urejivi v koraku Materiali, shranjeni z ostalim stanjem projekta.

## Preverjanje
`typecheck` ✅ · `lint` ✅ 0 napak · `vitest` ✅ **130/130** (prej 120) · `test-runner` 21/21 ·
`test-homography` 40/40 · `build` ✅

## Kaj ostane
1. **Konfigurator** (`FenceConfigurator`) je še samostojen modal z lastnim vmesnikom —
   zdaj uporablja ista pravila kot glavni tok, a ga je smiselno postopoma umakniti ali
   preoblikovati v »napredno« različico istega zaslona.
2. **ESLint opozorila** (93) — pretežno `any` v propih in neuporabljene spremenljivke v
   starih modulih (`cv.ts`, `naturalLanguageParser.ts`).
3. **UI testi** — PDF poročilo, uvoz varnostne kopije, merjenje v koraku »Kakovost«.
