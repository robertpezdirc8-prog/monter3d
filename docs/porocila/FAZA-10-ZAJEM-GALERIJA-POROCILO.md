# FAZA 10 — ODKRITA NAPAKA: KALIBRACIJA MERILA NI DELOVALA

**Projekt:** Mera3D Pro (monter3d)
**Status:** ✅ zaključeno

> **Najpomembnejše v tej fazi:** UI-test merilnega toka je odkril, da se v aplikaciji
> **merilo sploh ni moglo kalibrirati**. Vse meritve so ostale v slikovnih točkah, zato
> metrični predračun ni bil dosegljiv. Popravljeno in pokrito s testom.

---

## 1. Kalibracija merila v koraku »Merilo« ni delovala (P0)

**Simptoma:** v koraku »Merilo« izbereš dve točki na fotografiji, vendar se vnos
referenčne dolžine nikoli prikaže — namesto njega se ustvari meritev v slikovnih
točkah.

**Vzrok:** korak »Merilo« (`ScaleView`) je uporabljal **isti** `handleCanvasClick` kot
korak »Meritve«. Ta handler ob drugem kliku:
1. izračuna razdaljo,
2. ustvari meritev,
3. **ponastavi točke** (`return []`).

Ker se točke ponastavijo, se pogoj `measurePoints.length === 2` v `ScaleView` nikoli ni
izpolnil → vnos referenčne dolžine ni bil dosegljiv → `setScale` se ni nikoli poklical →
`pixelToMeter` je ostal `null` → vse meritve so bile v `px` in brez uporabnega
predračuna. Kalibracija je bila dosegljiva samo prek Notranjega API-ja.

**Rešitev:**
- Nov handler `handleReferenceClick` za korak »Merilo«: zbirka **le** dveh točk, brez
  ustvarjanja meritve;
- `ScaleView` dobi svoj handler (`onCanvasClick={handleReferenceClick}`);
- po potrditvi merila se točke ponastavijo;
- meritve, narejene **pred** kalibracijo, se ob potrditvi merila samodejno pretvorijo
  v metre (`value * m/px`, `unit: 'm'`, status `verified`) — uporabnik ne mora znova
  meriti, kar je bilo prej izguba dela na terenu;
- referenčna (kalibracijska) meritev je skrita iz seznama meritev (`MeasurementsView`) —
  pripada merilu fotografije, ne objektu.

**Regresijski test** (`src/tests/ui/measurementFlow.test.tsx`) pokriva celoten tok:
nalaganje projekta s fotografijo → klik na platno → meritev v `px` → kalibracija
(100 px = 2 m) → merilo `0,02000 m/px` → meritev postane `2.000 m ±3,0 %` in
`PREVERJENA`, referenčna meritev pa v tabeli ni.

## 2. Voden zajem po obrti shranjuje posnetke v projekt

Do sedaj je `TradeCapture` držal posnetke **le v pomnilniku** — ob zaprtju zaslona so bili
izgubljeni, projekt pa je ostal brez fotografij.

- Nov modul `src/utils/tradeCapture.ts`: `frameStatsToImageQuality()` (enaka metrika
  kakovosti kot pri zajemu iz datoteke), `photoStatusForQuality()`,
  `resolveTradeProject()` (nadaljuj v aktivnem projektu ali ustvari novega),
  `createTradeProject()`.
- `TradeCapture` ob zagonu določi projekt, omogoča **preklop med projekti**, vsak
  posnetek shrani v shrambo (`savePhoto`), brisanje posnetka izbriše tudi shranjeno
  fotografijo, uporabnik vidi, kam se shranjuje.

## 3. Galerija: popravljen filter po barvi, lokalne slike, offline prikaz

Odkrita napaka: galerija je uporabljala ID-je barv (`amazon`, `ash`, `golden`, `burma`),
katalog pa `amazon-wood`, `ash-wood`, `golden-teak`, `burma-teak` → **filter po barvi je
vedno vrnil 0 slik**, v modalu pa je bila barva vedno »Neznano«.

- ID-ji so normalizirani, `getColorById()` razume tudi krajšne zapise;
- **lokalne slike**: nov skript `scripts/fetch-roksal-images.mjs` (`npm run fetch:images`)
  prenese 18 slik z roksal.com v `public/roksal/images/{vertical,horizontal,stairs,profiles,swatches}/`
  (preveri magic bytes, je idempotentna, obstoječe preskoči);
  `roksalGallery.ts` ima zdaj `localPath` ob vsaki sliki;
- `RoksalImageView` naloži **lokalno kopijo → nato izvirnik → nato nadomestek**
  (barvni vzorec iz kataloga + »Slika ni dosegljiva (offline)«), z `loading="lazy"`,
  `decoding="async"` in `referrerPolicy="no-referrer"`;
- v galeriji je obvestilo, da so slike lokalne in kaj je vir;
- **test preveri, da lokalna datoteka res obstaja** — manjkajoča slika takoj pokaže napako
  v CI, ne pa tiho praznega okvirja;
- avtorstvo: slike so last Roksala, pogoji uporabe so zapisani v `public/roksal/README.md`.

## 4. Drobno
- Platni v `ScaleView` in `MeasurementsView` sta dobila oznako (`aria-label`) — boljša
  dostopnost in testabilnost.
- UI test za izvoz CSV (preveri, da se izvoz zažene).

## Preverjanje
`typecheck` ✅ · `lint` ✅ 0 napak · `vitest` ✅ **117/117** (prej 116, stabilno 3×) ·
`test-runner` 21/21 · `test-homography` 40/40 · `build` ✅

## Kaj ostane
1. **Skupni model ograje** — `geometry.ts` (panelna) in `fenceConstruction.ts` (deskna) sta
   še različna modela; povezani sta prek `roksalRules.ts`.
2. **UI testi** — PDF poročilo, uvoz varnostne kopije, merjenje v koraku »Kakovost«.
3. **Galerija** — lokalne slike so naložene in galerija deluje brez povezave; ostane še
   preverjanje pogojev uporabe pri Roksalu za komercialno uporabo.
