# FAZA 22 — RAZVELJAVA PO BRISANJU (UNDO)

**Projekt:** Mera3D Pro (monter3d)
**Status:** ✅ zaključeno

---

## Problem
Po FAZA 17 smo dodali brisanje meritev, fotografij in projektov — a brisanje je bilo
**nepovratno**. Na terenu (mokre roke, hitri tap) je to tvegano: en napačen tap je izbrisal
meritev, ki je bila del predračuna, in uporabnik je moral meriti znova.

Vzorec, ki ga uporabljajo vse sodobne aplikacije: **ponudba za razveljavo** ob
destruktivni akciji (sporočilo z gumbom »Razveljavi«, ki samodejno izgine).

## Rešitev
- Nova komponenta `src/components/UndoSnackbar.tsx`: sporočilo `role="status"` +
  `aria-live="polite"`, gumb »↶ Razveljavi«, zaprtje z ✕ in samodejno po 10 s;
- v `App.tsx` stanje `undoAction` (sporočilo + akcija) in prikaz snackbarja;
- **razveljava deluje za vse tri destruktivne akcije**:
  - **meritev** — vrne meritve in njen segment (azimut/dvig), načrt se preračuna;
  - **fotografija** — vrne fotografijo v shrambo in v stanje;
  - **projekt** — vrne projekt in vse njegove fotografije v bazo.

## Testi
UI test: meritev se izbriše → pojavi se ponudba → klik »Razveljavi« → meritev je nazaj.

## Preverjanje
`typecheck` (tsc + ESLint 10) ✅ 0 opozoril · `vitest` ✅ **174/174** (3× zaporedoma, tudi
na Node 20) · `test-runner` 21/21 · `test-homography` 40/40 · `build` ✅

## Kaj ostane
1. **Besedilne opombe k skicam** (»vrtanje tukaj«) — skice so že v PNG/PDF, manjka še
   kratko besedilo.
2. **Zgodovina večjih korakov** (sedaj je razveljiva le zadnja akcija).
3. **Samodejna izbira najboljših fotografij** za stranko (CompanyCam).
4. **Skupni model ograje** — panelna in deskna konstrukcija sta povezana, a še dva modela.
