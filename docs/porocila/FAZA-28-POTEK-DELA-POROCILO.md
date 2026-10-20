# FAZA 28 — POTEK DELA V PDF POROČILU

**Projekt:** Mera3D Pro (monter3d)
**Status:** ✅ zaključeno

---

## Zakaj
FAZA 27 je dne vnik pokazal v aplikaciji. Zdaj je bila v PDF poročilu (dokumentu, ki
gre stranki) samo številka, fotografije in nato predračun — **manjkal je sled dela**:
kdaj je bilo izmerjeno, kdaj je bila dodana fotografija, kdaj je bil izračunan načrt.
Za stranko in obdelovalca je to najpomembnejši del dokumenta (»dokumentacija dela« po
CompanyCam), saj pove, **kdaj in kaj** je bilo narejeno.

## Rešitev
- `generatePDFReport(..., activity)` dobi dnevnik in izpiše novo sekcijo **»🕘 Potek dela«**:
  tabela s časom, tipom dejanja (ikona + oznaka) in opisom, urejena po času;
- dnevnik prihaja iz istega vira kot korak »Zgodovina« — en vir resnice;
- brez dnevnika se sekcija enostavno izpusti (poročilo ostane veljavno).

## Testi
`src/tests/pdfExport.test.ts` (+2): poročilo vsebuje potek dela z obema dogodkoma v
pravilnem vrstnem redu (najprej najstarejši) in brez dnevnika sekcije ni.

## Preverjanje
`typecheck` (tsc + ESLint 10) ✅ 0 opozoril · `vitest` ✅ **191/191** (3× zaporedoma, tudi
na Node 20) · `test-runner` 21/21 · `test-homography` 40/40 · `build` ✅

## Kaj ostane
1. **Preostale večje komponente** — `GuidedCapture` (587), `MathTestRunner` (577),
   `MeasurementOverlay` (450), `FenceVisualizer` (442), `CameraCapture` (412).
2. **Sinhronizacija med napravami** — za zdaj varen prenos prek varnostne kopije.
3. **Dnevnik tudi v dokumentacijski listi** (danes je samo v PDF predračunu).
