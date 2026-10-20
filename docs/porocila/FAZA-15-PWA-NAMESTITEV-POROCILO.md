# FAZA 15 — PWA NAMESTITEV IN INDIKATOR POVEZAVE

**Projekt:** Mera3D Pro (monter3d)
**Status:** ✅ zaključeno

---

## Kaj je narejeno
- **`src/components/InstallPrompt.tsx`**:
  - ob dogodku `beforeinstallprompt` se v glavi pokaže gumb **»⬇ Namesti«**, ki odpre
    brskalnikov poziv za namestitev (dogodek je zadržan, da ga prikažemo sami);
  - po uspešni namestitvi (`appinstalled`) se gumb umakne;
  - ob izgubi povezave (`offline`) se pokaže opozorilo **»⚠ Brez povezave«**, ob
    vračanju povezave pa izgine — uporabnik tako ve, da aplikacija sicer deluje
    (lokalna shramba + service worker), manjkajo pa spletni viri (galerija, AI model).
- Manifest in service worker sta bila vgrajena že v FAZA 8; manjkal je le način, da
  uporabnik aplikacijo namesti in da pozna stanje povezave.

## Testi
`src/tests/ui/installPrompt.test.tsx` (2 testa): poziv za namestitev se pojavi in
izvede, opozorilo o izgubljeni povezavi se prikaže in izgine ob vračanju.

## Preverjanje
`typecheck` ✅ · `eslint` ✅ 0 opozoril · `vitest` ✅ **143/143** (3× zaporedoma) ·
`test-runner` 21/21 · `test-homography` 40/40 · `build` ✅

## Kaj ostane
1. **CI koraki** — ESLint se zdaj izvaja prek `npm run typecheck` (CI ga že kliče),
   testi homografije pa so portani v vitest; patch je le neobvezna razlaga.
2. **iOS/Android specifike**: `apple-touch-icon` in manifest sta dodana, a zaslon za
   »namestitev« (iOS nima `beforeinstallprompt`) še ni ločen.
3. **Sinhronizacija med napravami** — namesto tega je varen prenos prek varnostne kopije.
