// Mera3D Pro - Geometry & Calculation Utilities

import type { Measurement, FenceSegment, FencePlan, StairsPlan, StairStep, TerrainPlan, TerrainSegment, CostEstimate, MaterialItem } from '../types';

const EPS = 1e-9;

/**
 * FAZA 7 (P0): ali je meritev sploh lahko del dolžine ograje?
 *
 * Referenčna (kalibracijska) meritev opisuje merilo fotografije, ne objekta.
 * Prej se je zgodilo, da je 2 m merilni trak postal dodatni segment ograje in
 * napihnil količine ter predračun. Zato so take meritve tu izrecno izločene.
 */
export function isFenceLengthMeasurement(
  m: Pick<Measurement, 'status' | 'unit' | 'scaleSource' | 'algorithm' | 'value'> &
    Partial<Pick<Measurement, 'source' | 'isScaleReference'>>
): boolean {
  if (m.isScaleReference === true) return false;
  if (m.source === 'reference_scale' || m.source === 'calibration_marker') return false;
  if (m.algorithm === 'reference_calibration') return false;
  if (m.status !== 'verified') return false;
  if (m.unit !== 'm') return false;
  if (!isFinite(m.value) || m.value <= 0) return false;
  if (m.scaleSource === 'unknown' || m.scaleSource === 'demo' || m.scaleSource === 'normalized') return false;
  return true;
}

/** Vrne samo meritve, ki predstavljajo dejansko dolžino objekta. */
export function selectFenceLengthMeasurements<T extends Measurement>(measurements: T[]): T[] {
  return measurements.filter(isFenceLengthMeasurement);
}

// Calculate fence plan from segments
// Model (FAZA 1, jasno dolocen): paneli se REZEJO NA MERO. N panelov + (N+1) stebrov
// točno zapolnita dolžino: N*panelWidth + (N+1)*postWidth = L.
// N je izbran tako, da DEJANSKA sirina panela nikoli ne preseže načrtovane sirine profila:
//   N_min = ceil((L - postWidth) / (panelWidth + postWidth))
// Če dejanska širina odstopa več kot maxGap, je konfiguracija NEVELJAVNA (napaka) —
// tiho raztezanje panelov nad dimenzije profila ni dovoljeno.
// Neveljavnih segmentov NE filtriramo tiho; načrt vrne strukturirane napake/opozorila.
export function calculateFencePlan(
  segments: { startPoint: [number, number]; endPoint: [number, number]; heightChange: number }[],
  config: {
    panelWidth: number;
    panelHeight: number;
    postWidth: number;
    maxGap: number;
    mountingStyle: 'level' | 'stepped' | 'mixed';
    slopeThreshold: number; // degrees
  }
): FencePlan {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fenceSegments: FenceSegment[] = [];
  let totalPanels = 0;
  let postsRaw = 0;
  let totalLength = 0;
  let totalHeightChange = 0;

  // FAZA 1: validacija konfiguracije — brez tega bi NaN geometrija stekla v načrt.
  if (!isFinite(config.panelWidth) || config.panelWidth <= 0) errors.push(`Neveljavna širina panela: ${config.panelWidth}`);
  if (!isFinite(config.panelHeight) || config.panelHeight <= 0) errors.push(`Neveljavna višina panela: ${config.panelHeight}`);
  if (!isFinite(config.postWidth) || config.postWidth < 0) errors.push(`Neveljavna širina stebra: ${config.postWidth}`);
  if (!isFinite(config.maxGap) || config.maxGap < 0) errors.push(`Neveljaven največji razmik (maxGap): ${config.maxGap}`);

  if (errors.length === 0) {
    const effectiveWidth = config.panelWidth + config.postWidth;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const badCoords = !seg ||
        !isFinite(seg.startPoint?.[0]) || !isFinite(seg.startPoint?.[1]) ||
        !isFinite(seg.endPoint?.[0]) || !isFinite(seg.endPoint?.[1]);
      if (badCoords) {
        errors.push(`Segment ${i + 1}: neveljavne koordinate (NaN/Infinity/manjkajoče).`);
        continue;
      }
      if (!isFinite(seg.heightChange)) {
        errors.push(`Segment ${i + 1}: neveljavna višinska razlika (${seg.heightChange}).`);
        continue;
      }
      const dx = seg.endPoint[0] - seg.startPoint[0];
      const dy = seg.endPoint[1] - seg.startPoint[1];
      const horizontalLength = Math.sqrt(dx * dx + dy * dy);
      if (!(horizontalLength > EPS)) {
        warnings.push(`Segment ${i + 1}: ničelna dolžina — izpuščen iz načrta.`);
        continue;
      }
      const slope = Math.atan2(seg.heightChange, horizontalLength) * 180 / Math.PI;
      // Fizična dolžina segmenta po naklonu (pomembno za 'raked' montažo)
      const length = Math.sqrt(horizontalLength * horizontalLength + seg.heightChange * seg.heightChange);

      totalLength += horizontalLength;
      totalHeightChange += seg.heightChange;

      let mountingType: 'level' | 'stepped' | 'raked';
      if (config.mountingStyle === 'level') {
        mountingType = 'level';
      } else if (config.mountingStyle === 'stepped') {
        mountingType = 'stepped';
      } else {
        mountingType = Math.abs(slope) > config.slopeThreshold ? 'stepped' : 'level';
      }

      // N je najmanjše število RAZPONOV (panel + steber), ki pokrije dolžino:
      //   N >= (L - postWidth) / (panelWidth + postWidth)
      // Uporabljen je ceil — NE round — sicer premalo razponov tiho proizvede panel,
      // širši od profila (npr. L=2,5 m / profil 1,8 m / steber 0,06 m: round(1,34)=1
      // -> panel (2,5-2*0,06)/1 = 2,38 m, kar krši dimenzijo sistema).
      // EPS (1e-9 m = 1 nm) je IZKLJUČNO toleranca plavajoče vejice: pri točno zveznem
      // razporedu (L=3,78 m) je idealN zaradi binarnega predstavljanja lahko
      // 1.9999999999999998 in bi ga ceil napačno dvignil na 3. Ne prikriva nobene
      // resnične razlike v merah — merjene razlike so > 1e-6 m (mm resolucija).
      const idealN = (horizontalLength - config.postWidth) / effectiveWidth;
      const numPanels = Math.max(1, Math.ceil(idealN - EPS));
      const numPosts = numPanels + 1;
      // Preostanek se enakomerno porazdeli med VSE razpone: vsak panel je
      // (L - (N+1)*postWidth)/N <= nominalna širina profila (validacija spodaj).
      const actualPanelWidth = (horizontalLength - numPosts * config.postWidth) / numPanels;

      // Pravilnost: realni razmik sme ODSTOPATI navzdol (krajši rezani panel),
      // navzgor pa ne sme preseči tolerance maxGap glede na profil.
      if (actualPanelWidth > config.panelWidth + config.maxGap + EPS) {
        errors.push(
          `Segment ${i + 1} (${horizontalLength.toFixed(2)} m): panel bi moral biti ${actualPanelWidth.toFixed(3)} m ` +
          `(nominalna širina profila ${config.panelWidth} m + toleranca ${config.maxGap} m). ` +
          `Zmanjšajte razpon segmenta ali dodajte vmesni steber.`
        );
        continue;
      }
      if (actualPanelWidth < config.panelWidth - config.maxGap - EPS) {
        warnings.push(
          `Segment ${i + 1}: zadnji panel bo odrezan na ${actualPanelWidth.toFixed(3)} m (večji odkupni kos).`
        );
      }

      fenceSegments.push({
        id: `seg-${i}`,
        startPoint: seg.startPoint,
        endPoint: seg.endPoint,
        length,
        heightChange: seg.heightChange,
        slope,
        mountingType,
        numPanels,
        numPosts,
        panelWidth: actualPanelWidth,
        nominalPanelWidth: config.panelWidth,
        postSpacing: actualPanelWidth + config.postWidth // točen razmik med sredinami stebrov
      });

      totalPanels += numPanels;
      postsRaw += numPosts;
    }

    // FAZA 1: vogalni steber si delita sosednja segmenta (konec_i == zacetek_i+1) — steje SAMO ENKRAT.
    let sharedCornerPosts = 0;
    for (let i = 0; i + 1 < fenceSegments.length; i++) {
      const a = fenceSegments[i], b = fenceSegments[i + 1];
      if (Math.hypot(a.endPoint[0] - b.startPoint[0], a.endPoint[1] - b.startPoint[1]) < EPS &&
          Math.abs(a.heightChange - b.heightChange) < EPS) {
        sharedCornerPosts++;
      }
    }
    const totalPosts = postsRaw - sharedCornerPosts;

    if (fenceSegments.length === 0 && errors.length === 0) {
      errors.push('Ni veljavnih segmentov — prazen načrt.');
    }

    const totalRails = fenceSegments.length * 2;
    // Fasteners: 4 na panel + 2 na steber (stebri BREZ dvojnega štetja vogalov)
    const totalFasteners = totalPanels * 4 + totalPosts * 2;

    return {
      totalLength,
      totalHeightChange,
      segments: fenceSegments,
      mountingStyle: config.mountingStyle,
      productType: 'standard',
      panelHeight: config.panelHeight,
      panelWidth: config.panelWidth,
      postHeight: config.panelHeight + 0.1,
      maxGap: config.maxGap,
      totalPanels,
      totalPosts,
      sharedCornerPosts,
      totalRails,
      totalFasteners,
      errors: errors.length ? errors : undefined,
      warnings: warnings.length ? warnings : undefined
    };
  }

  // Neveljavna konfiguracija — prazen, a jasno označen načrt (nikoli lažno veljaven).
  return {
    totalLength: 0, totalHeightChange: 0, segments: [],
    mountingStyle: config.mountingStyle, productType: 'standard',
    panelHeight: config.panelHeight, panelWidth: config.panelWidth,
    postHeight: config.panelHeight + 0.1, maxGap: config.maxGap,
    totalPanels: 0, totalPosts: 0, sharedCornerPosts: 0,
    totalRails: 0, totalFasteners: 0, errors, warnings: warnings.length ? warnings : undefined
  };
}

// Calculate stairs plan
export function calculateStairsPlan(
  numSteps: number,
  totalRise: number,
  totalRun: number,
  handrailHeight: number = 0.9
): StairsPlan {
  // FAZA 1: validacija vhodov — neveljavne vrednosti nikoli ne proizvedejo NaN nacrta.
  if (!isFinite(numSteps) || !Number.isInteger(numSteps) || numSteps <= 0) {
    throw new Error(`Neveljavno število stopnic: ${numSteps}`);
  }
  if (!isFinite(totalRise) || totalRise < 0) throw new Error(`Neveljavna višinska razlika: ${totalRise}`);
  if (!isFinite(totalRun) || totalRun <= 0) throw new Error(`Neveljavna dolžina stopnišča: ${totalRun}`);
  if (!isFinite(handrailHeight) || handrailHeight <= 0) throw new Error(`Neveljavna višina ograje: ${handrailHeight}`);

  const avgRise = totalRise / numSteps;
  const avgRun = totalRun / numSteps;
  const slope = Math.atan2(totalRise, totalRun) * 180 / Math.PI;
  // Dolzina ograja po naklonu + prehod na zacetek/konec (0.3 m skupaj, ne 0.3 m "vsiljen" vsaki smeri)
  const railingLength = Math.sqrt(totalRise * totalRise + totalRun * totalRun) + 0.3;

  // Blum-ovo pravilo udobja stopnic: 2r + g ≈ 59–65 cm (din A/B/C).
  // Opozorilo ni vraceno prek izjeme, ker nacrt ostane tehnicno izvedljiv, a opozarjamo monterja.
  // Semantika (FAZA 1): numSteps steje POHODNE PLOSKEV; zadnja ploskev je lahko podest,
  // pri cemer je skupno stevilo dvigov enako stevilu pohodnih ploskev (zadnji dvig do vhoda).

  const steps: StairStep[] = [];
  for (let i = 0; i < numSteps; i++) {
    steps.push({
      index: i,
      rise: avgRise,
      run: avgRun,
      detected: true,
      confirmed: false
    });
  }

  // Opozorila udobja/varnosti (Blum 2r+g; naklon po EN/odstopnici)
  const warnings: string[] = [];
  const blumCm = (2 * avgRise + avgRun) * 100;
  if (blumCm < 59 || blumCm > 65) {
    warnings.push(`Neudobne stopnice: 2r+g = ${blumCm.toFixed(0)} cm (priporočeno 59–65 cm).`);
  }
  if (avgRise * 100 > 19) warnings.push(`Višina stopnice ${(avgRise*100).toFixed(1)} cm presega 19 cm.`);
  if (avgRun * 100 < 26) warnings.push(`Globina stopnice ${(avgRun*100).toFixed(1)} cm je manjša od 26 cm.`);
  if (slope > 45) warnings.push(`Naklon ${slope.toFixed(1)}° je preveč strm za običajne stopnice (< 45°).`);
  // FAZA 1: validacija višine ograje — vidno uporabniku (QuantityView prikazuje warnings).
  if (handrailHeight < 0.9) {
    warnings.push(`Višina ograje ${handrailHeight.toFixed(2)} m je pod priporočenih 0,9 m (varnostni standard).`);
  }

  return {
    numSteps,
    totalRise,
    totalRun,
    averageRise: avgRise,
    averageRun: avgRun,
    slope,
    steps,
    railingLength,
    handrailHeight,
    warnings
  };
}

// Calculate terrain plan
export function calculateTerrainPlan(
  points: [number, number, number][] // [x, y, height]
): TerrainPlan {
  const segments: TerrainSegment[] = [];
  let totalLength = 0;
  let totalHeightChange = 0;
  let totalHorizontal = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1][0] - points[i][0];
    const dy = points[i + 1][1] - points[i][1];
    const dh = points[i + 1][2] - points[i][2];
    const horizDist = Math.sqrt(dx * dx + dy * dy);
    const slopeDist = Math.sqrt(horizDist * horizDist + dh * dh);
    const slope = Math.atan2(dh, horizDist) * 180 / Math.PI;

    segments.push({
      id: `terrain-${i}`,
      length: slopeDist,
      heightChange: dh,
      slope,
      horizontalProjection: horizDist
    });

    totalLength += slopeDist;
    totalHeightChange += dh;
    totalHorizontal += horizDist;
  }

  return {
    totalLength,
    totalHeightChange,
    averageSlope: segments.length > 0 ? Math.atan2(totalHeightChange, totalHorizontal) * 180 / Math.PI : 0,
    segments,
    horizontalProjection: totalHorizontal
  };
}

// Material estimation for fence
// ENOTE CEN (FAZA 1, jasno definirane):
//   panelPricePerM2  = EUR na kvadratni METER panela (m²) — poslovna definicija WPC panelnih
//                     sistemov; enotska cena kosa = cena/m² × (širina × višina panela).
//   railPricePerM   = EUR na TEKOČI METER letve.
//   post/fastener/endCap = EUR na kos.
// OPOMBA: uporabljen je NOMINALNI profil (plan.panelWidth), ne povprečna dejanska širina
// rezanih panelov — kupujemo celne panele, reže se na terenu. Količine stebrov upoštevajo
// že odštete vogalne stebre iz nacrta (plan.totalPosts).
export function estimateFenceMaterials(plan: FencePlan, materials: {
  panelPricePerM2: number; // EUR/m²
  postPriceEach: number;
  railPricePerM: number; // EUR/tekm
  fastenerPriceEach: number;
  endCapPriceEach: number;
}): MaterialItem[] {
  const items: MaterialItem[] = [];
  const wastePercent = 0.07; // 7% waste

  // FAZA 1: predračuna NI mogoče sestaviti iz napačnega/nepopolnega načrta.
  if (plan.errors && plan.errors.length > 0) return [];

  // Validate plan values
  if (!isFinite(plan.totalPanels) || plan.totalPanels <= 0) return [];
  if (!isFinite(plan.totalPosts) || plan.totalPosts <= 0) return [];
  if (!isFinite(plan.panelWidth) || plan.panelWidth <= 0) return [];
  if (!isFinite(plan.panelHeight) || plan.panelHeight <= 0) return [];

  // Validate material prices
  if (!isFinite(materials.panelPricePerM2) || materials.panelPricePerM2 < 0) return [];
  if (!isFinite(materials.postPriceEach) || materials.postPriceEach < 0) return [];

  const panelAreaM2 = plan.panelWidth * plan.panelHeight;
  const panelQuantity = Math.max(1, Math.ceil(plan.totalPanels * (1 + wastePercent)));
  const panelUnitPrice = materials.panelPricePerM2 * panelAreaM2;

  if (!isFinite(panelAreaM2) || !isFinite(panelUnitPrice)) return [];
  
  items.push({
    id: 'mat-panels',
    name: 'Paneli ograje',
    category: 'panels',
    quantity: panelQuantity,
    unit: 'kos',
    unitPrice: panelUnitPrice,
    totalPrice: panelQuantity * panelUnitPrice,
    notes: `Višina: ${plan.panelHeight}m, Širina: ${(plan.panelWidth * 100).toFixed(0)}cm`
  });

  // Posts
  const postQuantity = Math.max(1, Math.ceil(plan.totalPosts * (1 + wastePercent)));
  items.push({
    id: 'mat-posts',
    name: 'Stebri',
    category: 'posts',
    quantity: postQuantity,
    unit: 'kos',
    unitPrice: materials.postPriceEach,
    totalPrice: postQuantity * materials.postPriceEach,
    notes: `Višina: ${plan.postHeight.toFixed(2)}m`
  });

  // Rails
  const railTotalM = plan.segments.reduce((sum, s) => {
    if (!isFinite(s.length) || s.length < 0) return sum;
    return sum + s.length;
  }, 0) * 2;
  
  const railQuantity = Math.max(0, Math.ceil(railTotalM * (1 + wastePercent) * 10) / 10);
  items.push({
    id: 'mat-rails',
    name: 'Letve (zgornja + spodnja)',
    category: 'rails',
    quantity: railQuantity,
    unit: 'm',
    unitPrice: materials.railPricePerM,
    totalPrice: railQuantity * materials.railPricePerM,
    notes: `${plan.totalRails} letv skupaj`
  });

  // Fasteners
  const fastenerQuantity = Math.max(0, Math.ceil(plan.totalFasteners * (1 + wastePercent)));
  items.push({
    id: 'mat-fasteners',
    name: 'Pritrdilni elementi',
    category: 'fasteners',
    quantity: fastenerQuantity,
    unit: 'kos',
    unitPrice: materials.fastenerPriceEach,
    totalPrice: fastenerQuantity * materials.fastenerPriceEach,
    notes: 'Vijaki, nosilci, sponke'
  });

  // End caps
  const endCapQuantity = Math.max(0, plan.segments.length * 2 + 2);
  items.push({
    id: 'mat-endcaps',
    name: 'Zaključni elementi',
    category: 'endcaps',
    quantity: endCapQuantity,
    unit: 'kos',
    unitPrice: materials.endCapPriceEach,
    totalPrice: endCapQuantity * materials.endCapPriceEach,
    notes: 'Začetni in končni pokrovi'
  });

  return items;
}

// Material estimation for stairs railing
export function estimateStairsMaterials(plan: StairsPlan, materials: {
  handrailPricePerM: number;
  balusterPriceEach: number;
  bracketPriceEach: number;
}): MaterialItem[] {
  const items: MaterialItem[] = [];
  const wastePercent = 0.05;

  items.push({
    id: 'mat-handrail',
    name: 'Ograjni lok',
    category: 'handrail',
    quantity: Math.ceil(plan.railingLength * (1 + wastePercent) * 10) / 10,
    unit: 'm',
    unitPrice: materials.handrailPricePerM,
    totalPrice: Math.ceil(plan.railingLength * (1 + wastePercent) * 10) / 10 * materials.handrailPricePerM,
    notes: `Naklon: ${plan.slope.toFixed(1)}°`
  });

  items.push({
    id: 'mat-balusters',
    name: 'Balustri',
    category: 'balusters',
    quantity: Math.ceil(plan.numSteps * 2 * (1 + wastePercent)),
    unit: 'kos',
    unitPrice: materials.balusterPriceEach,
    totalPrice: Math.ceil(plan.numSteps * 2 * (1 + wastePercent)) * materials.balusterPriceEach,
    notes: '2 na stopnico'
  });

  items.push({
    id: 'mat-brackets',
    name: 'Nosilci in pritrditve',
    category: 'brackets',
    quantity: Math.ceil(plan.numSteps * 3 * (1 + wastePercent)),
    unit: 'kos',
    unitPrice: materials.bracketPriceEach,
    totalPrice: Math.ceil(plan.numSteps * 3 * (1 + wastePercent)) * materials.bracketPriceEach,
    notes: '3 na stopnico'
  });

  return items;
}

// Build cost estimate
export function buildCostEstimate(
  materials: MaterialItem[],
  labor: { hours: number; rate: number } | undefined,
  taxRate: number,
  measurements?: { status: 'verified' | 'warning' | 'invalid'; scaleSource: string }[]
): CostEstimate {
  // Validate and sum material prices
  const subtotal = materials.reduce((sum, m) => {
    // Skip invalid prices
    if (!isFinite(m.totalPrice) || m.totalPrice < 0) return sum;
    return sum + m.totalPrice;
  }, 0);
  
  // Validate labor
  let laborTotal = 0;
  if (labor) {
    if (isFinite(labor.hours) && isFinite(labor.rate) && labor.hours >= 0 && labor.rate >= 0) {
      laborTotal = labor.hours * labor.rate;
    }
  }
  
  // Validate tax rate
  const validTaxRate = (isFinite(taxRate) && taxRate >= 0) ? taxRate : 0;
  
  const beforeTax = subtotal + laborTotal;
  const tax = beforeTax * validTaxRate;
  
  // Final validation
  if (!isFinite(beforeTax) || !isFinite(tax)) {
    // Return zero estimate if calculations are invalid
    return {
      materials: [],
      labor: undefined,
      subtotal: 0,
      tax: 0,
      taxRate: validTaxRate,
      total: 0,
      wastePercent: 0,
      validMeasurements: 0,
      invalidMeasurements: 0,
      warningMeasurements: 0
    };
  }

  // Count measurement validity
  let validMeasurements = 0;
  let invalidMeasurements = 0;
  let warningMeasurements = 0;
  
  if (measurements) {
    for (const m of measurements) {
      const validation = validateMeasurementForEstimate(m.status, m.scaleSource);
      if (!validation.canInclude) {
        if (m.status === 'invalid') invalidMeasurements++;
        else warningMeasurements++;
      } else {
        validMeasurements++;
      }
    }
  }

  return {
    materials,
    labor: labor ? { ...labor, total: laborTotal } : undefined,
    subtotal,
    tax,
    taxRate: validTaxRate,
    total: beforeTax + tax,
    wastePercent: 7,
    validMeasurements,
    invalidMeasurements,
    warningMeasurements
  };
}

// Validate measurement before including in estimate
export function validateMeasurementForEstimate(
  status: 'verified' | 'warning' | 'invalid',
  scaleSource: string
): { canInclude: boolean; reason: string } {
  if (status === 'invalid') {
    return { canInclude: false, reason: 'Meritev je neveljavna in ne sme biti vključena v predračun.' };
  }
  if (status === 'warning') {
    if (scaleSource === 'unknown' || scaleSource === 'normalized') {
      return { canInclude: false, reason: 'Merilo ni potrjeno. Metrične vrednosti niso zanesljive.' };
    }
    return { canInclude: true, reason: 'Meritev je uporabna z omejitvami. Uporabnik mora potrditi.' };
  }
  if (scaleSource === 'unknown' || scaleSource === 'normalized' || scaleSource === 'demo') {
    return { canInclude: false, reason: 'Merilo ni kalibrirano. Metrične vrednosti niso preverjene.' };
  }
  return { canInclude: true, reason: 'Meritev je preverjena.' };
}

// Format measurement with uncertainty
export function formatMeasurement(value: number, unit: string, uncertainty: number): string {
  if (unit === 'm') {
    return `${value.toFixed(3)} m ±${(uncertainty).toFixed(1)}%`;
  } else if (unit === 'cm') {
    return `${value.toFixed(1)} cm ±${(uncertainty).toFixed(1)}%`;
  } else if (unit === '°') {
    return `${value.toFixed(1)}° ±${(uncertainty).toFixed(1)}%`;
  }
  return `${value.toFixed(2)} ${unit} ±${(uncertainty).toFixed(1)}%`;
}

// Export measurements to CSV
export function exportMeasurementsCSV(measurements: {
  id: string;
  type: string;
  value: number;
  unit: string;
  status: string;
  uncertainty: number;
  source: string;
  algorithm: string;
}[]): string {
  const header = 'ID,Tip,Vrednost,Enota,Status,Negotovost (%),Vir,Algoritem\n';
  const rows = measurements.map(m =>
    `${m.id},${m.type},${m.value.toFixed(4)},${m.unit},${m.status},${m.uncertainty.toFixed(1)},${m.source},${m.algorithm}`
  ).join('\n');
  return header + rows;
}

// Export project to JSON
export function exportProjectJSON(project: any): string {
  return JSON.stringify(project, null, 2);
}
