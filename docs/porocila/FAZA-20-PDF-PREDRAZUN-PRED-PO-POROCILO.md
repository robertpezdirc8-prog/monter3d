# FAZA 20 — FOTOGRAFIJE V PDF PREDRAČUNU + PRIMERJAVA »PRED/PO«

**Projekt:** Mera3D Pro (monter3d)
**Status:** ✅ zaključeno

---

## Vzorec iz raziskave
CompanyCam je znan po tem, da stranki pošilja **dokumentacijo dela s fotografijami**
(»Skip the Blank Page« → predloge poročil s fotografijami), PixGrid pa ima postavitev
»Before and After« za primerjavo posnetkov.

## 1. Fotografije (in skice) v PDF predračunu
Do sedaj je bil PDF predračun **samo številke** — stranka je dobila ceno, ne videnega
dela. Zdaj vsebuje tudi **galerijo fotografij z napisi** (meritev + čas).

- `photoGalleryHtml()` v `utils/pdfExport.ts`: mreža 3 × n, slike so podatkovni nizi
  (ničesar se ne pošilja), `object-fit: cover`, napis pod vsako fotografijo;
- **skice se vgradijo kot SVG** nad fotografijo (`viewBox="0 0 100 100"`), ker so
  normalizirane koordinate — brez dodatnega zapisa v bazi in brez izgube kakovosti;
- do 12 fotografij v poročilu (več v dokumentacijski listi).

## 2. Primerjava »pred/po«
- Nov podatek `Photo.role`: `'before' | 'after' | 'detail' | 'other'`;
- v koraku **Zajem** se vlogi izbere na miniaturi posnetka (spustni meni);
- dokumentacijska lista ima postavitev **»Primerjava pred / po«**: posnetki z vlogoma
  `before` in `after` se povežejo v pare, vsak par v eni vrstici, levo »pred«, desno »po«;
  če parov ni, postavitev samodejno pade nazaj na mrežo.

## Testi
- `src/tests/pdfExport.test.ts` (3): galerija je v HTML poročila, skice so SVG poti z
  barvo, brez fotografij galerije ni;
- `src/tests/photoSheet.test.ts` (+2): postavitev pred/po poveže pare (levo/desno, isti
  `y`, oznaki v napisu) in pade nazaj na mrežo, ko parov ni.

## Preverjanje
`typecheck` (tsc + ESLint 10) ✅ 0 opozoril · `vitest` ✅ **165/165** (3× zaporedoma, tudi
na Node 20) · `test-runner` 21/21 · `test-homography` 40/40 · `build` ✅

## Kaj ostane
1. **Izbira posnetkov za listo** — uporabnik sam izbere, katere fotografije gredo v listo
   (PixGrid: izbira pred izvozom).
2. **Trakaste postavitve** (en vrstni red fotografij) in »ena velika + majhne«.
3. **Iskalnik/filtri v katalogu Roksal** — danes filter po barvi deluje samo v galeriji.
4. **Označbe v predračunu z opombami** (npr. »vrtanje tukaj«) — skice so že v PDF, a
   potrebujejo še besedilo.
