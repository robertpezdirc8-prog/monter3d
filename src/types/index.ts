// Mera3D Pro - Type Definitions

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
  status: ProjectStatus;
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
  panelWidth: number;
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
  totalPosts: number;
  totalRails: number;
  totalFasteners: number;
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
