# FAZA 19 — OZNAČBE (SKICE) NA FOTOGRAFIJAH + PDF DOKUMENTACIJSKA LISTA

**Projekt:** Mera3D Pro (monter3d)
**Status:** ✅ zaključeno

---

## Vzorec iz raziskave
Pri CompanyCam je ena izmed najpogosteje omenjenih funkcij **»annotations« — dodajanje
konteksta fotografijam**: monter na posnetku označi detajl, poškodbo ali mesto vrtanja.
Pri PixGrid je isti vzorec »text overlays« (naslovi, podnapisi, datumi). Brez tega je
dokumentacija za stranko »fotografije brez razlage«.

## Rešitev

### 1. Označbe (skice) čez fotografijo
- Nov modul `src/utils/annotation.ts`:
  - skica je **vektor** (`AnnotationStroke` z normaliziranimi koordinatami 0..1), ne slika —
    zato ostane ostra pri vsaki velikosti, ne poveča zapisa v bazi in se pravilno izriše
    v miniaturni, na platnu ter v dokumentacijski listi;
  - `toNormalizedPoint()`, `addStroke()`, `undoStroke()`, `drawAnnotation()`;
  - 4 barve in prilagodljiva debelina.
- Nova komponenta `src/components/PhotoAnnotator.tsx`: risanje s prstom ali miško
  (pointer events, `touch-none`), razveljavi, počisti, shrani.
- Dostop: korak **Zajem** → ✎ na miniaturi posnetka; skica se shrani **skupaj s
  fotografijo** (`Photo.annotation`, nov `updatePhoto` v shrambi).

### 2. Skica se prikaže v dokumentacijski listi
`renderPhotoSheet()` izriše tudi označbe (prerezano na celico), tako da izvozena PNG
dokumentacija vsebuje skice.

### 3. Dokumentacijska lista v PDF (za tisk)
`generatePhotoSheetPDF()` odpre tiskalni pogovor z A4 ležeče postavitvijo (fotografije z
napisi, glava z imenom projekta in datumom, noga s ključnimi podatki) — vzorec iz PixGrid
(izvoz PDF). Tudi to deluje lokalno: fotografije so podatkovni nizi v HTML, ničesar se
ne pošilja.

## Testi
- `src/tests/annotation.test.ts` (7): normalizacija koordinat (tudi izven platna),
  dodajanje/razveljavitev potez, risanje (barva, koordinate, pika brez premikanja).
- UI test: odprtje risanja, risanje poteze in **shranjevanje skice v bazo** skupaj s
  fotografijo.
- UI test dokumentacijske liste (izvoz PNG) in meritve (iz FAZA 17/18) — vsi zeleni.

## Preverjanje
`typecheck` (tsc + ESLint 10) ✅ 0 opozoril · `vitest` ✅ **160/160** (3× zaporedoma, tudi
na Node 20) · `test-runner` 21/21 · `test-homography` 40/40 · `build` ✅

## Opomba (napaka, ki jo je ujel test)
`setPointerCapture` v jsdom ni implementiran — klic je zdaj varen (»če obstaja«). Brez tega
bi risanje v testu in v nekaterih brskalnikih odpovedalo.

## Kaj ostane
1. **Pred/po primerjava** (PixGrid) — potrebuje označevanje posnetkov kot »pred«/»po« in
   posebno postavitev; zdaj imamo mehanizem označb, manjka še oznaka vloge.
2. **Izbira posnetkov za listo** in več postavitev (mreža / traka / ena velika + majhne).
3. **Označbe v PDF predračunu** — trenutno PDF predračun še ne vsebuje fotografij.
