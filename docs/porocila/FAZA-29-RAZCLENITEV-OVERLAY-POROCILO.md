# FAZA 29 — RAZČLENITEV `MeasurementOverlay` + TEST »HITRI OCEN« + POPRAVLJENO BESEDILO

**Projekt:** Mera3D Pro (monter3d)
**Status:** ✅ zaključeno

---

## 1. Razčlenitev `MeasurementOverlay` (450 → 357 vrstic)
Komponenta je zdaj razdeljena v `src/components/overlay/`:
- `OverlayModeControls.tsx` (47) — preklop načina (referenca / meri / počisti),
- `OverlayReferenceInput.tsx` (50) — vnos referenčne dolžine (kalibracija fotografije),
- `OverlayMeasurementList.tsx` (74) — seznam izmerjenih odsekov, skupna dolžina, opozorila.

`MeasurementOverlay.tsx` skrbi za stanje, risanje na platno in sestavo komponent.

## 2. Test »hitri ocen brez fotografij« (UI)
Najpogostejši terenski scenarij je ocena brez fotografiranja: dolžina je znana z metrom.
Tok je bil deloval, a **ni bil pokrit s testom** — zdaj je:
projekt → ročno vnesena dolžina 6,5 m → izračun ograje → količine (6,50 m) → predračun
(vsota + znesek v EUR). To je scenarij, ki ga monter uporablja pri pultu.

## 3. Popravljeno besedilo v navodilih za obrti
- »toplotne črpe—kjer je vidna poškodba« → »toplotne črpe — kjer je vidna poškodba«
- »držiš levelirjem ob levi/strehi« → »držiš žaga ali vodilo ob strehi«
- »od robu do grebena« → »od roba do grebena«
- »Žlebovi, mračnice, protisnežne ovire—stanje« → »Žlebovi, mreže, protisnežne ovire — stanje«
(manjkajoči presledki in napačna beseda »mračnice« → »mreže«)

## Preverjanje
`typecheck` (tsc + ESLint 10) ✅ 0 opozoril · `vitest` ✅ **192/192** (3× zaporedoma, tudi na
Node 20) · `test-runner` 21/21 · `test-homography` 40/40 · `build` ✅

## Kaj ostane
1. **Preostale večje komponente** — `GuidedCapture` (587), `MathTestRunner` (577),
   `FenceVisualizer` (442), `CameraCapture` (412).
2. **Sinhronizacija med napravami** — za zdaj varen prenos prek varnostne kopije.
3. **Dnevnik tudi v dokumentacijski listi** (danes samo v PDF predračunu).
