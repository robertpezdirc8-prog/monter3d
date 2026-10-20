# FAZA 18 — DOKUMENTACIJSKA LISTA (fotomontaža, lokalno)

**Projekt:** Mera3D Pro (monter3d)
**Status:** ✅ zaključeno

---

## Raziskava: kako delujejo spletne aplikacije za fotomontažo

Pregledal sem trije reprezentativne vire in izluščil vzorce, ki se ponovijo:

### 1. Abox »Image Layout« (contact sheet maker) — https://abox.tools/image-layout/
- **100 % lokalno**: slike se berejo, razporejajo in izvozijo v brskalniku (canvas);
  **ni nalaganja**, ni računa, ni vodenja, **dela brez povezave**;
- predogled uporablja majhne kopije (hitro), izvoz pa izvirne datoteke — **enaka
  geometrija** za oboje;
- izhodi: PNG/JPEG/WebP; omejitev canvasa 8192 px na stran in 32 MP;
- **EXIF/GPS/datumske oznake se ne preneso** v izdelek (zasebnost);
- zasebnost je **preverljiva** (Network tab, delo brez omrežja).

### 2. PixGrid (photo grid maker) — https://pixgrid.io/features/photo-collage
- prednastavljeni rasporedi za 2–9+ fotografij (mreže, masonry, asimetrični);
- prilagodljiv razmak, zaobljeni robovi, ozadje;
- **vlečenje in zamenjava fotografij med celicami**, prilagajanje »fit/fill«;
- **napisi nad fotografijami** (naslovi, podnapisi, datumi);
- izvoz **PNG / JPEG / PDF**, poljubne velikosti (tudi za tisk);
- uporaba »pred/po« za primerjavo;
- »vaše fotografije ostanejo v napravi« — brez nalaganja.

### 3. CompanyCam (dokumentacija gradenj) — https://companycam.com/features/documents-reports
- **kolekcije in časovnice** fotografij, **označbe (annotations)**, oznake in oznake;
- **dokumenti z vnaprej izdelanimi postavitvami in predlogi**, pokrivalna stran, bloki;
- **poročila s fotografijami**: »Progress Recap«, »Summary«, »Daily Log« — izbrane
  fotografije + podatki → poročilo za stranko, obdelovalce ali ekipo;
- deluje **offline**, posnetki se sinhronizirajo, ko je omrežje na voljo.

## Kaj je manjkalo v naši aplikaciji
- **PDF poročilo je bilo brez fotografij** — dokumentacija dela brez slik je za stranko
  in za obdelovalca praktično neuporabna (to je vrhunski scenarij pri CompanyCam).
- **Ni bilo mogoče sestaviti montaže** iz posnetkov (mreža, napisi, izvoz v sliko).
- **Ni bilo napisov na fotografijah** (meritev, čas) — ravno tisto, kar naredi
  dokumentacijo razumljivo.
- Prednost, ki jo imamo: **vse lokalno** (kot Abox in PixGrid), brez nalaganja
  fotografij tretjim osebam.

## Rešitev: dokumentacijska lista (kontaktna lista)
Nov modul `src/utils/photoSheet.ts` + komponenta `src/components/PhotoSheetView.tsx`:

- **mreža fotografij** (do 24) z **napisom pod vsako fotografijo** (meritev + čas),
  **glavo** (ime projekta, datum, število fotografij) in **nogo** (ključni podatki:
  dolžina ograje, število paneli/desk, stebri);
- **prednastavitve**: A4 ležeče, A4 pokončno, kvadrat (1600 × 1600) — za tisk ali deljenje;
- **izvoz v PNG** prek `canvas.toBlob` — **lokalno v brskalniku**, brez nalaganja;
- dostopna iz koraka **Izvoz** (»📸 Dokumentacijska lista«).

### Testi
- `src/tests/photoSheet.test.ts` (6 testov): geometrija mreže (celice se ne prekrivajo in
  so znotraj platna), napisi (meritev + čas), omejitev 24 fotografij, prednastavitve,
  robni primer brez fotografij;
- UI test: odprtje predogleda in izvoz PNG (z nadomestki za `Image` in `toBlob`, ker
  jsdom slik ne nalaga).

## Preverjanje
`typecheck` (tsc + ESLint 10) ✅ 0 opozoril · `vitest` ✅ **152/152** (3× zaporedoma) ·
`test-runner` 21/21 · `test-homography` 40/40 · `build` ✅

## Kaj ostane (iz raziskave)
1. **Označbe na fotografijah** (CompanyCam): risanje skice/označb čez posnetek.
2. **Pred/po primerjava** (PixGrid): označitev posnetka kot »pred« ali »po« in posebna
   postavitev — potrebuje označevanje posnetkov, ki še ni implementirano.
3. **Več postavitev** (mreža, traka, ena velika + majhne) in možnost izbire posnetkov.
4. **PDF z dokazno kakovostjo** — A4 lista bi morala biti tudi PDF (PixGrid izvoza PDF);
   trenutno izvozamo PNG, PDF poročilo pa je namenjeno predračunu.
