# Mera3D Pro - Aplikacija za monterje ograj

Profesionalna spletna aplikacija za monterje WPC ograj Roksal. Omogoča zajem fotografij s kamero, meritve, vizualizacijo in izračun materiala direktno na terenu.

## 📋 Kazalo

- [Funkcionalnosti](#funkcionalnosti)
- [Namestitev](#namestitev)
- [Zagon](#zagon)
- [Uporaba](#uporaba)
- [Omejitve](#omejitve)
- [Razvoj](#razvoj)
- [Licenca](#licenca)

## ✨ Funkcionalnosti

### ✅ Potrjeno in delujoče

- **📷 Zajem fotografij s kamero** - Real-time kamera z oceno kakovosti slike
- **📏 Ročne meritve** - Merjenje razdalj s kalibracijsko referenco
- **🏗️ Konfiguracija ograj** - Izračun števila desk, stebričkov in materiala po Roksal pravilih
- **🎨 Izbira profilov in barv** - Celoten Roksal katalog WPC profilov
- **💾 Lokalno shranjevanje** - IndexedDB za persistentno shranjevanje projektov
- **📄 Izvoz poročil** - PDF in CSV izvoz meritev in materiala
- **🔍 Naravni jezik** - Konfiguracija ograj z naravnim jezikom (slovenščina)

### 🆕 Perspektivna vizualizacija (Faza 7)

- **📐 Perspektivni Visualizer** - Označite 4 vogale ograje za perspektivno poravnan predogled
- **🔧 OpenCV.js** - Preverjeni algoritmi za perspektivno transformacijo (Apache 2.0)
- **📏 Natančne meritve** - Merilna napaka < 50mm na testnih primerih

### ⚠️ Približki (zahtevajo validacijo)

- **🗺️ Pokritost fotografij** - Avtomatska analiza pokritosti (približek, ne natančna rekonstrukcija)
- **🔗 Povezovanje fotografij** - Feature matching med zaporednimi slikami (osnovna implementacija)
- **🏗️ Vizualizacija ograj** - 2D približek na fotografiji (NE upošteva perspektive)

### ❌ Ni implementirano (glej docs/3D-ARCHITECTURE.md)

- **3D rekonstrukcija** - Prava 3D rekonstrukcija iz fotografij (predlagan COLMAP + Open3D kot ločen backend)
- **AR meritve** - Augmented reality meritve v realnem času (predlagana ARCore Depth API za Android)
- **Samodejno prepoznavanje objektov** - AI-based detekcija ograj in objektov

## 🚀 Namestitev

### Predpogoji

- Node.js 20.x ali 22.x
- npm 10.x ali novejši

### Koraki

```bash
# Kloniraj repozitorij
git clone https://github.com/robertpezdirc8-prog/monter3d.git
cd monter3d

# Namesti odvisnosti (ponovljivo z npm ci)
npm ci

# Preveri TypeScript tipe
npm run typecheck

# Zaženi teste
npm test

# Zagon razvojne različice
npm run dev
```

## 🖥️ Zagon

### Razvojna različica

```bash
npm run dev
```

Aplikacija bo dostopna na `http://localhost:3000`

### Produkcijska gradnja

```bash
npm run build
```

Gradnja bo v mapi `dist/`. Za serviranje uporabi:

```bash
npm run preview
```

## 📖 Uporaba

### 1. Ustvari projekt

- Izberi tip objekta (ograja, stopnice, fasada, teren)
- Vnesi ime projekta

### 2. Zajemi fotografije

- Uporabi kamero ali naloži obstoječe slike
- Aplikacija samodejno oceni kakovost slike
- Za meritve potrebuješ vsaj eno fotografijo z referenčno mero

### 3. Kalibriraj merilo

- Označi znano razdaljo na fotografiji (npr. meter, letvica)
- Vnesi dejansko razdaljo v metrih
- Aplikacija izračuna faktor piksel-meter

### 4. Izvedi meritve

- Označi točke za merjenje
- Aplikacija izračuna razdalje v realnih enotah
- Preveri negotovost vsake meritve

### 5. Konfiguriraj ograjo

- Izberi Roksal profil (POLNA DESKA 57/32, 100, 128, ROMB 67, DESKA 150, KUBO)
- Izberi barvo iz kataloga
- Nastavi dimenzije in razmake
- Aplikacija izračuna število desk, stebričkov in materiala

### 6. Izvozi poročilo

- PDF poročilo za stranko
- CSV izvoz meritev
- JSON izvoz celotnega projekta

## ⚠️ Omejitve

### Tehnične omejitve

1. **2D vizualizacija** - Trenutni prikaz ograj na fotografijah je 2D približek in NE upošteva perspektive. Za natančen prikaz bi bila potrebna 3D rekonstrukcija.

2. **Meritve** - Natančnost meritev je odvisna od:
   - Kakovosti fotografije
   - Velikosti referenčne mere
   - Kota fotografiranja
   - Razdalje do objekta
   
   Priporočamo validacijo meritev z dejanskimi meritvami na terenu.

3. **Feature matching** - Povezovanje fotografij je osnovna implementacija in ne zagotavlja natančne 3D rekonstrukcije. Za profesionalno fotogrametrijo uporabite COLMAP ali podobna orodja.

4. **Offline delovanje** - Aplikacija deluje lokalno in ne zahteva internetne povezave, razen za nalaganje Roksal slik iz njihove spletne strani.

### Pravne omejitve

- Vse Roksal slike in podatki so last Roksal d.o.o. in se uporabljajo z dovoljenjem
- HEX barve so približki - dejanske barve se lahko razlikujejo
- Vedno preverite dejanske vzorce materiala pred končno odločitvijo

## 🛠️ Razvoj

### Struktura projekta

```
src/
├── components/          # React komponente
│   ├── CameraCapture.tsx
│   ├── MeasurementOverlay.tsx
│   ├── FenceConfigurator.tsx
│   └── ...
├── utils/              # Pomožne funkcije
│   ├── cv.ts           # Računalniški vid (feature detection, homography)
│   ├── geometry.ts     # Geometrijski izračuni
│   ├── fenceConstruction.ts  # Izračun konstrukcije ograj
│   └── ...
├── data/               # Statični podatki
│   ├── roksalCatalog.ts  # Roksal profili in barve
│   └── roksalGallery.ts  # Roksal galerija slik
├── types/              # TypeScript tipi
└── tests/              # Testi
```

### Testiranje

```bash
# Zaženi vse teste
npm test

# Zaženi specifične teste
npx vitest run src/tests/fenceConstruction.test.ts

# Testi v watch načinu
npx vitest
```

### CI/CD

Projekt uporablja GitHub Actions za avtomatsko testiranje:
- TypeScript type check
- Unit testi (Vitest)
- Produkcijska gradnja

Workflow se zažene ob vsakem pushu na `main` ali `develop` vejo in ob vsakem pull requestu.

## 📊 Tehnologije

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite 6** - Build tool
- **Tailwind CSS 4** - Styling
- **Vitest** - Testing framework
- **IndexedDB** - Local storage

## 🤝 Prispevanje

Prosimo, da pred prispevanjem odprete issue za diskusijo o spremembi.

## 📄 Licenca

Ta projekt je licenciran pod pogoji, določenimi v datoteki LICENSE.

Vse Roksal slike, logotipi in podatki so last Roksal d.o.o. in se uporabljajo z dovoljenjem.

## 📞 Kontakt

Za vprašanja o aplikaciji kontaktirajte:
- GitHub Issues: https://github.com/robertpezdirc8-prog/monter3d/issues

Za vprašanja o Roksal produktih obiščite:
- Uradna stran: https://roksal.com
