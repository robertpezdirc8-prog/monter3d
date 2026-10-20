# FAZA 21 — IZBIRA FOTOGRAFIJ, TRAKASTA POSTAVITEV, ISKANJE V KATALOGU

**Projekt:** Mera3D Pro (monter3d)
**Status:** ✅ zaključeno

---

## Vzorec iz raziskave
PixGrid pred izvozom omogoča **izbiro fotografij** (»pick a layout, drop in your photos« — in
izbereš natanko tiste, ki jih želiš), ponuja pa tudi **postavitve, ki niso samo mreža**
(trak, asimetrične mreže). Pri nas je bila dokumentacijska lista »take all or nothing«,
katalog Roksal pa je bilo mogoče prebrskati samo z brskalnikom skozi spustni meni.

## 1. Izbira fotografij za listo
- V dokumentacijski listi je gumb **»🖼 N/M fotografij«**, ki odpre ploščico z miniaturami;
  klik na fotografijo jo **dodа/odstrani** iz liste (`aria-pressed` za dostopnost);
  v predogledu in izvozu se upoštevajo samo izbrane fotografije;
- števec v naslovu gumba sproti pokaže stanje (npr. »3/7 fotografij«).

## 2. Trakasta postavitev
- Nova postavitev **»Trak (vrstica)«** — fotografije v vrstici oziroma več vrsticah,
  kot filmski trak (PixGrid: »carousel / print layouts«);
- postavitev »Mreža« in »Primerjava pred/po« sta ostali.

## 3. Iskanje v katalogu Roksal
- Novi funkciji `searchProfiles()` in `searchColors()` v `data/roksalCatalog.ts`: iskanje po
  **imenu, ID-ju, opisu, tehničnih opombah, dimenzijah in dovoljenih razmikih**
  (uporabnik pogosto vpiše »1500« meaning 1500 mm razmika stebrov);
- **iskalno polje** v koraku Materiali in v konfiguratorju, ki filtrira seznam profilov
  (prikazano »Najdenih X od Y profilov«).

## Testi
- `src/tests/catalogSearch.test.ts` (7): iskanje po imenu, ID-ju, dimenziji/razmiku, barvi
  in po hex kodu; prazen niz vrne celoten katalog; neobstoječa beseda vrne prazno.
- `src/tests/photoSheet.test.ts` (+1): trakasta postavitev — celice v isti vrstici se ne
  prekrivajo.
- UI test: izbira fotografij (2/2 → 1/2).

## Preverjanje
`typecheck` (tsc + ESLint 10) ✅ 0 opozoril · `vitest` ✅ **173/173** (3× zaporedoma, tudi
na Node 20) · `test-runner` 21/21 · `test-homography` 40/40 · `build` ✅

## Kaj ostane
1. **Besedilne opombe k skicam** (npr. »vrtanje tukaj«) — skice so že v PNG/PDF, a
   potrebujejo še kratko besedilo.
2. **Ocenjevanje kakovosti dokumentacije** — katere fotografije so »dobre za stranko«
   (CompanyCam: samodejno izbira najboljše).
3. **Zgodovina sprememb projekta** (»undo«) — pri brisanju meritve ali fotografije.
4. **Skupni model ograje** — panelna in deskna konstrukcija sta povezana, a še dva modela.
