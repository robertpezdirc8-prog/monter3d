// Mera3D Pro - Type Definitions

export interface Project {
  id: string;
  name: string;
  objectType: ObjectType;
  createdAt: Date;
  updatedAt: Date;
  /**
   * FAZA 7 (P0): fotografije se hranijo izključno v samostojnem IndexedDB shrambi
   * (`photos`), da se podatki ne podvajajo. Polje ostaja zaradi združljivosti s
   * starimi zapisi; ob nalaganju se vsebina preseli in počisti.
   */
  photos: Photo[];
  measurements: Measurement[];
  fencePlan?: FencePlan;
  /** FAZA 11: načrt deskne ograje (če je izbrana deskna konstrukcija). */
  boardPlan?: BoardFencePlan;
  stairsPlan?: StairsPlan;
  terrainPlan?: TerrainPlan;
  materials: MaterialSelection;
  estimate?: CostEstimate;
  /** FAZA 7 (P0): vse nastavitve delovnega toka, da se ob nalaganju obnovijo. */
  settings?: ProjectSettings;
  status: ProjectStatus;
}

/** Konfiguracija izračuna ograje (mere v metrih). */
export interface FenceConfig {
  panelWidth: number;
  panelHeight: number;
  postWidth: number;
  maxGap: number;
  mountingStyle: 'level' | 'stepped' | 'mixed';
  slopeThreshold: number;
  /** FAZA 8 (P2): ID Roksal profila — omogoča preverjanje tehničnih pravil. */
  profileId?: string;
  /**
   * FAZA 11: način konstrukcije ograje.
   * `panel` = panelna ograja (paneli + stebri), `board` = deskna ograja iz kataloga
   * (deske + stebri + letve). Oba modela sta povezana z istim predračunom.
   */
  constructionType?: 'panel' | 'board';
  /** FAZA 11: razmik med deskami v mm (za deskno konstrukcijo). */
  boardSpacing?: number;
  /** FAZA 11: orientacija desk (pri profilih, ki dovolijo obe). */
  orientation?: 'vertical' | 'horizontal';
}

/** Konfiguracija izračuna stopnic (mere v metrih). */
export interface StairsConfig {
  numSteps: number;
  totalRise: number;
  totalRun: number;
  handrailHeight: number;
}

/**
 * FAZA 8 (P1): segment ograje — dolžina + smer (azimut) + morebitni dvig.
 * Azimut je v stopinjah: 0° = +X, 90° = +Y. Več segmentov omogoča kote
 * (L-oblike) in terenske dvige, kar prej ni bilo mogoče modelirati.
 */
export interface FenceSegmentInput {
  /** ID meritve, iz katere je segment nastal. */
  id: string;
  /** Dolžina segmenta v metrih. */
  length: number;
  /** Azimut segmenta v stopinjah (0° = +X, 90° = +Y). */
  bearingDeg?: number;
  /** Višinska razlika na začetku segmenta (m). */
  heightChange?: number;
}

/**
 * FAZA 11: načrt deskne ograje (deske + stebri + letve) iz katalogovnega profila.
 */
export interface BoardFencePlan {
  constructionType: 'board';
  profileId: string;
  profileName: string;
  /** Skupna dolžina ograje (m). */
  totalLength: number;
  /** Višina ograje (m). */
  fenceHeight: number;
  /** Število desk (z odpadom). */
  boards: number;
  /** Število stebrov. */
  posts: number;
  /** Število vodoravnih nosilcev (letev). */
  beams: number;
  /** Potrebna dolžina desk (m). */
  boardLength: number;
  /** Razmik med stebri (m). */
  postSpacing: number;
  /** Razmik med nosilci (m). */
  beamSpacing: number;
  /** Ali profil zahteva aluminijasto cev. */
  requiresAluminumTube: boolean;
  /** Dolžina ALU cevi (m). */
  aluminumTubeLength: number;
  errors: string[];
  warnings: string[];
}

/** Cene materialov za predračun (EUR). */
export interface MaterialPrices {
  panelPricePerM2: number;
  postPriceEach: number;
  railPricePerM: number;
  fastenerPriceEach: number;
  endCapPriceEach: number;
  /** FAZA 11: cena desk (€/m) — deskna konstrukcija. */
  boardPricePerM: number;
  /** FAZA 11: cena aluminijaste cevi (€/m). */
  aluTubePricePerM: number;
}

/** Nastavitve projekta, ki preživijo osvežitev strani. */
export interface ProjectSettings {
  pixelToMeter: number | null;
  fenceConfig: FenceConfig;
  stairsConfig: StairsConfig;
  laborRate: number;
  laborHours: number;
  taxRate: number;
  capturedSteps: string[];
  /** FAZA 8 (P1): segmenti ograje (koti in dvigi) po meritvah. */
  fenceSegments: FenceSegmentInput[];
  /** FAZA 8 (P1): cene materialov (neposredno uporabljene v predračunu). */
  materialPrices: MaterialPrices;
}

export type ObjectType = 'fence' | 'stairs' | 'facade' | 'terrain' | 'combined';
export type ProjectStatus = 'capture' | 'processing' | 'measuring' | 'planning' | 'complete';

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
  /**
   * FAZA 7 (P0): referenčna meritev (kalibracija merila) ni del objekta in se
   * NE sme šteti v dolžino ograje / količine / predračun.
   */
  isScaleReference?: boolean;
  /**
   * FAZA 17: meritev je dokumentacijska — uporabnik jo je izključil iz
   * načrta in predračuna (npr. posnetek za dokumentacijo, ne za dolžino).
   */
  excludedFromPlan?: boolean;
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
