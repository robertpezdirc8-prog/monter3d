# Indeks poročil po fazah

Poročila opisujejo, **kaj se je spremenilo, zakaj in kako je bilo preverjeno**.

## Faze 2–6 (zgodovina projekta)
Predhodni razvoj: `FAZA-2…FAZA-6F.1.3` (preverjanje, voden zajem, povezovanje, vizualizacija,
galerija, konfigurator, tehnična pravila, dejanski testi). Večina od teh poročil je
zgodovinskih — deli so bili pozneje nadomeščeni z avtomatiziranimi testi.

## Faza 7–8 — P0: izgubljeni podatki in nedelujoče upravljanje projektov
- `FAZA-7-8-P0-P1-POROCILO.md` — kalibracija merila v UI-ju ni delovala; meritve, načrti in
  predračun se niso shranjevali; fotografije so bile podvojene; projekta ni bilo mogoče
  odpreti ali izbrisati; ni bilo varnostne kopije; homografija je zavračala realen šum;
  RANSAC je bil nedeterminističen; koti ograje in orodja (ESLint, CI).

## Faza 9 — razčlenitev `App.tsx` + UI testi
- `FAZA-9-REFACTOR-POROCILO.md` — `App.tsx` 2497 → ~1250 vrstic; prvi UI testi (jsdom).

## Faza 10–12 — funkcionalne izboljšave in čiščenje
- `FAZA-10-ZAJEM-GALERIJA-POROCILO.md` — zajem po obrti shranjuje v projekt; galerija
  offline z lokalnimi slikami.
- `FAZA-11-POENOTENJE-OGRAJE-POROCILO.md` — deskna konstrukcija je del predračuna.
- `FAZA-12-CISCENJE-KODE-POROCILO.md` — ESLint 93 opozoril → 0; odkrita napaka TDZ;
  popravljen prikaz ujemanja fotografij.

## Faza 13–17 — dokumentacija, napake uporabnika, orodja
- `FAZA-13-KONFIGURATOR-KOPIJE-POROCILO.md` — konfigurator prenaša izbiro v projekt;
  kopija vseh projektov.
- `FAZA-14-ROCNI-VNOS-DOLZIN-POROCILO.md` — ročni vnos dolžin (terenski scenarij).
- `FAZA-15-PWA-NAMESTITEV-POROCILO.md` — namestitev aplikacije in indikator povezave.
- `FAZA-16-ESLINT10-CI-POROCILO.md` — ESLint 10, CI brez spremembe workflow datoteke.
- `FAZA-17-UPRAVLJANJE-NAPAK-POROCILO.md` — brisanje in izključitev meritev/fotografij.

## Faza 18–24 — dokumentacija za stranko
- `FAZA-18-DOKUMENTACIJSKA-LISTA-POROCILO.md` — kontaktna lista fotografij (PNG).
- `FAZA-19-OZNACBE-POROCILO.md` — skice čez posnetke.
- `FAZA-20-PDF-PREDRAZUN-PRED-PO-POROCILO.md` — fotografije in primerjava pred/po v PDF.
- `FAZA-21-IZBIRA-FOTOGRAFIJ-ISKANJE-POROCILO.md` — izbira posnetkov, trak, iskanje kataloga.
- `FAZA-22-RAZVELJAVI-POROCILO.md` — razveljava po brisanju.
- `FAZA-23-OPOMBE-NAJBOLJSE-POROCILO.md` — opombe ob skicah, samodejna izbira fotografij.
- `FAZA-24-ZGODOVINA-RAZVELJAVITEV-POROCILO.md` — več zaporednih razveljitev.

## Faza 25–28 — enoten izračun in sled dela
- `FAZA-25-RAZCLENITEV-KONFIGURATORJA-POROCILO.md` — konfigurator 781 → 414 vrstic.
- `FAZA-26-ENOTEN-IZRACUN-POROCILO.md` — en cev za panelno in deskno konstrukcijo.
- `FAZA-27-ZGODOVINA-POROCILO.md` — dnevnik opravljenih dejanj (korak 🕘).
- `FAZA-28-POTEK-DELA-POROCILO.md` — potek dela v PDF poročilu.

## Faza 29–33 — terensko delo in prenos
- `FAZA-29-RAZCLENITEV-OVERLAY-POROCILO.md` — razčlenitev `MeasurementOverlay`; test »hitri ocen«.
- `FAZA-30-LAZY-RAZCLENITEV-POROCILO.md` — lazy nalaganje razvojnih prikazov; razčlenitev
  `GuidedCapture`.
- `FAZA-31-ENOTE-POROCILO.md` — enote dolžin (m / cm / mm).
- `FAZA-32-DELJENJE-DOKUMENTACIJE-POROCILO.md` — samostojen HTML dokument za pisarno.
- `FAZA-33-POTEK-DELA-V-DELJENI-DOKUMENTACIJA-POROCILO.md` — potek dela v deljenem dokumentu.

## Ostalo
- `CI-ENHANCEMENTS.patch` — **neobvezno**: ESLint se v CI izvaja prek `npm run typecheck`
  (zato spremembe workflow datoteke niso potrebne). Patch je le razlaga.
- `NEODVISNA-KONTROLA.md`, `KONCNO-*.md`, `TEHNICNO-POROCILO.md` — zgodovinski pregledi.
