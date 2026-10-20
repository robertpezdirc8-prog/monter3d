# Roksal slike (lokalna kopija)

Slike galerije so **lokalne kopije** slik z roksal.com, da galerija deluje brez povezave.
Aplikacija najprej naloži lokalno kopijo, nato (ob napaki) izvirnik z roksal.com, nazadnje
prikaže nadomestek z barvnim vzorcem iz kataloga.

## Struktura

```
public/roksal/
└── images/              # Lokalne kopije galerijskih slik
    ├── vertical/        # Pokončne ograje
    ├── horizontal/      # Prečne ograje
    ├── stairs/          # Stopniščne ograje / izvedbe
    ├── profiles/        # Fotografije posameznih profilov
    └── swatches/        # Barvne lestvice
```

## Osvežitev slik

```bash
npm run fetch:images
```

Skripta `scripts/fetch-roksal-images.mjs` prenese manjkajoče slike z roksal.com v zgornje
mape (preveri, da je datoteka res slika), jo je idempotentna (obstoječe preskoči) in
ne spreminja strukturo repozitorija. Seznam in `localPath` posodobi v
`src/data/roksalGallery.ts`.

Test `src/tests/gallery.test.ts` preveri, da za vsako sliko v katalogu lokalna datoteka
res obstaja — manjkajoča slika tako takoj pokaže napako v CI.

## Avtorstvo in uporaba

Slike so **last Roksala (roksal.com)** in so v repozitoriju shranjene za predstavitev
izdelkov znotraj aplikacije. Pred komercialno uporabo preveri pogoje uporabe pri Roksalu
in v naslovu produkta navedi vir. Če slik ne smeš redistribuirati, jih odstrani iz
`public/roksal/images/` in uporabi `url` (galerija bo delovala, a potrebuje povezavo).

## Barvni odtenki in teksture

`public/roksal/swatches/` vsebuje izvirne barvne lestvice. Izrezani posamezni vzorci
(`crops/`) in teksture za vizualizacijo (`textures/`) še niso izdelani — za zdaj galerija
uporablja celotne lestvice, barve pa so na voljo tudi v katalogu (`src/data/roksalCatalog.ts`),
ki deluje povsem brez povezave.
