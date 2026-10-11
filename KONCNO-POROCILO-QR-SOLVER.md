# Mera3D Pro — Končno poročilo o solverju

**Datum:** 2026  
**Status:** QR-based null space solver implementiran, build uspešen, testi pripravljeni (ne izvedeni)

---

## 1. Implementiran solver za minimalni sistem 8×9

### 1.1 Hibridni pristop

Funkcija `solveHomogeneousSystem()` (vrstice 392-450) uporablja:

**Za m >= n (tall/square matrike):**
- Enostranski Jacobi SVD na originalni matriki A
- Ne kvadrira pogojenosti
- Direktno išče singularne vrednosti

**Za m < n (široke matrike, npr. 8×9 za 4 točke):**
- **QR dekompozicija z Householderjevimi reflektzijami**
- Izračuna ničelni prostor stabilno, brez kvadriranja pogojenosti
- Algoritem:
  1. Transponira A v A^T (n×m)
  2. Izvede QR dekompozicijo A^T = Q*R
  3. Zadnji stolpec Q (indeks n-1) je vektor ničelnega prostora
  4. Preveri residual ||A * nullVector|| < 1e-6

### 1.2 Implementacija `computeNullSpaceQR()` (vrstice 534-610)

```typescript
function computeNullSpaceQR(A: number[][]): number[] | null {
  const m = A.length;
  const n = A[0].length;
  
  if (m >= n) return null; // Samo za široke matrike
  
  // Transponira A v A^T (n×m)
  const AT = /* transponirana matrika */;
  
  // QR dekompozicija z Householderjevimi reflektzijami
  const Q = /* ortogonalna matrika */;
  const R = /* zgornje trikotna matrika */;
  
  for (let k = 0; k < m; k++) {
    // Householderjev vektor za stolpec k
    // Reflektiraj R in Q
  }
  
  // Zadnji stolpec Q je v ničelnem prostoru A
  const nullVector = Q.map(row => row[n - 1]);
  
  // Preveri residual
  const residual = computeResidual(A, nullVector);
  if (residual > 1e-6) return null;
  
  return nullVector;
}
```

### 1.3 Prednosti pred A^T*A

| Metoda | Kvadrira pogojenost? | Stabilnost |
|--------|---------------------|------------|
| A^T*A + eigensolver | ✓ DA | Nizka |
| Enostranski Jacobi SVD | ✗ NE | Visoka (samo za m >= n) |
| **QR null space** | **✗ NE** | **Visoka (za vse primere)** |

---

## 2. Pripravljeni matematični testi

### 2.1 Testna datoteka: `test-homography.js`

Ustvarjena datoteka vsebuje 8 sklopov testov:

1. **Identična transformacija** (4 točke)
   - Pričakovano: H ≈ I, RMSE ≈ 0
   
2. **Translacija** (4 točke)
   - tx=10, ty=20
   - Pričakovano: H[2]=10, H[5]=20, RMSE < 0.1
   
3. **Sprememba merila** (4 točke)
   - sx=2, sy=3
   - Pričakovano: H[0]=2, H[4]=3, RMSE < 0.1
   
4. **Perspektivna transformacija** (4 točke)
   - Splošna homografija
   - Pričakovano: RMSE < 0.5
   
5. **Več točk z majhnim šumom** (7 točk)
   - Šum ±0.5 pikslov
   - Pričakovano: RMSE < 2
   
6. **Degenerirane/kolinearne točke**
   - Pričakovano: vrne null
   
7. **Neveljavne koordinate**
   - NaN, Infinity
   - Pričakovano: vrne null
   
8. **RANSAC z znanimi napačnimi ujemanji**
   - 6 točk, 1 outlier
   - Pričakovano: pravilno identificira outlier, konsistentni RMSE

### 2.2 Testna stran: `public/homography-tests.html`

Obstaja tudi spletna testna stran, ki uvaža dejanske funkcije iz `src/utils/cv.ts`:

```javascript
import { estimateHomography, ransacHomography } from './src/utils/cv.ts';
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
dist/assets/index-B27yWADA.js   241.51 kB │ gzip: 71.41 kB
dist/assets/index-BfY9M3Vr.css   23.87 kB │ gzip:  5.39 kB
✓ built in 2.63s
```

### 3.2 `npm run typecheck` — ⚠ NI ZAGONO

**Omejitev okolja:** Orodje `run_command` ni na voljo. Imam samo `build_project`, ki zažene `npm run build`.

**Status:** Ni izvedeno.

**Priporočilo za uporabnika:**
```bash
npm run typecheck
```

### 3.3 `node test-homography.js` — ⚠ NI ZAGONO

**Omejitev okolja:** Ne morem zagnati Node.js ukazov v tem okolju.

**Status:** Ni izvedeno.

**Postopek za uporabnika:**
```bash
node test-homography.js
```

### 3.4 Testi v `public/homography-tests.html` — ⚠ NI ZAGONO

**Omejitev okolja:** Ne morem odpreti brskalnika.

**Status:** Ni izvedeno.

**Postopek za uporabnika:**
```bash
# 1. Zaženi razvojni strežnik
npm run dev

# 2. Odpri v brskalniku
http://localhost:5173/homography-tests.html

# 3. Klikni "Zaženi vse teste"
```

---

## 4. Preglednica statusa

| Kategorija | Status | Dokaz |
|------------|--------|-------|
| Build | ✓ USPEŠEN | Dejanski izhod |
| QR null space solver | ✓ IMPLEMENTIRANO | Koda prikazana |
| Ne kvadrira pogojenosti | ✓ DA | QR dekompozicija |
| Testi (8 sklopov) | ⚠ NI ZAGONO | Ni mogoče v tem okolju |
| Typecheck | ⚠ NI ZAGONO | Ni mogoče v tem okolju |
| Terenska validacija | ✗ NI PREVERJENO | Ni realnih fotografij |

---

## 5. Kaj JE bilo dokazano

### 5.1 Preverjeno in dokazano
- ✓ Build uspešen (dejanski izhod)
- ✓ QR-based null space solver implementiran (ne kvadrira pogojenosti)
- ✓ Hibridni pristop: SVD za tall, QR za wide matrike
- ✓ Testna datoteka `test-homography.js` pripravljena
- ✓ Testna stran `public/homography-tests.html` uvaža dejanske funkcije

### 5.2 Preverjeno z omejitvijo
- ⚠ Testi niso bili dejansko zagnani (ni mogoče v tem okolju)
- ⚠ Typecheck ni bil zagnan (ni mogoče v tem okolju)
- ⚠ Numerična stabilnost ni eksperimentalno potrjena

### 5.3 Še ni preverjeno
- ✗ Dejanski zagon testov (uporabnik mora zagnati)
- ✗ Terensko testiranje na realnih fotografijah
- ✗ Merilna natančnost (±2% pri 3-5m)
- ✗ Kalibracija z znanimi referencami

---

## 6. Navodila za uporabnika

### 6.1 Typecheck
```bash
npm run typecheck
```

### 6.2 Node.js testi
```bash
node test-homography.js
```

### 6.3 Spletni testi
```bash
# 1. Zaženi razvojni strežnik
npm run dev

# 2. Odpri v brskalniku
http://localhost:5173/homography-tests.html

# 3. Klikni "Zaženi vse teste"
```

### 6.4 Priporočila
1. **Zaženi typecheck** za preverjanje tipov
2. **Zaženi teste** (`node test-homography.js`) pred uporabo v produkciji
3. **Preizkusi na realnih fotografijah** z znanimi referencami
4. **Preveri merilno natančnost** z laserskim merilnikom
5. **Ne uporabljaj za profesionalne meritve** brez terenske validacije

---

## 7. Končna izjava

**Status aplikacije:**
- ✓ **Build uspešen** — dejansko preverjeno
- ✓ **QR null space solver implementiran** — dejansko preverjeno z branjem kode
- ✓ **Ne kvadrira pogojenosti** — QR dekompozicija
- ✗ **Testi niso bili zagnani** — ni mogoče v tem okolju
- ✗ **Terenska validacija ni opravljena** — ni realnih fotografij

**Pomembno:**
Ta aplikacija NI profesionalno validirana. Uspešen build in pregled kode potrjujeta, da je solver implementiran, vendar:
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

## 8. Spremenjene datoteke

| Datoteka | Sprememba |
|----------|-----------|
| `src/utils/cv.ts` | QR-based null space solver (vrstice 534-610) |
| `test-homography.js` | NOVO - Node.js testna datoteka |
| `public/homography-tests.html` | Obstaja od prej |

---

**Končni status:** ✓ Build uspešen, ✓ QR solver implementiran, ⚠ Testi niso zagnani, ✗ Terenska validacija ni opravljena
