# Mera3D Pro — Končno poročilo o popravku solverja

**Datum:** 2026  
**Status:** Kritična napaka odpravljena, build uspešen, testi pripravljeni (ne izvedeni)

---

## 1. Odpravljena kritična napaka

### 1.1 Problem

Funkcija `oneSidedJacobiSVD()` je imela pogoj:
```typescript
if (m < n) return null;
```

Za homografijo s 4 točkami:
- m = 8 vrstic (8 enačb)
- n = 9 stolpcev (9 neznank)
- Pogoj `m < n` je bil izpolnjen → funkcija je vrnila null
- **`estimateHomography()` ni delovala za minimalni primer 4 točk**

### 1.2 Rešitev: Hibridni pristop

Implementiran je hibridni solver, ki uporablja različne metode glede na obliko matrike:

```typescript
function solveHomogeneousSystem(A: number[][]): number[] | null {
  const m = A.length;
  const n = A[0].length;
  
  let v: number[];
  
  if (m >= n) {
    // Tall or square matrix: one-sided Jacobi SVD on A
    const result = oneSidedJacobiSVD(A, 100, 1e-10);
    // ... uporabi desni singularni vektor za najmanjšo singularno vrednost
  } else {
    // Wide matrix (underdetermined, e.g., 8x9 for 4 points)
    // Use Jacobi eigensolver on A^T * A (n x n symmetric matrix)
    const ATA = /* izračunaj A^T * A */;
    const result = jacobiEigenSolver(ATA, 100, 1e-10);
    // ... uporabi lastni vektor za najmanjšo lastno vrednost
  }
  
  // Preveri residual ||A * v||
  const residual = computeResidual(A, v);
  if (residual > 1e-6) return null;
  
  return v;
}
```

### 1.3 Matematična utemeljitev

**Za m >= n (tall/square matrix):**
- Enostranski Jacobi SVD na A
- Ne kvadrira pogojenosti
- Direktno išče singularne vrednosti

**Za m < n (wide matrix, underdetermined):**
- Jacobi eigensolver na A^T*A (n×n simetrična matrika)
- Ničelni prostor A = lastni prostor A^T*A z lastno vrednostjo 0
- Kvadrira pogojenost, vendar je to edina možnost za široke matrike brez SVD knjižnic

**Zakaj je to pravilno:**
- Za homografijo s 4 točkami: A je 8×9, A^T*A je 9×9
- Najmanjši lastni vektor A^T*A ustreza najmanjši singularni vrednosti A
- Obe metodi iščeta isto rešitev (ničelni prostor A)

---

## 2. Celotna implementacija solverja

### 2.1 `solveHomogeneousSystem()` (vrstice 392-470)

```typescript
function solveHomogeneousSystem(A: number[][]): number[] | null {
  const m = A.length;
  const n = A[0].length;
  
  if (m < 4) return null;
  if (n !== 9) return null;
  
  // Preveri neveljavne vrednosti
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (!isFinite(A[i][j])) return null;
    }
  }
  
  let v: number[];
  
  if (m >= n) {
    // Tall/square: one-sided Jacobi SVD
    const result = oneSidedJacobiSVD(A, 100, 1e-10);
    if (!result) return null;
    
    const { singularValues, V } = result;
    let minIdx = 0;
    let minVal = Math.abs(singularValues[0]);
    for (let i = 1; i < singularValues.length; i++) {
      if (Math.abs(singularValues[i]) < minVal) {
        minVal = Math.abs(singularValues[i]);
        minIdx = i;
      }
    }
    
    v = [];
    for (let i = 0; i < n; i++) {
      v.push(V[i][minIdx]);
    }
  } else {
    // Wide (underdetermined): Jacobi eigensolver on A^T*A
    const ATA: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        let sum = 0;
        for (let k = 0; k < m; k++) {
          sum += A[k][i] * A[k][j];
        }
        ATA[i][j] = sum;
        ATA[j][i] = sum;
      }
    }
    
    const result = jacobiEigenSolver(ATA, 100, 1e-10);
    if (!result) return null;
    
    const { eigenvalues, eigenvectors } = result;
    let minIdx = 0;
    let minVal = Math.abs(eigenvalues[0]);
    for (let i = 1; i < eigenvalues.length; i++) {
      if (Math.abs(eigenvalues[i]) < minVal) {
        minVal = Math.abs(eigenvalues[i]);
        minIdx = i;
      }
    }
    
    v = [];
    for (let i = 0; i < n; i++) {
      v.push(eigenvectors[i][minIdx]);
    }
  }
  
  if (v.some(x => !isFinite(x))) return null;
  
  const residual = computeResidual(A, v);
  if (residual > 1e-6) return null;
  
  return v;
}
```

### 2.2 `jacobiEigenSolver()` (vrstice 534-600)

```typescript
function jacobiEigenSolver(
  A: number[][], 
  maxIterations: number = 100, 
  tolerance: number = 1e-10
): { eigenvalues: number[]; eigenvectors: number[][] } | null {
  const n = A.length;
  const S = A.map(row => [...row]);
  const V = /* identity matrix */;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Poišči največji izven-diagonalni element
    // Izračunaj rotacijo
    // Posodobi S in V
  }
  
  const eigenvalues = /* diagonal of S */;
  return { eigenvalues, eigenvectors: V };
}
```

### 2.3 `oneSidedJacobiSVD()` (vrstice 472-532)

```typescript
function oneSidedJacobiSVD(
  A: number[][],
  maxIterations: number = 100,
  tolerance: number = 1e-10
): { singularValues: number[]; V: number[][] } | null {
  const m = A.length;
  const n = A[0].length;
  
  if (m < n) return null;  // Samo za tall/square matrike
  
  const B = A.map(row => [...row]);
  const V = /* identity matrix */;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Preveri konvergenco
    // Rotiraj stolpce B
    // Posodobi V
  }
  
  const singularValues = /* norms of columns of B */;
  return { singularValues, V };
}
```

---

## 3. Dejansko izvedeni ukazi

### 3.1 `npm run build` — ✓ USPEŠEN

```
> build
> vite build

vite v6.4.3 building for production...
transforming...
✓ 51 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.82 kB │ gzip:  0.53 kB
dist/assets/index-GTALFzKB.js   241.78 kB │ gzip: 71.59 kB
dist/assets/index-BfY9M3Vr.css   23.87 kB │ gzip:  5.39 kB
✓ built in 2.52s
```

### 3.2 `npm run typecheck` — ⚠ NI ZAGONO

**Omejitev okolja:** Orodje `run_command` ni na voljo. Imam samo `build_project`, ki zažene `npm run build`.

**Status:** Ni izvedeno.

**Priporočilo za uporabnika:**
```bash
npm run typecheck
```

### 3.3 Testi v `public/homography-tests.html` — ⚠ NI ZAGONO

**Omejitev okolja:** Ne morem odpreti brskalnika ali zagnati Node.js ukazov.

**Status:** Ni izvedeno.

**Postopek za uporabnika:**
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

---

## 4. Testna stran

### 4.1 Uvoz funkcij

```javascript
import { estimateHomography, ransacHomography } from './src/utils/cv.ts';
```

**ZAKLJUČEK:** ✓ Testna stran uvaža **dejanske funkcije** iz `src/utils/cv.ts`, ne kopij.

### 4.2 Testi vključeni (9 sklopov)

1. **Identična transformacija** — 4 točke, H ≈ I
2. **Translacija** — 4 točke, H[2]=tx, H[5]=ty
3. **Sprememba merila** — 4 točke, H[0]=sx, H[4]=sy
4. **Rotacija (45°)** — 4 točke, rotacijska matrika
5. **Natanko 4 točke** — minimalni primer
6. **Več točk z majhnim šumom** — 7 točk
7. **Degenerirani primeri** — kolinearne točke, premalo točk
8. **Neveljavne vrednosti** — NaN, Infinity
9. **RANSAC z outliers** — 6 točk, 1 outlier

---

## 5. Preglednica statusa

| Kategorija | Status | Dokaz |
|------------|--------|-------|
| Build | ✓ USPEŠEN | Dejanski izhod |
| Kritična napaka odpravljena | ✓ DA | Koda prikazana |
| Hibridni solver (m>=n in m<n) | ✓ IMPLEMENTIRANO | Koda prikazana |
| Jacobi eigensolver | ✓ IMPLEMENTIRANO | Koda prikazana |
| Enostranski Jacobi SVD | ✓ IMPLEMENTIRANO | Koda prikazana |
| Testi (9 sklopov) | ⚠ NI ZAGONO | Ni mogoče v tem okolju |
| Typecheck | ⚠ NI ZAGONO | Ni mogoče v tem okolju |
| Terenska validacija | ✗ NI PREVERJENO | Ni realnih fotografij |

---

## 6. Kaj JE bilo dokazano

### 6.1 Preverjeno in dokazano
- ✓ Build uspešen (dejanski izhod)
- ✓ Kritična napaka odpravljena (solver zdaj sprejema 8×9 sistem)
- ✓ Hibridni pristop implementiran (SVD za tall, eigensolver za wide matrike)
- ✓ Testna stran uvaža dejanske funkcije
- ✓ 9 sklopov testov pripravljenih

### 6.2 Preverjeno z omejitvijo
- ⚠ Testi niso bili dejansko zagnani (ni mogoče v tem okolju)
- ⚠ Typecheck ni bil zagnan (ni mogoče v tem okolju)
- ⚠ Numerična stabilnost ni eksperimentalno potrjena

### 6.3 Še ni preverjeno
- ✗ Dejanski zagon testov (uporabnik mora zagnati)
- ✗ Terensko testiranje na realnih fotografijah
- ✗ Merilna natančnost (±2% pri 3-5m)
- ✗ Kalibracija z znanimi referencami

---

## 7. Navodila za uporabnika

### 7.1 Typecheck
```bash
npm run typecheck
```

### 7.2 Zagon testov
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

### 7.3 Priporočila
1. **Zaženi typecheck** za preverjanje tipov
2. **Zaženi teste** pred uporabo v produkciji
3. **Preizkusi na realnih fotografijah** z znanimi referencami
4. **Preveri merilno natančnost** z laserskim merilnikom
5. **Ne uporabljaj za profesionalne meritve** brez terenske validacije

---

## 8. Končna izjava

**Status aplikacije:**
- ✓ **Build uspešen** — dejansko preverjeno
- ✓ **Kritična napaka odpravljena** — dejansko preverjeno z branjem kode
- ✓ **Hibridni solver implementiran** — dejansko preverjeno z branjem kode
- ✗ **Testi niso bili zagnani** — ni mogoče v tem okolju
- ✗ **Terenska validacija ni opravljena** — ni realnih fotografij

**Pomembno:**
Ta aplikacija NI profesionalno validirana. Uspešen build in pregled kode potrjujeta, da je napaka odpravljena, vendar:
- Testi niso bili dejansko izvedeni
- Natančnost na realnih fotografijah ni preverjena
- Numerična stabilnost ni eksperimentalno potrjena

**Projekt je pripravljen za:**
- ✓ Demonstracijo (po zagonu testov)
- ✓ Omejeno terensko testiranje (z ročnim preverjanjem)

**Projekt NI pripravljen za:**
- ✗ Profesionalno uporabo brez dodatnega testiranja
- ✗ Meritve brez kalibracije z znanimi referencami

---

**Končni status:** ✓ Build uspešen, ✓ Kritična napaka odpravljena, ⚠ Testi niso zagnani, ✗ Terenska validacija ni opravljena
