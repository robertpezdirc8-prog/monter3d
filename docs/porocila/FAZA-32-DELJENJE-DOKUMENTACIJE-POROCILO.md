# FAZA 32 — DELJENJE DOKUMENTACIJE BREZ STREŽNIKA (samostojen HTML)

**Projekt:** Mera3D Pro (monter3d)
**Status:** ✅ zaključeno

---

## Zakaj
Aplikacija je povsem lokalna — to je prednost (zasebnost, delo brez povezave) in hkrati
omejitev: **projekt ni mogoče deliti med napravami** (mobilna na terenu ↔ računalnik v
pisarni). Sinhronizacija z oblakom bi pomenila strežnik, kar je v nasprotju z zasnovo
aplikacije (ni računa, ni nalaganja podatkov tretjim osebam).

## Rešitev
**Samostojen HTML dokument**: aplikacija izdela eno datoteko `.html`, ki vsebuje
- projekt, ključne podatke (dolžina, material, predračun, število fotografij),
- tabelo meritev (v izbrani enoti, z virom, negotovostjo in statusom),
- **fotografije vgrajene kot data-URI** (z opombami ob skicah),
- opombo uporabnika (npr. »ponudba«).

Dokument se odpre v **kateremkoli brskalniku** — pisarna ne potrebuje aplikacije. Monter
ga pošlje po WhatsAppu, e-pošti ali prek USB-ja.

## Varnost
- vse vneseno besedilo (ime projekta, opomba, opisi meritev) se **escapa** (`escapeHtml`),
  zato dokument ne more izvesti uporabnikovega skripta;
- pri velikih dokumentih (> 25 MB zaradi fotografij) se **vpraša za potrditev**;
- dokument je namenjen **branju**; uvoz v aplikacijo je že podprt prek varnostne kopije
  (JSON), zato ni dvojne poti.

## Testi
`src/tests/shareExport.test.ts` (5): escaping nevarnih znakov, vsebina dokumenta
(projekt, meritve, fotografija, znesek), enota prikaza, escaping opombe, ocena velikosti.

## Preverjanje
`typecheck` (tsc + ESLint 10) ✅ 0 opozoril · `vitest` ✅ **205/205** (2× zaporedoma) ·
`test-runner` 21/21 · `test-homography` 40/40 · `build` ✅

## Kaj ostane
1. **Preostale večje komponente** — `MathTestRunner` (577, razvojni prikaz, že lazy),
   `FenceVisualizer` (442), `CameraCapture` (412).
2. **Dnevnik v dokumentacijski listi** (danes v PDF predračunu).
3. **Dnevnik v deljenem HTML dokumentu** — sled dela bi bila del dokumentacije za pisarno.
