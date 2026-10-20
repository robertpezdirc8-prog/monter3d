# FAZA 13 — KONFIGURATOR V DELU TOKA, VARNOSTNA KOPIJA VSEH PROJEKTOV, TESTI KORAKA »KAKOVOST«

**Projekt:** Mera3D Pro (monter3d)
**Status:** ✅ zaključeno

---

## 1. Konfigurator ni več slepa ulica

`FenceConfigurator` je bil samostojen modal: uporabnik je tam izračunal deskno
konstrukcijo, rezultata pa ni mogel prenesti v projekt — predračun je moral znova
sestaviti v koraku Materiali.

**Zdaj** ima gumb **»✓ Uporabi v projektu«**, ki prenese izbiro v trenutni projekt:
- `profileId` → izbrani Roksal profil,
- `panelHeight` → višina ograje (mm → m),
- `boardSpacing` → razmik med deskami (mm),
- `orientation` → orientacija desk (pri profilih, ki dovolijo obe),
- `constructionType` → preklop na **deskno** konstrukcijo.

Konfigurator s tem ni več ločen izračun, temveč **napredno orodje istega toka**.

## 2. Varnostna kopija celotnega delovnega okolja

Do sedaj je bilo mogoče izvoziti samo **en projekt**. Za terensko uporabo (več
objektov, več naprav) manjka arhiviranje celotnega delovnega okolja.

Nov modul `src/utils/backup.ts`:
- `createWorkspaceBackup(projects, photosByProject)` — ena datoteka z vsemi projekti in
  fotografijami;
- `parseWorkspaceBackup()` — preveri format (app, verzija, seznam projektov);
- `restoreWorkspaceBackup()` — obnova vsakega projekta kot **nova** projekta (izvirnik
  ostane nedotaknut).

UI: na zaslonu »Nov projekt« je gumb **»🗄️ Kopija vseh projektov«**, uvoz pa
zdaj prepoznava **obe obliki** (posamezni projekt ali celotno delovno okolje) in obnovi
ustrezno.

## 3. Testi koraka »Kakovost«

`src/tests/ui/qualityStep.test.tsx` preveri, da korak prikaže število sprejetih,
čakajočih in zavrnjenih posnetkov ter da brez fotografij ponudi obvestilo.

## Preverjanje
`typecheck` ✅ · `eslint` ✅ 0 opozoril · `vitest` ✅ **139/139** (3× zaporedoma) ·
`test-runner` 21/21 · `test-homography` 40/40 · `build` ✅

## Kaj ostane
1. **CI koraki** — od FAZA 16 dalje `npm run typecheck` preverja tudi ESLint, CI pa že
   kliče `npm run typecheck`; zato je lint v CI brez spremembe workflow datoteke
   (`docs/porocila/CI-ENHANCEMENTS.patch` je zdaj le neobvezna razlaga).
2. **Namestitev aplikacije (PWA)** — manifest in service worker sta vgrajena, manjka pa
   poziv za namestitev in lepši zaslon za »offline« stanje.
3. **Vnos ročnih dolžin** — trenutno je dolžina meritev vezana na klik na fotografijo;
   za teren, kjer se ne meri po sliki, bi koristil ročni vnos dolžine segmenta.
