# FAZA 24 — ZGODOVINA RAZVELJIVIH AKCIJ (več korakov nazaj)

**Projekt:** Mera3D Pro (monter3d)
**Status:** ✅ zaključeno

---

## Problem
FAZA 22 je omogočala razveljavo **zadnje** destruktivne akcije. Na terenu se zgodi več
napak zaporedoma (izbrišeš napačno meritev, nato še napačno fotografijo) — takrat je
razveljava prve ne več mogoča in uporabnik mora vse delati znova.

## Rešitev
- `undoStack` v `App.tsx`: sklad razveljivih akcij (največ 10), prikazana je zadnja;
- `pushUndo(sporočilo, akcija)`, `handleUndo()` (izvede in odstrani zadnjo),
  `handleDismissUndo()` (zaprše brez izvedbe);
- `UndoSnackbar` prikaže **»+N še razveljivih«**, če je v skladu več akcij;
- vse tri destruktivne akcije (meritev, fotografija, projekt) še vedno uporabljajo isti
  mehanizem — le sklad je zdaj globlji.

## Testi
UI test: dodaj dve meritvi, izbriši obe → prikazano »1 še razveljivih« → razveljavi
vrne zadnjo izbrisano meritev → razveljavi še enkrat vrne tudi prvo.

## Preverjanje
`typecheck` (tsc + ESLint 10) ✅ 0 opozoril · `vitest` ✅ **177/177** (3× zaporedoma, tudi
na Node 20) · `test-runner` 21/21 · `test-homography` 40/40 · `build` ✅

## Opomba
Pri urejanju `App.tsx` z velikimi skripti se je pokazalo, da so ročne zamenjave občutljive
na nivoju stavkov — spremembe so bile zato narejane z **strukturiranim skriptom**, ki
preveri strukturo, in nato potrjene s `tsc` + `eslint` + testi.

## Kaj ostane
1. **Razčlenitev preostalih velikih komponent** (`FenceConfigurator` ~750 vrstic,
   `PhotoMatchingView`, `MeasurementOverlay`, `FenceVisualizer`).
2. **Skupni model ograje** — panelna in deskna konstrukcija sta povezana, a še dva modela.
3. **Sinhronizacija med napravami** — namesto tega varen prenos prek varnostne kopije.
4. **Zgodovina kot pregled** — poleg razveljavitve bi koristil seznam opravljenih
   sprememb (»kaj je bilo narejeno«).
