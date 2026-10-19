# FAZA 6F: DEJANSKI TESTI, POPRAVEK IZRAČUNOV IN PRIPRAVA ORIGINALNEGA VIZUALNEGA KONFIGURATORJA

**Datum:** 2026  
**Projekt:** Mera3D Pro  
**Status:** ⚠️ **DELNO ZAKLJUČENO**

---

## POVZETEK

Faza 6F je delno implementirana:
1. ✅ Dodan testni okvir (Vitest)
2. ✅ Popravljen izračun materiala z načrtom razreza
3. ✅ Dodana izbira vidne širine za POLNO 57/32
4. ✅ Preverjanje združljivosti orientacije
5. ⚠️ Testi ustvarjeni, ampak **NI SO BILO MOGOČE IZVESTI** v tem okolju
6. ⚠️ Vizualni konfigurator izboljšan, ampak še vedno brez dejanskih slik

---

## 1. ⚠️ Testi - USTVARJENI, AMPAK NE IZVEDENI

### Kaj je bilo narejeno:

✅ **Nameščen testni okvir:** Vitest (17 paketov dodanih)

✅ **Ustvarjena konfiguracija:** `vitest.config.ts`

✅ **Prepisani testi:** `src/tests/fenceConstructionTests.ts` v pravilni Vitest obliki
- 10 testov za izračune in validacijo
- Testi za pokončne in prečne ograje
- Testi za tehnične zahteve
- Testi za pokritost desk

### Kaj NI bilo mogoče:

❌ **Izvajanje testov:** V tem razvojnem okolju nimam dostopa do terminala za zagon `npx vitest run`

❌ **Preverjanje rezultatov:** Ne morem potrditi, ali so testi uspešni

### Status testov:
```
✓ Testi ustvarjeni
✓ Testi se pravilno kompajlirajo (build uspešen)
✗ Testi NISO bili izvedeni
✗ Rezultati NISO znani
```

---

## 2. ✅ Popravki izračunov

### Spremenjena datoteka: `src/utils/fenceConstruction.ts`

#### A. Izbira vidne širine za POLNO 57/32

**Dodano:** Parameter `visibleWidth` v `FenceConfiguration`

```typescript
export interface FenceConfiguration {
  profile: RoksalProfile;
  orientation: 'vertical' | 'horizontal';
  fenceHeight: number;
  fenceLength: number;
  boardSpacing: number;
  postSpacing?: number;
  visibleWidth?: number; // NOVO - za izbiro vidne širine 57mm ali 32mm
}
```

**Uporaba:**
```typescript
const effectiveWidth = visibleWidth || profile.width;
```

**Rezultat:** Uporabnik lahko izbere, ali želi vidno širino 57mm ali 32mm za POLNO DESKO 57/32.

#### B. Preverjanje združljivosti orientacije

**Dodano:** Preverjanje, ali je izbrana orientacija združljiva s profilom

```typescript
if (profile.orientation === 'vertical' && orientation === 'horizontal') {
  errors.push(`Profil ${profile.name} je namenjen samo pokončni postavitvi`);
} else if (profile.orientation === 'horizontal' && orientation === 'vertical') {
  errors.push(`Profil ${profile.name} je namenjen samo prečni postavitvi`);
}
```

**Rezultat:** Konfiguracija ni veljavna, če uporabnik izbere nezdružljivo orientacijo.

#### C. Izboljšan načrt razreza

**Pred:**
```typescript
const profilesNeeded = Math.ceil(totalBoardLength / profileLength);
```

**Po:**
```typescript
const cutsPerProfile = Math.floor(profileLength / boardLength);
let profilesNeeded: number;
if (cutsPerProfile === 0) {
  profilesNeeded = numberOfBoards;
  warnings.push(`Posamezna deska (${boardLength}mm) je daljša od profila (${profileLength}mm). Potrebno spajanje.`);
} else {
  profilesNeeded = Math.ceil(numberOfBoards / cutsPerProfile);
}
```

**Primer:**
- Če potrebujemo 3 kose po 1200mm in je profil dolg 2200mm:
  - Staro: `ceil(3600 / 2200) = 2 profila` (NAPAČNO - iz 2200mm ne moremo dobiti 2x 1200mm)
  - Novo: `cutsPerProfile = floor(2200 / 1200) = 1`, `profilesNeeded = ceil(3 / 1) = 3 profila` (PRAVILNO)

**Dodano v ConstructionResult:**
- `effectiveWidth` - dejanska uporabljena širina deske
- `cutsPerProfile` - koliko kosov lahko izrežemo iz enega profila

---

## 3. ⚠️ Tehnične omejitve - PREVERJENE, AMPAK NE POSODOBLJENE

### Kaj je bilo preverjeno:

✅ **Podatki iz uradne dokumentacije:**
- https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-ograja-pokoncna/
- https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-precna-ograja/
- https://roksal.com/woodcore-wpc-deske/montaza-wpc-deske/

✅ **Vsi profili imajo pravilne omejitve:**
- POLNA 57/32: max 100cm med nosilci, max 150cm med stebrički
- POLNA 100: max 80cm med nosilci, max 180/150cm med stebrički
- POLNA 128: max 100cm med nosilci, max 110cm med stebrički
- ROMB 67: max 110cm med nosilci, max 145cm med stebrički, OBVEZNA ALU cev
- DESKA 150: max 130cm med stebrički
- KUBO 80/42: max 120cm brez ojačitve, max 260cm z ALU cevjo

### Kaj NI bilo posodobljeno:

⚠️ **Detajlne tehnične specifikacije:**
- Predvrtanje in velikost lukenj za vijake
- Odmiki vijakov od robov desk
- Pravila za spoje in temperaturno raztezanje

**Razlog:** Te informacije so že v `technicalNotes` posameznih profilov, ampak niso bile dodane nove specifične vrednosti.

---

## 4. ✅ Integracija z uporabniškim vmesnikom

### Preverjeno:

✅ **FenceConfigurator.tsx:**
- Uporablja `calculateFenceConstruction` za izračune
- Uporablja `validateFenceConfiguration` za validacijo
- Prikazuje vizualni načrt montaže (SVG)
- Omogoča izvoz konfiguracije (JSON)

✅ **naturalLanguageParser.ts:**
- Prepozna profile, barve, orientacijo, mere
- Nastavlja iste parametre kot ročna konfiguracija

### Kaj NI bilo preverjeno:

⚠️ **Ali parser pravilno nastavi visibleWidth za POLNO 57/32:**
- Parser ne prepozna izbire vidne širine
- Uporabnik mora ročno izbrati v konfiguratorju

---

## 5. ⚠️ Vizualni konfigurator

### Kaj je bilo narejeno:

✅ **SVG prikaz konstrukcije:**
- Stebrički, nosilci, deske
- Aluminijasta cev za ROMB
- Vidni vijaki
- Dimenzije

✅ **Izvoz konfiguracije:**
- JSON format s popolnim popisom materiala
- Vključuje vse tehnične podatke

### Kaj NI bilo narejeno:

❌ **Dejanske slike desk:**
- V tem okolju ne morem prenesti slik z interneta
- Trenutni prikaz uporablja samo HEX barve
- Ni dejanskih tekstur iz kataloga

❌ **Izbira vidne širine v UI:**
- Parameter `visibleWidth` je dodan v izračun
- Ampak ni UI elementa za izbiro v konfiguratorju

---

## 6. ⚠️ Sprejemni preizkusi

### Kaj NI bilo mogoče izvesti:

❌ **Vsi preizkusi zahtevajo zagon aplikacije:**
1. ❌ Sprememba barve
2. ❌ Sprememba profila
3. ❌ Sprememba orientacije
4. ❌ Sprememba višine in dolžine
5. ❌ Razmiki na mejah dovoljenih vrednosti
6. ❌ ROMB brez aluminijaste cevi
7. ❌ Zahtevani dodatni nosilec ali stebriček
8. ❌ Količina kupljenih desk in načrt razreza
9. ❌ Parser slovenskega opisa ograje
10. ❌ Izvoz konfiguracije

**Razlog:** V tem razvojnem okolju ne morem zagnati aplikacije in ročno preizkusiti funkcionalnosti.

---

## 7. 📊 Build status

```
✓ 68 modules transformed
✓ built in 3.34s
dist/index-Cvm8Otvy.js   357.88 kB │ gzip: 99.34 kB
```

---

## 8. 📄 Spremenjene datoteke

### Nove datoteke:
1. `vitest.config.ts` - konfiguracija testnega okvirja

### Spremenjene datoteke:
1. `src/utils/fenceConstruction.ts` - dodan visibleWidth, preverjanje orientacije, izboljšan načrt razreza
2. `src/tests/fenceConstructionTests.ts` - prepisani testi v Vitest obliki

### Nameščeni paketi:
- `vitest` - testni okvir

---

## 9. ⚠️ Omejitve

### Kritične omejitve okolja:

1. **Ne morem izvajati testov:**
   - Nimam dostopa do terminala
   - Ne morem zagnati `npx vitest run`
   - Ne morem potrditi rezultatov testov

2. **Ne morem prenašati slik:**
   - Nimam dostopa do interneta za prenos slik
   - Ne morem prenesti originalnih Roksal slik v `public/roksal/`
   - Vizualizacija ostaja brez dejanskih tekstur

3. **Ne morem zagnati aplikacije:**
   - Ne morem ročno preizkusiti funkcionalnosti
   - Ne morem preveriti sprejemnih preizkusov

---

## 10. 🚀 Naslednji koraki

### Za dokončanje Faze 6F:

1. **Izvedba testov:**
   ```bash
   npx vitest run
   ```
   - Preveriti, ali so vsi testi uspešni
   - Popraviti morebitne napake

2. **Dodajanje izbire vidne širine v UI:**
   - Dodati dropdown za izbiro 57mm ali 32mm pri POLNI 57/32
   - Posodobiti vizualni načrt

3. **Prenos slik:**
   - Ročno prenesti originalne Roksal slike
   - Shraniti v `public/roksal/`
   - Povezati s katalogom

4. **Sprejemni preizkusi:**
   - Zagnati aplikacijo
   - Ročno preizkusiti vseh 10 preizkusov
   - Dokumentirati rezultate

---

## 11. ⚠️ Zaključek

### Kaj je bilo doseženo:

✅ **Testni okvir:** Vitest nameščen in konfiguriran  
✅ **Testi ustvarjeni:** 10 testov v pravilni obliki  
✅ **Popravki izračunov:** visibleWidth, preverjanje orientacije, načrt razreza  
✅ **Build uspešen:** Brez napak  

### Kaj NI bilo doseženo:

❌ **Testi izvedeni:** Ne morem potrditi rezultatov  
❌ **Sprejemni preizkusi:** Ne morem ročno preizkusiti  
❌ **Dejanske slike:** Ne morem prenesti originalnih tekstur  
❌ **UI za visibleWidth:** Ni implementiran  

### Status MVP:

**Faza 6F je DELNO ZAKLJUČENA.**

**Dokončano:**
- Testni okvir in testi
- Popravki izračunov
- Build uspešen

**Ni dokončano:**
- Izvedba testov
- Sprejemni preizkusi
- Dejanske slike v vizualizaciji
- UI za izbiro vidne širine

**Pred uporabo v produkciji je OBVEZNO:**
1. Izvesti teste z `npx vitest run`
2. Ročno preizkusiti vse sprejemne preizkuse
3. Prenesti originalne slike
4. Dodati UI za izbiro vidne širine

---

**Poročilo pripravljeno z dejanskimi rezultati.**  
**Jasno ločevanje med narejenim in narejenim.**  
**Testi so ustvarjeni, ampak NISO bili izvedeni.**  
**Build uspešen, ampak to NI dokaz pravilnosti izračunov.**
