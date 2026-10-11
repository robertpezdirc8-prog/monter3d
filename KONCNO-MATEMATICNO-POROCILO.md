# Mera3D Pro — Končno matematično poročilo

**Datum:** 2026  
**Status:** Solver implementiran, build uspešen, testi pripravljeni

---

## 1. Solver homografije (`src/utils/cv.ts`)

### 1.1 Implementirana metoda: Enostranski Jacobi SVD

**Koda (vrstice 392-458):**
```typescript
// Solve homogeneous system Ah = 0 using one-sided Jacobi SVD on original matrix A
// This avoids squaring the condition number (which happens with A^T*A methods)
function solveHomogeneousSystem(A: number[][]): number[] | null {
  // ... validacija ...
  
  // One-sided Jacobi SVD on A
  // Computes A = U * Σ * V^T, returns V (right singular vectors)
  const result = oneSidedJacobiSVD(A, 100, 1e-10);
  
  // Find smallest singular value
  let minIdx = 0;
  let minVal = Math.abs(singularValues[0]);
  for (let i = 1; i < singularValues.length; i++) {
    if (Math.abs(singularValues[i]) < minVal) {
      minVal = Math.abs(singularValues[i]);
      minIdx = i;
    }
  }
  
  // Extract right singular vector
  const v = V.map(row => row[minIdx]);
  
  // Check residual ||A * v||
  const residual = computeResidual(A, v);
  if (residual > 1e-6) return null;
  
  return v;
}
```

### 1.2 Enostranski Jacobi SVD (vrstice 460-540)

```typescript
function oneSidedJacobiSVD(
  A: number[][],
  maxIterations: number = 100,
  tolerance: number = 1e-10
): { singularValues: number[]; V: number[][] } | null {
  const m = A.length;
  const n = A[0].length;
  
  const B = A.map(row => [...row]);
  const V = /* identity matrix */;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Check convergence: off-diagonal norm of B^T * B
    let offDiagNorm = 0;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        let dot = 0;
        for (let i = 0; i < m; i++) {
          dot += B[i][p] * B[i][q];
        }
        offDiagNorm += dot * dot;
      }
    }
    
    if (Math.sqrt(offDiagNorm) < tolerance) break;
    
    // Apply Jacobi rotations
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        // Compute alpha, beta, gamma
        let alpha = 0, beta = 0, gamma = 0;
        for (let i = 0; i < m; i++) {
          alpha += B[i][p] * B[i][p];
          beta += B[i][q] * B[i][q];
          gamma += B[i][p] * B[i][q];
        }
        
        if (Math.abs(gamma) < 1e-15) continue;
        
        // Compute rotation
        const zeta = (beta - alpha) / (2 * gamma);
        const t = Math.sign(zeta) / (Math.abs(zeta) + Math.sqrt(zeta * zeta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        
        // Rotate columns
        for (let i = 0; i < m; i++) {
          const Bip = B[i][p];
          const Biq = B[i][q];
          B[i][p] = c * Bip - s * Biq;
          B[i][q] = s * Bip + c * Biq;
        }
        
        // Update V
        for (let i = 0; i < n; i++) {
          const Vip = V[i][p];
          const Viq = V[i][q];
          V[i][p] = c * Vip - s * Viq;
          V[i][q] = s * Vip + c * Viq;
        }
      }
    }
  }
  
  // Singular values = norms of columns of B
  const singularValues = B[0].map((_, j) => {
    let norm = 0;
    for (let i = 0; i < m; i++) norm += B[i][j] * B[i][j];
    return Math.sqrt(norm);
  });
  
  return { singularValues, V };
}
```

### 1.3 Prednosti pred A^T*A metodami

1. **Ne kvadrira pogojenosti:** Dela na originalni matriki A, ne na A^T*A
2. **Numerično stabilnejši:** Manjša napaka pri slabo pogojenih sistemih
3. **Direktni SVD:** Išče singularne vrednosti, ne lastnih vrednosti A^T*A
4. **Garantirana konvergenca:** Za polne rang matrike

### 1.4 Preverjanja v kodi

- ✓ Minimalni primer 8×9 (4 točke)
- ✓ Validacija neveljavnih vrednosti (NaN, Infinity)
- ✓ Preverjanje residuala ||A * v|| < 1e-6
- ✓ Konvergenca meri off-diagonal norm
- ✓ Najmanjši singularni vektor

### 1.5 Omejitve

- ⚠ Še vedno iterativna metoda (ne direktni SVD z zunanjimi knjižnicami)
- ⚠ Za n=9 (homografija) je O(n³) na iteracijo sprejemljivo
- ⚠ Ni eksperimentalno potrjena na slabo pogojenih primerih

---

## 2. RANSAC refiniranje (`src/utils/cv.ts`)

### 2.1 Preverjanje konsistentnosti

Po refiniranju modela se ponovno izračunajo:
- ✓ Maska inlierjev (`finalInliers`)
- ✓ Število inlierjev (`finalCount`)
- ✓ RMSE (`finalRMSE`)

Vse vrednosti opisujejo **isti končni model**.

---

## 3. Testi (`public/homography-tests.html`)

### 3.1 Stran uvaža dejanske module

```javascript
import { estimateHomography, ransacHomography } from './src/utils/cv.ts';
```

To so **dejanske funkcije** iz produkcijske kode, ne kopije.

### 3.2 Testi vključeni (9 sklopov)

1. Identična transformacija
2. Translacija
3. Sprememba merila
4. Rotacija (45°)
5. Natanko 4 točke
6. Več točk z majhnim šumom
7. Degenerirani primeri
8. Neveljavne vrednosti
9. RANSAC z outliers

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
dist/assets/index-9mXcg7hO.js   240.61 kB │ gzip: 71.15 kB
dist/assets/index-BfY9M3Vr.css   23.87 kB │ gzip:  5.39 kB
✓ built in 2.52s
```

### 4.2 `npm run typecheck` — ⚠ NI ZAGONO

**Omejitev okolja:** V tem okolju imam samo orodje `build_project`, ki zažene `npm run build`. Ne morem neposredno zagnati `npm run typecheck`.

**Ukaz je definiran v `package.json`:**
```json
"typecheck": "tsc --noEmit"
```

**Status:** Ni izvedeno v tem okolju.

**Priporočilo za uporabnika:**
```bash
npm run typecheck
```

### 4.3 `node test-runner.mjs` — ⚠ NI ZAGONO

**Omejitev okolja:** Ne morem zagnati Node.js ukazov v tem okolju.

**Status:** Ni izvedeno v tem okolju.

### 4.4 Testi v `public/homography-tests.html` — ⚠ NI ZAGONO

**Omejitev okolja:** Ne morem odpreti brskalnika v tem okolju.

**Status:** Ni izvedeno v tem okolju.

**Priporočilo za uporabnika:**
```bash
# 1. Zaženi razvojni strežnik
npm run dev

# 2. Odpri v brskalniku
http://localhost:5173/homography-tests.html

# 3. Klikni "Zaženi vse teste"
```

---

## 5. Preglednica statusa

| Funkcija | Status | Dokaz |
|----------|--------|-------|
| **Build** | ✓ PREVERJENO | Dejanski izhod |
| **Enostranski Jacobi SVD** | ✓ IMPLEMENTIRANO | Koda prikazana |
| **RANSAC refiniranje** | ✓ IMPLEMENTIRANO | Koda prikazana |
| **Testi (9 sklopov)** | ⚠ NI ZAGONO | Ni mogoče v tem okolju |
| **Typecheck** | ⚠ NI ZAGONO | Ni mogoče v tem okolju |
| **Terenska validacija** | ✗ NI PREVERJENO | Ni realnih fotografij |

---

## 6. Kaj JE bilo dokazano

### 6.1 Preverjeno in dokazano
- ✓ Build uspešen (dejanski izhod)
- ✓ Enostranski Jacobi SVD implementiran (ne kvadrira pogojenosti)
- ✓ RANSAC refiniranje ponovno izračuna vse vrednosti
- ✓ Testna stran uvaža dejanske module iz `src/utils/cv.ts`
- ✓ 9 sklopov testov pripravljenih z vnaprej znanimi rezultati

### 6.2 Preverjeno z omejitvijo
- ⚠ Testi niso bili dejansko zagnani (ni mogoče v tem okolju)
- ⚠ Typecheck ni bil zagnan (ni mogoče v tem okolju)
- ⚠ Numerična stabilnost ni eksperimentalno potrjena

### 6.3 Še ni preverjeno
- ✗ Dejanski zagon testov (uporabnik mora zagnati)
- ✗ Terensko testiranje na realnih fotografijah
- ✗ Merilna natančnost (±2% pri 3-5m)
- ✗ Kalibracija z znanimi referencami
- ✗ Primerjava z direktnim SVD (npr. LAPACK)

---

## 7. Navodila za uporabnika

### 7.1 Zagon testov
```bash
# 1. Zaženi razvojni strežnik
npm run dev

# 2. Odpri v brskalniku
http://localhost:5173/homography-tests.html

# 3. Klikni "Zaženi vse teste"

# 4. Preveri rezultate
# - Zeleni okvirji = uspešni testi
# - Rdeči okvirji = neuspešni testi
# - Povzetek na dnu strani
```

### 7.2 Typecheck
```bash
npm run typecheck
```

### 7.3 Priporočila
1. **Zaženi teste** pred uporabo v produkciji
2. **Preizkusi na realnih fotografijah** z znanimi referencami
3. **Preveri merilno natančnost** z laserskim merilnikom
4. **Ne uporabljaj za profesionalne meritve** brez terenske validacije

---

## 8. Končna izjava

**Status aplikacije:**
- ✓ **Build uspešen** — dejansko preverjeno
- ✓ **Enostranski Jacobi SVD implementiran** — dejansko preverjeno z branjem kode
- ✗ **Testi niso bili zagnani** — ni mogoče v tem okolju
- ✗ **Terenska validacija ni opravljena** — ni realnih fotografij

**Pomembno:**
Ta aplikacija NI profesionalno validirana. Uspešen build in pregled kode potrjujeta, da je solver implementiran, vendar:
- Testi niso bili dejansko izvedeni
- Natančnost na realnih fotografijah ni preverjena
- Numerična stabilnost ni eksperimentalno potrjena

**Projekt je pripravljen za:**
- ✓ Demonstracijo
- ✓ Omejeno terensko testiranje (z ročnim preverjanjem)

**Projekt NI pripravljen za:**
- ✗ Profesionalno uporabo brez dodatnega testiranja
- ✗ Meritve brez kalibracije z znanimi referencami

---

**Končni status:** ✓ Build uspešen, ✓ Enostranski Jacobi SVD implementiran, ⚠ Testi niso zagnani, ✗ Terenska validacija ni opravljena
