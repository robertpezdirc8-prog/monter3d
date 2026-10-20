/**
 * fetch-roksal-images.mjs
 *
 * Prenese galerijske slike z roksal.com v `public/roksal/` (lokalna kopija), da
 * galerija deluje brez povezave. Skripta je idempotentna — obstoječe datoteke
 * preskoči, zato jo je varno poganjati večkrat.
 *
 * Uporaba:
 *   node scripts/fetch-roksal-images.mjs
 *
 * Licence: slike so last Roksala (roksal.com). Lokalna kopija je namenjena
 * predstavitvi izdelkov znotraj aplikacije; pred komercialno uporabo preveri
 * pogoje uporabe pri Roksalu.
 */
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_ROOT = join(ROOT, 'public', 'roksal');

/** Galerija (id, mapa, URL) — usklajeno z src/data/roksalGallery.ts. */
const IMAGES = [
  ['vertical-amazon-100', 'vertical', 'https://roksal.com/wp-content/uploads/2021/03/wpc-woodcore-pokoncna-ograja-amazon-polna-deska-tr5.jpg'],
  ['vertical-128-balcony', 'vertical', 'https://roksal.com/wp-content/uploads/2021/11/image000000.jpg'],
  ['vertical-ash-57', 'vertical', 'https://roksal.com/wp-content/uploads/2021/03/wpc-woodcore-pokoncna-ograja-ash-polna-deska-1.jpg'],
  ['horizontal-romb-amazon', 'horizontal', 'https://roksal.com/wp-content/uploads/2021/03/wpc-woodcore-romb-amazon-precna-ograja2.jpg'],
  ['horizontal-romb-golden', 'horizontal', 'https://roksal.com/wp-content/uploads/2021/03/wpc-woodcore-romb-golden-precna-ograja-or1.jpg'],
  ['horizontal-romb-ash', 'horizontal', 'https://roksal.com/wp-content/uploads/2021/03/wpc-woodcore-romb-ash-precna-ograja-lj1.jpg'],
  ['horizontal-romb-burma', 'horizontal', 'https://roksal.com/wp-content/uploads/2021/03/wpc-woodcore-romb-burma-precna-ograja-pez3.jpg'],
  ['profile-57-32', 'profiles', 'https://roksal.com/wp-content/uploads/2025/07/polna-deska-57-32.jpg'],
  ['profile-100', 'profiles', 'https://roksal.com/wp-content/uploads/2020/03/ograja-pokoncna.jpg'],
  ['profile-128', 'profiles', 'https://roksal.com/wp-content/uploads/2021/12/polna-deska-nova2021.jpg'],
  ['profile-romb-67', 'profiles', 'https://roksal.com/wp-content/uploads/2021/12/romb-woodcore-wpc.jpg'],
  ['swatch-terasa-150', 'swatches', 'https://roksal.com/wp-content/uploads/2024/09/BARVNA_LESTVICA_1-terasa4-2048x544.png'],
  ['swatch-polna-100', 'swatches', 'https://roksal.com/wp-content/uploads/2024/10/BARVNA_LESTVICA_2_polna-2048x480.png'],
  ['swatch-romb-67', 'swatches', 'https://roksal.com/wp-content/uploads/2024/09/BARVNA_LESTVICA_3-rombi4-2048x536.png'],
  ['swatch-polna-128', 'swatches', 'https://roksal.com/wp-content/uploads/2024/09/BARVNA_LESTVICA_4-polna-128-4-2048x547.png'],
  ['swatch-kubo-57', 'swatches', 'https://roksal.com/wp-content/uploads/2024/09/BARVNA_LESTVICA_5-kubo4-2048x624.png'],
  ['installation-domzale', 'stairs', 'https://roksal.com/wp-content/uploads/2023/07/Domzale-4-2048x1536.jpg'],
  ['installation-salon', 'stairs', 'https://roksal.com/wp-content/uploads/2025/09/Polna-deska-57-32_salon3_novo.jpg'],
];

/** Preveri, da je prenesena datoteka res slika (magic bytes). */
function isImage(buffer, ext) {
  if (ext === '.png') {
    return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

async function exists(path) {
  try {
    const s = await stat(path);
    return s.size > 1024;
  } catch {
    return false;
  }
}

let ok = 0;
let preskoceno = 0;
let napaka = 0;

for (const [id, folder, url] of IMAGES) {
  const ext = url.toLowerCase().endsWith('.png') ? '.png' : '.jpg';
  const target = join(OUT_ROOT, 'images', folder, `${id}${ext}`);

  if (await exists(target)) {
    preskoceno++;
    console.log(`↷ preskočeno  ${id}`);
    continue;
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mera3D-Pro/1.0 (offline gallery sync)' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!isImage(buffer, ext)) throw new Error('prenesena datoteka ni slika');

    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, buffer);
    ok++;
    console.log(`✓ ${id} (${(buffer.length / 1024).toFixed(0)} kB)`);
  } catch (e) {
    napaka++;
    console.error(`✗ ${id}: ${e.message}`);
  }
}

console.log(`\nPreneseno: ${ok}, preskočeno: ${preskoceno}, napake: ${napaka}`);
if (napaka > 0) process.exitCode = 1;
