# FAZA 10 — ZAJEM PO OBRTI, GALERIJA BREZ POVEZAVE, UI TESTI IZVOZA

**Projekt:** Mera3D Pro (monter3d)
**Status:** ✅ zaključeno

---

## 1. Voden zajem po obrti shranjuje posnetke v projekt

Do sedaj je `TradeCapture` (zajem po obrtih: ograje, keramika, fasade, krovstvo) držal
posnetke **le v pomnilniku komponente** — ob zaprtju zaslona so bili izgubljeni, projekt pa
je ostal brez fotografij.

**Rešitev:**
- Nov modul `src/utils/tradeCapture.ts`:
  - `frameStatsToImageQuality()` — statistika kadra (ostrina, svetloba, kontrast) se
    pretvori v enotno `ImageQuality` (enaka metrika kot pri zajemu iz datoteke),
  - `photoStatusForQuality()` — posnetek je zavrnjen, če kakovost ni dovoljiva,
  - `resolveTradeProject()` — zajem nadaljuje v aktivnem projektu; če projekta ni,
    se ustvari nov (`Ograja – 20. 10. 2026`),
  - `createTradeProject()` — nov projekt pripravljen za zajem.
- `TradeCapture` ob zagonu določi projekt, omogoča **preklop med projekti** in ob vsakem
  posnetku shrani fotografijo v shrambo (`savePhoto`). Pri brisanju posnetka se izbriše
  tudi shranjena fotografija. Uporabnik vmes vidi, kje se posnetki shranjujejo.

## 2. Galerija: popravljen filter po barvi + offline prikaz

Odkrita napaka: galerija je uporabljala ID-je barv (`amazon`, `ash`, `golden`, `burma`),
katalog pa `amazon-wood`, `ash-wood`, `golden-teak`, `burma-teak` → **filter po barvi je
vedno vrnil 0 slik**, v modalu pa je bila barva vedno »Neznano«.

**Rešitev:**
- ID-ji barv v `roksalGallery.ts` so normalizirani na kataloške;
- `getColorById()` razume tudi krajšne zapise (za starejše podatke);
- nov `src/components/RoksalImageView.tsx`: `loading="lazy"`, `decoding="async"`,
  `referrerPolicy="no-referrer"` in **nadomestek ob napaki** (barvni vzorec iz kataloga +
  sporočilo »Slika ni dosegljiva (offline)«);
- v galeriji je obvestilo, da so slike zunanji vir, katalog pa deluje brez povezave.

## 3. UI testi: izvoz CSV

Dodan test, da se izvoz sploh zažene (preverjanje `URL.createObjectURL`), poleg
obstoječih testov (projekt, osvežitev, brisanje, ErrorBoundary, segmenti, profil, galerija).

## Preverjanje
`typecheck` ✅ · `lint` ✅ 0 napak · `vitest` ✅ **115/115** (prej 101) · `test-runner` 21/21 ·
`test-homography` 40/40 · `build` ✅

## Kaj ostane
1. **Skupni model ograje** — `geometry.ts` (panelna) in `fenceConstruction.ts` (deskna) sta
   še različna modela; povezani sta prek `roksalRules.ts`.
2. **UI testi** — meritve na platnu (risanje), PDF poročilo, uvoz varnostne kopije.
3. **Galerija** — za popolnoma offline delovanje bi bile potrebne lokalne slike
   (licenca: slike so last Roksala, zato jih ne shranjujemo v repozitorij brez dovoljenja).
