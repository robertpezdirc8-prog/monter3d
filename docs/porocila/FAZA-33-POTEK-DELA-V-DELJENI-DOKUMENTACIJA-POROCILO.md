# FAZA 33 — POTEK DELA V DELJENI DOKUMENTACIJI

**Projekt:** Mera3D Pro (monter3d)
**Status:** ✅ zaključeno

---

## Zakaj
Deljeni HTML dokument (FAZA 32) je pisarni pokazal projekt, meritve, fotografije in
predračun — **manjkal je sled dela**: kdaj je bilo izmerjeno, dodano in izračunano.
Za obdelovalca in stranko je to najbolj uporabni del dokumenta (»dokumentacija dela«),
saj pove *kdaj in kaj* je bilo narejeno.

## Rešitev
- `buildShareDocument()` sprejme `activity: ActivityEntry[]` in izpiše sekcijo
  **»Potek dela«** — tabela s časom, tipom dejanja (ikona + oznaka) in opisom,
  urejena po času;
- vsebina je isti dnevnik kot v koraku »Zgodovina« in v PDF predračunu — **en vir resnice**;
- vse besedilo je escaped, zato tudi tu uporabnikov vnos ne more izvesti skripta.

## Testi
`src/tests/shareExport.test.ts` (+2): dokument vsebuje potek dela z dogodki v pravilnem
vrstnem redu in brez dnevnika sekcije ni.

## Preverjanje
`typecheck` (tsc + ESLint 10) ✅ 0 opozoril · `vitest` ✅ **207/207** (2× zaporedoma, tudi
na Node 20) · `test-runner` 21/21 · `test-homography` 40/40 · `build` ✅

## Kaj ostane
1. **Preostale večje komponente** — `MathTestRunner` (577, razvojni prikaz, že lazy),
   `FenceVisualizer` (442), `CameraCapture` (412).
2. **Dnevnik v dokumentacijski listi (PNG/PDF)** — trenutno je v PDF predračunu in v
   deljenem HTML dokumentu, ne pa na listi s fotografijami.
3. **Končni pregled dokumentacije repozitorija**.
