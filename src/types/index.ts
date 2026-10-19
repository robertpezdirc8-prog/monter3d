// Mera3D Pro - Type Definitions

export interface Customer {
  name: string;
  address?: string;
  postalCode?: string;
  city?: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
}

/**
 * Izbor Roksal izdelka, ki se shrani v projekt in je osnova za kosovnico
 * ter ponudbo. Mere so v milimetrih, ker je katalog Roksal v mm.
 */
export interface RoksalConfiguration {
  profileId: string;
  profileName: string;
  colorId: string;
  colorName: string;
  colorHex: string;
  orientation: 'vertical' | 'horizontal';
  fenceHeightMm: number;
  fenceLengthMm: number;
  boardSpacingMm: number;
  postSpacingMm?: number;
  visibleWidthMm?: number;
}

export interface QuoteItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

/**
 * Roksal ponudba je ločena od splošnega CostEstimate, ker vsebuje
 * podatke o stranki, številko ponudbe, veljavnost in Roksal kosovnico.
 */
export interface RoksalQuote {
  id: string;
  number: string;
  createdAt: Date;
  validUntil: Date;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  customer: Customer;
  configuration: RoksalConfiguration;
  items: QuoteItem[];
  labor?: {
    hours: number;
    rate: number;
    total: number;
  };
  materialsSubtotal: number;
  laborTotal: number;
  subtotal: number;
  discountPercent: number;
  discount: number;
  taxRate: number; // decimal, npr. 0.22
  tax: number;
  total: number;
  valid: boolean;
  errors: string[];
  warnings: string[];
  isDemoPrices: boolean;
  notes?: string;
  terms?: string;
}

export interface Project {
  id: string;
  name: string;
  objectType: ObjectType;
  createdAt: Date;
  updatedAt: Date;
  photos: Photo[];
  measurements: Measurement[];
  fencePlan?: FencePlan;
  stairsPlan?: StairsPlan;
  terrainPlan?: TerrainPlan;
  materials: MaterialSelection;
  estimate?: CostEstimate;
  customer?: Customer;
  roksalConfig?: RoksalConfiguration;
  roksalQuote?: RoksalQuote;
  montages?: ProjectMontage[];
  status: ProjectStatus;
}

/**
 * Shranjena fotomontaža je del projekta in se lahko doda v PDF/ponudbo.
 * Slika je PNG data URL, ustvarjena v vizualizatorju.
 */
export interface ProjectMontage {
  id: string;
  dataUrl: string;
  createdAt: Date;
  sourcePhotoId?: string;
  profileName: string;
  colorName: string;
  orientation: 'vertical' | 'horizontal';
  fenceHeightMm: number;
  boardSpacingMm: number;
  pxPerMeter: number | null;
}

export type ProjectMontageInput = Omit<ProjectMontage, 'id' | 'createdAt'>;

export type ObjectType = 'fence' | 'stairs' | 'facade' | 'terrain' | 'combined';
export type ProjectStatus = 'capture' | 'processing' | 'measuring' | 'planning' | 'complete';

/**
 * Vloge uporabnikov: monter (teren), skladiščnik (kosovnice in pobirnice)
 * in direktor (pregled projektov in ponudb). Izbira je shranjena lokalno.
 */
export type UserRole = 'monter' | 'skladisce' | 'direktor';

export interface Photo {
  id: string;
  dataUrl: string;
  timestamp: Date;
  position?: CameraPosition;
  quality: ImageQuality;
  features?: FeaturePoint[];
  coverage: number;
  status: 'pending' | 'analyzed' | 'accepted' | 'rejected';
  rejectionReason?: string;
  width?: number;
  height?: number;
}

export interface CameraPosition {
  x: number;
  y: number;
  z: number;
  rotation: [number, number, number];
  confidence: number;
}

export interface ImageQuality {
  sharpness: number;
  brightness: number;
  contrast: number;
  blurScore: number;
  glareDetected: boolean;
  overallScore: number;
}

export interface FeaturePoint {
  x: number;
  y: number;
  response: number;
  scale: number;
  angle: number;
  descriptor?: number[];
}

export interface FeatureMatch {
  queryIdx: number;
  trainIdx: number;
  distance: number;
  ratioTest: boolean;
  crossCheck: boolean;
  isGeometricInlier: boolean;
}

export interface OverlapEstimate {
  rawMatches: number;
  crossCheckMatches: number;
  geometricInliers: number;
  coveredCells: number;
  totalCells: number;
  overlapPercent: number;
  reprojectionRMSE: number;
  concentrationIndex: number;
  reliability: 'high' | 'medium' | 'low' | 'rejected';
  reason: string;
}

export type MeasurementSource = 'manual' | 'feature_matching' | 'homography' | 'triangulation' | 'reference_scale' | 'calibration_marker';
export type ScaleSource = 'demo' | 'manual_reference' | 'calibration_marker' | 'verified_model' | 'normalized' | 'unknown';
export type MeasurementStatus = 'verified' | 'warning' | 'invalid';

export interface Measurement {
  id: string;
  type: MeasurementType;
  value: number;
  unit: string;
  source: MeasurementSource;
  scaleSource: ScaleSource;
  status: MeasurementStatus;
  uncertainty: number; // percentage
  confidence: number;
  photoIds: string[];
  algorithm: string;
  calibration?: CalibrationInfo;
  notes?: string;
  createdAt: Date;
  verifiedAt?: Date;
}

export type MeasurementType = 'length' | 'height' | 'width' | 'slope' | 'angle' | 'area' | 'distance' | 'polyline';

export interface CalibrationInfo {
  method: string;
  referenceLength?: number;
  pixelToMeterRatio?: number;
  focalLength?: number;
  distortionCoeffs?: number[];
}

export interface FenceSegment {
  id: string;
  startPoint: [number, number];
  endPoint: [number, number];
  length: number;
  heightChange: number;
  slope: number;
  mountingType: 'level' | 'stepped' | 'raked';
  numPanels: number;
  numPosts: number;
  panelWidth: number; // DEJANSKA sirina panela po modelu N*panel + (N+1)*post = L (m)
  nominalPanelWidth: number; // nacrtovana/izbrana sirina profila (m)
  postSpacing: number;
}

export interface FencePlan {
  totalLength: number;
  totalHeightChange: number;
  segments: FenceSegment[];
  mountingStyle: 'level' | 'stepped' | 'mixed';
  productType: string;
  panelHeight: number;
  panelWidth: number;
  postHeight: number;
  maxGap: number;
  totalPanels: number;
  /** Skupno stevilo stebrov — vogalni stebri, ki si jih delita sosednja segmenta, steje samo enkrat. */
  totalPosts: number;
  sharedCornerPosts: number;
  totalRails: number;
  totalFasteners: number;
  /** FAZA 1: napake pomenijo, da veljaven nacrt ni bil mogoce (npr. neveljavnih vhodov). */
  errors?: string[];
  warnings?: string[];
}

export interface StairStep {
  index: number;
  rise: number;
  run: number;
  detected: boolean;
  confirmed: boolean;
}

export interface StairsPlan {
  warnings?: string[]; // tehnična opozorila (npr. Blum pravilo, naklon) — FAZA 1
  numSteps: number;
  totalRise: number;
  totalRun: number;
  averageRise: number;
  averageRun: number;
  slope: number;
  steps: StairStep[];
  railingLength: number;
  handrailHeight: number;
}

export interface TerrainSegment {
  id: string;
  length: number;
  heightChange: number;
  slope: number;
  horizontalProjection: number;
}

export interface TerrainPlan {
  totalLength: number;
  totalHeightChange: number;
  averageSlope: number;
  segments: TerrainSegment[];
  horizontalProjection: number;
}

export interface MaterialSelection {
  productLine: string;
  color: string;
  finish: string;
  panelMaterial: string;
  postMaterial: string;
  fastenerType: string;
}

export interface MaterialItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  measurementId?: string;
  notes?: string;
}

export interface CostEstimate {
  materials: MaterialItem[];
  labor?: {
    hours: number;
    rate: number;
    total: number;
  };
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  wastePercent: number;
  validMeasurements: number;
  invalidMeasurements: number;
  warningMeasurements: number;
}

export interface CoverageMap {
  cells: CoverageCell[];
  totalCells: number;
  coveredCells: number;
  coveragePercent: number;
}

export interface CoverageCell {
  x: number;
  y: number;
  width: number;
  height: number;
  covered: boolean;
  numFeatures: number;
  status: 'covered' | 'partial' | 'missing' | 'rejected';
}

export interface AppState {
  currentProject: Project | null;
  projects: Project[];
  currentStep: WorkflowStep;
  isOffline: boolean;
  opencvLoaded: boolean;
}

export type WorkflowStep = 
  | 'new_project'
  | 'select_type'
  | 'capture'
  | 'quality_check'
  | 'reconstruction'
  | 'scale_verification'
  | 'geometry_review'
  | 'measurements'
  | 'material_selection'
  | 'visualization'
  | 'quantity_calc'
  | 'estimate'
  | 'export';
