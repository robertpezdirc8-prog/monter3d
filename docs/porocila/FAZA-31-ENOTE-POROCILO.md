# FAZA 31 — ENOTE DOLŽIN (m / cm / mm)

**Projekt:** Mera3D Pro (monter3d)
**Status:** ✅ zaključeno

---

## Zakaj
Aplikacija je računala in prikazovala **vedno v metrih**. Na terenu pa monterji
merijo z metrom ali laserjem, kjer je naravno delati v **centimetrih ali milimetrih**
(npr. »650 cm«). Vpis v centimetrih je bil prej nemogoč brez ročne pretvorbe.

## Rešitev
- Nov modul `src/utils/units.ts`: `LengthUnit` (`m` / `cm` / `mm`), `UNIT_TO_METRES`,
  `toUnit()`, `fromUnit()`, `normalizeUnit()`, `unitLabel()` in `formatLength()`
  (npr. `650.0 cm ±2.0%`).
- **Notranji račun je vedno v metrih** — pretvorba je le na vhodu in izhodu, zato
  napaka v enoti ne more vplivati na izračune.
- **Vnos**: v koraku Meritve je preklop enote; vpisana vrednost se razume v izbrani enoti
  in shrani v metre (meritev ostane `unit: 'm'`).
- **Prikaz**: tabela meritev, PDF poročilo in izvozi kažejo vrednost v izbrani enoti.
- **Nastavitev je del projekta** (`ProjectSettings.lengthUnit`) — shrani se skupaj s
  stanjem in obnovi ob odprtju projekta.

## Testi
- `src/tests/units.test.ts` (7): pretvorbe v obe smeri, faktorji, formatiranje z
  negotovostjo, normalizacija neznane enote.
- UI test: preklop na centimetre → vpis `650` → meritev je prikazana kot
  `650.0 cm ±2.0%` (kar pomeni 6,5 m).

## Preverjanje
`typecheck` (tsc + ESLint 10) ✅ 0 opozoril · `vitest` ✅ **200/200** (2× zaporedoma, tudi
na Node 20) · `test-runner` 21/21 · `test-homography` 40/40 · `build` ✅

## Kaj ostane
1. **Preostale večje komponente** — `MathTestRunner` (577, razvojni prikaz, že lazy),
   `FenceVisualizer` (442), `CameraCapture` (412).
2. **Sinhronizacija med napravami** — za zdaj varen prenos prek varnostne kopije.
3. **Dnevnik v dokumentacijski listi** (danes v PDF predračunu).
