# Mera3D Pro — Končno poročilo o matematični validaciji

**Datum:** 2026  
**Status:** Matematična validacija implementirana, build uspešen

---

## 1. Homografija (`src/utils/cv.ts`)

### 1.1 Izboljšana konvergenca (vrstice 433-462)
**PREJ:** Preverjanje konvergence na normi vektorja pred normalizacijo
```typescript
// NAPAČNO:
const currentNorm = vectorNorm(w);
if (iter > 20 && Math.abs(currentNorm - prevNorm) < 1e-12) {
  converged = true;
  break;
}
```

**ZDaj:** Preverjanje spremembe smeri normaliziranega vektorja
```typescript
// PRAVILNO:
let dotProduct = 0;
for (let i = 0; i < n; i++) dotProduct += prevV[i] * w[i];
const angleChange = Math.acos(Math.min(1, Math.max(-1, Math.abs(dotProduct))));

if (iter > 20 && angleChange < 1e-10) {
  converged = true;
  v = w;
  break;
}
```

**Izboljšave:**
- ✓ Konvergenca meri spremembo smeri (kot med vektorji), ne magnitude
- ✓ Uporaba `Math.acos(dotProduct)` za merjenje kota
- ✓ Strožji prag (`1e-10` radianov ≈ `0.0000003°`)

### 1.2 Preverjanje H[8] (vrstice 343-349)
**Dodano preverjanje za nevarno majhne imenovalce:**
```typescript
if (Math.abs(H[8]) < 1e-10) {
  // H[8] is too small - degenerate or invalid solution
  return null;
}
```

**Zakaj:** Normalizacija z `H[8] ≈ 0` bi povzročila numerično nestabilnost in neskončne vrednosti.

### 1.3 RMSE izračun (vrstice 376-384)
**Potrjena pravilna formula:**
```typescript
// RMSE = sqrt(mean(squared_errors))
if (isInlier) {
  sumSquaredError += err * err;  // ✓ Kvadrirane napake
  inlierCount++;
}
const rmse = inlierCount > 0 ? Math.sqrt(sumSquaredError / inlierCount) : Infinity;
```

### 1.4 OMEJITVE METODE
- ⚠ Metoda A^T*A kvadrira pogojeno število matrike
- ⚠ Za optimalno stabilnost bi bil potreben SVD (zahteva zunanje knjižnice)
- ⚠ Trenutna implementacija je kompromis med stabilnostjo in neodvisnostjo

---

## 2. RANSAC refiniranje (`src/utils/cv.ts`, vrstice 620-670)

### 2.1 Popravek: ponovni izračun po refiniranju
**PREJ:** Po refiniranju se niso posodobili `bestInliers`, `bestCount`, `bestRMSE`
```typescript
// NAPAČNO:
if (refined) {
  bestMatrix = refined.matrix;
  bestRMSE = refined.rmse;
  // bestInliers in bestCount NISTA posodobljena!
}
```

**ZDaj:** Po refiniranju se ponovno izračunajo vse vrednosti za končni model
```typescript
// PRAVILNO:
bestMatrix = refined.matrix;
const finalInliers: boolean[] = [];
let finalCount = 0;
let finalSumSquaredError = 0;

for (let i = 0; i < srcPoints.length; i++) {
  // ... izračun napake za vsak par ...
  const err = Math.sqrt((u - dstPoints[i].x) ** 2 + (v - dstPoints[i].y) ** 2);
  const isInlier = err < threshold;
  finalInliers.push(isInlier);
  
  if (isInlier) {
    finalSumSquaredError += err * err;
    finalCount++;
  }
}

const finalRMSE = finalCount > 0 ? Math.sqrt(finalSumSquaredError / finalCount) : Infinity;

return { 
  matrix: bestMatrix, 
  inliers: finalInliers,  // ✓ Posodobljeno
  inlierCount: finalCount,  // ✓ Posodobljeno
  rmse: finalRMSE  // ✓ Posodobljeno
};
```

**Zagotovilo:** Vrnjena matrika, maska, število inlierjev in RMSE opisujejo **isti končni model**.

---

## 3. Geometrija ograje (`src/utils/geometry.ts`, vrstice 5-11)

### 3.1 Dodan komentar o omejitvah
```typescript
// Calculate fence plan from segments
// NOTE: This function requires segments with explicit coordinates (startPoint, endPoint).
// If only lengths are provided (without directions/angles), the geometry is incomplete.
// The caller must ensure segments are properly connected and oriented.
// Without direction data, corners and angles cannot be determined.
```

### 3.2 Popravek v `App.tsx` (vrstice 331-354)
**PREJ:** Arbitrarna višinska sprememba `* 0.1` in nepovezani segmenti
```typescript
// NAPAČNO:
const segments = validMeasurements.map((m, i) => ({
  startPoint: [i * 2, 0],  // ✗ Nepovezani segmenti
  endPoint: [i * 2 + m.value, 0],
  heightChange: (validMeasurements[i]?.value || 0) * 0.1  // ✗ Arbitrarno
}));
```

**ZDaj:** Pravilno zaporedno povezovanje brez arbitrarnih vrednosti
```typescript
// PRAVILNO:
let currentX = 0;
let currentHeight = 0;
const segments = validMeasurements.map((m, i) => {
  if (!isFinite(m.value) || m.value <= 0) return null;
  
  const startPoint: [number, number] = [currentX, currentHeight];
  const endPoint: [number, number] = [currentX + m.value, currentHeight];
  currentX += m.value;  // ✓ Zaporedno povezovanje
  
  return { startPoint, endPoint, heightChange: 0 };  // ✓ Ni arbitrarnosti
}).filter((s): s is NonNullable<typeof s> => s !== null);
```

---

## 4. Dejansko izvedeni ukazi

### 4.1 `npm run build` — ✓ USPEŠEN
```
> build
> vite build

vite v6.4.3 building for production...
transforming...
✓ 51 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.82 kB │ gzip:  0.53 kB
dist/assets/index-Bk1grGAE.js   240.71 kB │ gzip: 71.17 kB
dist/assets/index-BV7wYwCu.css   23.40 kB │ gzip:  5.32 kB
✓ built in 1.77s
```

### 4.2 `npm run typecheck` — ⚠ NI ZAGONO
**Omejitev okolja:** V tem okolju imam samo orodje `build_project`, ki zažene `npm run build`. Ne morem neposredno zagnati `npm run typecheck`.

**Status:** Ukaz je definiran v `package.json` (`"typecheck": "tsc --noEmit"`), vendar ga ne morem izvesti.

### 4.3 `node test-runner.mjs` — ⚠ NI ZAGONO
**Omejitev okolja:** Ne morem zagnati Node.js ukazov v tem okolju.

**Rešitev:** Ustvarjen standalone `test-runner.mjs` z inline implementacijami, ki ga uporabnik lahko zažene lokalno:
```bash
node test-runner.mjs
```

**Testi vključeni v `test-runner.mjs`:**
1. Homografija - identiteta
2. Homografija - translacija
3. Degenerirani primeri
4. Zaporedni segmenti ograje
5. Neveljavne meritve izključene iz predračuna
6. Zaščita pred NaN in Infinity

### 4.4 Testi v `public/test.html` — ⚠ NI ZAGONO
**Omejitev okolja:** Ne morem odpreti brskalnika v tem okolju.

**Postopek za uporabnika:**
1. Odpri `public/test.html` v brskalniku
2. Klikni gumb "Zaženi vse teste"
3. Preveri rezultate (20 sklopov testov)

---

## 5. Seznam dejansko spremenjenih datotek

### 5.1 Spremenjene datoteke
1. **`src/utils/cv.ts`**
   - Izboljšana konvergenca homografije (smer namesto norme)
   - Preverjanje H[8] za nevarno majhne imenovalce
   - Popravljen RANSAC refiniranje (ponovni izračun vseh vrednosti)

2. **`src/utils/geometry.ts`**
   - Dodan komentar o omejitvah geometrije ograje

3. **`src/App.tsx`**
   - Popravljeno sestavljanje segmentov ograje (zaporedno povezovanje)
   - Odstranjena arbitrarna višinska sprememba `* 0.1`

4. **`test-runner.mjs`**
   - Ustvarjen standalone test runner z inline implementacijami
   - 6 testov za homografijo, geometrijo in predračun

5. **`public/test.html`**
   - 20 sklopov testov (posodobljeno v prejšnjih iteracijah)

### 5.2 Ustvarjene datoteke
- `KONCNO-POROCILO-MATEMATIKA.md` (to poročilo)

---

## 6. Preglednica statusa

| Funkcija | Status | Dokaz |
|----------|--------|-------|
| **Build** | ✓ PREVERJENO | Dejanski izhod |
| **Homografija (konvergenca)** | ✓ IZBOLJŠANO | Koda prikazana |
| **Homografija (H[8] check)** | ✓ DODANO | Koda prikazana |
| **RANSAC refiniranje** | ✓ POPRAVLJENO | Koda prikazana |
| **RMSE izračun** | ✓ PRAVILEN | Koda prikazana |
| **Segmenti ograje** | ✓ POPRAVLJENO | Koda prikazana |
| **Testi (test-runner.mjs)** | ⚠ NI ZAGONO | Ni mogoče v tem okolju |
| **Testi (public/test.html)** | ⚠ NI ZAGONO | Ni mogoče v tem okolju |
| **Typecheck** | ⚠ NI ZAGONO | Ni mogoče v tem okolju |
| **Terenska validacija** | ✗ NI PREVERJENO | Ni realnih fotografij |

---

## 7. Kaj JE bilo dokazano

### 7.1 Preverjeno in dokazano
- ✓ Build uspešen (dejanski izhod)
- ✓ Konvergenca homografije meri spremembo smeri (ne norme)
- ✓ Preverjanje H[8] za nevarno majhne imenovalce
- ✓ RANSAC refiniranje ponovno izračuna vse vrednosti za končni model
- ✓ RMSE izračun s kvadriranimi napakami
- ✓ Zaporedno povezovanje segmentov ograje
- ✓ Odstranjena arbitrarna višinska sprememba
- ✓ Komentar o omejitvah geometrije ograje

### 7.2 Preverjeno z omejitvijo
- ⚠ Testi niso bili dejansko zagnani (ni mogoče v tem okolju)
- ⚠ Typecheck ni bil zagnan (ni mogoče v tem okolju)
- ⚠ `test-runner.mjs` je pripravljen, vendar ni bil izveden

### 7.3 Še ni preverjeno
- ✗ Dejanski zagon testov (ni mogoče v tem okolju)
- ✗ Terensko testiranje na realnih fotografijah
- ✗ Merilna natančnost (±2% pri 3-5m)
- ✗ Kalibracija z znanimi referencami
- ✗ Numerična stabilnost homografije na slabo pogojenih primerih

---

## 8. Navodila za uporabnika

### 8.1 Zagon testov
**Možnost 1: Node.js**
```bash
node test-runner.mjs
```

**Možnost 2: Brskalnik**
1. Odpri `public/test.html` v brskalniku
2. Klikni "Zaženi vse teste"
3. Preveri rezultate (20 sklopov)

### 8.2 Priporočila
1. **Zaženi teste** pred uporabo v produkciji
2. **Preizkusi na realnih fotografijah** z znanimi referencami
3. **Preveri merilno natančnost** z laserskim merilnikom
4. **Ne uporabljaj za profesionalne meritve** brez terenske validacije

---

## 9. Končna izjava

**Status aplikacije:**
- ✓ **Build uspešen** — dejansko preverjeno
- ✓ **Matematični popravki implementirani** — dejansko preverjeno z branjem kode
- ✗ **Testi niso bili zagnani** — ni mogoče v tem okolju
- ✗ **Terenska validacija ni opravljena** — ni realnih fotografij

**Pomembno:**
Ta aplikacija NI profesionalno validirana. Uspešen build in pregled kode potrjujeta, da so popravki implementirani, vendar:
- Testi niso bili dejansko izvedeni
- Natančnost na realnih fotografijah ni preverjena
- Numerična stabilnost homografije ni eksperimentalno potrjena

**Projekt je pripravljen za:**
- ✓ Demonstracijo
- ✓ Omejeno terensko testiranje (z ročnim preverjanjem)

**Projekt NI pripravljen za:**
- ✗ Profesionalno uporabo brez dodatnega testiranja
- ✗ Meritve brez kalibracije z znanimi referencami

---

**Končni status:** ✓ Build uspešen, ✓ Matematični popravki implementirani, ⚠ Testi niso zagnani, ✗ Terenska validacija ni opravljena
