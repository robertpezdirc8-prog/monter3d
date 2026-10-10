// Mera3D Pro - Geometry & Calculation Utilities

import type { FenceSegment, FencePlan, StairsPlan, StairStep, TerrainPlan, TerrainSegment, CostEstimate, MaterialItem } from '../types';

// Calculate fence plan from segments
// NOTE: This function requires segments with explicit coordinates (startPoint, endPoint).
// If only lengths are provided (without directions/angles), the geometry is incomplete.
// The caller must ensure segments are properly connected and oriented.
// Without direction data, corners and angles cannot be determined.
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
  const fenceSegments: FenceSegment[] = [];
  let totalPanels = 0;
  let totalPosts = 0;
  let totalLength = 0;
  let totalHeightChange = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const dx = seg.endPoint[0] - seg.startPoint[0];
    const dy = seg.endPoint[1] - seg.startPoint[1];
    const length = Math.sqrt(dx * dx + dy * dy);
    const slope = Math.atan2(seg.heightChange, length) * 180 / Math.PI;
    
    totalLength += length;
    totalHeightChange += seg.heightChange;

    // Determine mounting type
    let mountingType: 'level' | 'stepped' | 'raked';
    if (config.mountingStyle === 'level') {
      mountingType = 'level';
    } else if (config.mountingStyle === 'stepped') {
      mountingType = 'stepped';
    } else {
      mountingType = Math.abs(slope) > config.slopeThreshold ? 'stepped' : 'level';
    }

    // Calculate panels and posts
    const effectiveWidth = config.panelWidth + config.postWidth;
    const numPanels = Math.max(1, Math.round(length / effectiveWidth));
    const numPosts = numPanels + 1;
    const actualPanelWidth = (length - config.postWidth) / numPanels;

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
      postSpacing: length / numPanels
    });

    totalPanels += numPanels;
    totalPosts += numPosts;
  }

  // Rails: top and bottom for each segment
  const totalRails = fenceSegments.length * 2;
  
  // Fasteners: approximately 4 per panel + 2 per post
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
    totalRails,
    totalFasteners
  };
}

// Calculate stairs plan
export function calculateStairsPlan(
  numSteps: number,
  totalRise: number,
  totalRun: number,
  handrailHeight: number = 0.9
): StairsPlan {
  const avgRise = totalRise / numSteps;
  const avgRun = totalRun / numSteps;
  const slope = Math.atan2(totalRise, totalRun) * 180 / Math.PI;
  const railingLength = Math.sqrt(totalRise * totalRise + totalRun * totalRun) + 0.3;

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

  return {
    numSteps,
    totalRise,
    totalRun,
    averageRise: avgRise,
    averageRun: avgRun,
    slope,
    steps,
    railingLength,
    handrailHeight
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
export function estimateFenceMaterials(plan: FencePlan, materials: {
  panelPricePerM: number;
  postPriceEach: number;
  railPricePerM: number;
  fastenerPriceEach: number;
  endCapPriceEach: number;
}): MaterialItem[] {
  const items: MaterialItem[] = [];
  const wastePercent = 0.07; // 7% waste

  // Validate plan values
  if (!isFinite(plan.totalPanels) || plan.totalPanels <= 0) return [];
  if (!isFinite(plan.totalPosts) || plan.totalPosts <= 0) return [];
  if (!isFinite(plan.panelWidth) || plan.panelWidth <= 0) return [];
  if (!isFinite(plan.panelHeight) || plan.panelHeight <= 0) return [];

  // Validate material prices
  if (!isFinite(materials.panelPricePerM) || materials.panelPricePerM < 0) return [];
  if (!isFinite(materials.postPriceEach) || materials.postPriceEach < 0) return [];

  // Panels
  const panelTotalM = plan.totalPanels * plan.panelWidth * plan.panelHeight;
  const panelQuantity = Math.max(1, Math.ceil(plan.totalPanels * (1 + wastePercent)));
  const panelUnitPrice = materials.panelPricePerM * plan.panelWidth * plan.panelHeight;
  
  if (!isFinite(panelTotalM) || !isFinite(panelUnitPrice)) return [];
  
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
