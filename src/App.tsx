import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react';
import type {
  Project, Photo, Measurement, WorkflowStep, ObjectType,
  FencePlan, StairsPlan, CostEstimate, ImageQuality, FeaturePoint,
  FenceConfig, StairsConfig, ProjectSettings, FenceSegmentInput, MaterialPrices, BoardFencePlan,
  PhotoAnnotation
} from './types';
import { assessImageQuality, harrisCornerDetection, toGrayscale, houghLineDetection } from './utils/cv';
import { calculateStairsPlan, buildCostEstimate, exportMeasurementsCSV, selectFenceLengthMeasurements } from './utils/geometry';
import { generatePDFReport } from './utils/pdfExport';
import { v4 as uuidv4 } from 'uuid';
/**
 * FAZA 30: razvojni/testni prikazi se naložijo šele ob potrebi (lazy),
 * zato začetni paket za monterja ostane manjši.
 */
const MathTestRunner = lazy(() =>
  import('./components/MathTestRunner').then(m => ({ default: m.MathTestRunner }))
);
const MeasurementAccuracyTests = lazy(() =>
  import('./components/MeasurementAccuracyTests').then(m => ({ default: m.MeasurementAccuracyTests }))
);

import { FenceVisualization } from './components/FenceVisualization';
import { FeatureMatchingView } from './components/FeatureMatching';
import { CameraCapture } from './components/CameraCapture';
import { MeasurementOverlay } from './components/MeasurementOverlay';
import { PhotoMatchingView, type PhotoPairMatching } from './components/PhotoMatchingView';
import { InstallPrompt } from './components/InstallPrompt';
import { PhotoSheetView } from './components/PhotoSheetView';
import { PhotoAnnotator } from './components/PhotoAnnotator';
import { UndoSnackbar } from './components/UndoSnackbar';
import { FenceVisualizer } from './components/FenceVisualizer';
import { RoksalGalleryView } from './components/RoksalGalleryView';
import { FenceConfigurator } from './components/FenceConfigurator';
import { NewProjectView } from './components/steps/NewProjectView';
import { CaptureView } from './components/steps/CaptureView';
import { QualityCheckView } from './components/steps/QualityCheckView';
import { ScaleView } from './components/steps/ScaleView';
import { MeasurementsView } from './components/steps/MeasurementsView';
import { MaterialView } from './components/steps/MaterialView';
import { QuantityView } from './components/steps/QuantityView';
import { EstimateView } from './components/steps/EstimateView';
import { ExportView } from './components/steps/ExportView';
import { HistoryView } from './components/steps/HistoryView';
import { getObjectTypeLabel } from './utils/labels';
import TradeMenu from './components/TradeMenu';
import TradeCapture from './components/TradeCapture';
import type { TradeId } from './utils/cameraSDK';
import { saveProject, getProject, getAllProjects, savePhoto, updatePhoto, getPhotosByProject, setCurrentProjectId, getCurrentProjectId, deleteProject, deletePhoto, deletePhotosByProject, loadProjectWithPhotos, addActivity, getActivities } from './utils/storage';
import type { ActivityEntry, ActivityType } from './utils/activityLog';
import {
  DEFAULT_FENCE_CONFIG,
  DEFAULT_STAIRS_CONFIG,
  DEFAULT_SETTINGS,
  DEFAULT_MATERIAL_PRICES,
  normalizeSettings,
  snapshotProjectState,
  applySnapshotToProject,
  stateSignature,
  emptySnapshot,
  type ProjectStateSnapshot,
} from './utils/projectState';
import { calculateFenceCalculation } from './utils/fenceCalculation';
import { normalizeUnit, fromUnit, type LengthUnit } from './utils/units';
import { buildShareDocument, estimateShareSizeMB } from './utils/shareExport';
import { getProfileById } from './data/roksalCatalog';
import { createBackup, restoreBackup, createWorkspaceBackup, restoreWorkspaceBackup, parseBackup, parseWorkspaceBackup } from './utils/backup';
import { downloadFile } from './utils/download';

const STATUS_TO_STEP: Record<string, WorkflowStep> = {
  capture: 'capture',
  processing: 'quality_check',
  measuring: 'scale_verification',
  planning: 'material_selection',
  complete: 'export',
};


function App() {
  const [showTests, setShowTests] = useState(() => window.location.hash === '#tests');
  // Kamera za monterje (brez AI): #trade = meni obrti, #capture/<obrt> = voden zajem
  const [tradeRoute, setTradeRoute] = useState<{ menu: boolean; capture: TradeId | null }>(() => {
    const h = window.location.hash;
    if (h.startsWith('#capture/')) {
      const id = h.slice('#capture/'.length) as TradeId;
      return { menu: false, capture: id };
    }
    return { menu: h === '#trade', capture: null };
  });
  useEffect(() => {
    const handler = () => {
      setShowTests(window.location.hash === '#tests');
      const h = window.location.hash;
      if (h.startsWith('#capture/')) {
        setTradeRoute({ menu: false, capture: h.slice('#capture/'.length) as TradeId });
      } else {
        setTradeRoute({ menu: h === '#trade', capture: null });
      }
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('new_project');
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [fencePlan, setFencePlan] = useState<FencePlan | null>(null);
  // FAZA 11: načrt deskne ograje (alternativa panelni konstrukciji).
  const [boardPlan, setBoardPlan] = useState<BoardFencePlan | null>(null);
  const [stairsPlan, setStairsPlan] = useState<StairsPlan | null>(null);
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [measuringMode, setMeasuringMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<{x: number; y: number}[]>([]);
  const [referenceLength, setReferenceLength] = useState<string>('');
  const [pixelToMeter, setPixelToMeter] = useState<number | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [fenceConfig, setFenceConfig] = useState<FenceConfig>(DEFAULT_FENCE_CONFIG);
  const [stairsConfig, setStairsConfig] = useState<StairsConfig>(DEFAULT_STAIRS_CONFIG);
  const [laborRate, setLaborRate] = useState(DEFAULT_SETTINGS.laborRate);
  const [laborHours, setLaborHours] = useState(DEFAULT_SETTINGS.laborHours);
  const [taxRate, setTaxRate] = useState(DEFAULT_SETTINGS.taxRate);
  // FAZA 8 (P1): segmenti ograje (azimut + dvig) in cene materialov
  const [fenceSegments, setFenceSegments] = useState<FenceSegmentInput[]>([]);
  const [materialPrices, setMaterialPrices] = useState<MaterialPrices>(DEFAULT_MATERIAL_PRICES);
  // FAZA 31: enota vnosa in prikaza dolžin (m / cm / mm)
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>('m');
  const [vizStartPoint, setVizStartPoint] = useState<{x: number; y: number} | null>(null);
  const [vizEndPoint, setVizEndPoint] = useState<{x: number; y: number} | null>(null);
  const [vizFenceHeight, setVizFenceHeight] = useState(1.5);
  const [vizNumBoards, setVizNumBoards] = useState(12);
  const [vizColor, setVizColor] = useState('#2d3436');
  const [comparePhoto, setComparePhoto] = useState<Photo | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showAccuracyTests, setShowAccuracyTests] = useState(false);
  const [capturedSteps, setCapturedSteps] = useState<string[]>([]);
  const [currentCaptureStep, setCurrentCaptureStep] = useState<string | null>(null);
  const [photoMatchings, setPhotoMatchings] = useState<PhotoPairMatching[]>([]);
  // FAZA 8 (P1): opozorila o shrambi (npr. polna kvota) — prikazana kot pasica,
  // ne kot blokirajoč alert, da uporabnik ne izgubi dela.
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [showFenceVisualizer, setShowFenceVisualizer] = useState(false);
  const [showRoksalGallery, setShowRoksalGallery] = useState(false);
  const [showFenceConfigurator, setShowFenceConfigurator] = useState(false);
  // FAZA 18: dokumentacijska lista (kontaktna lista fotografij) za stranko
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);
  // FAZA 19: risanje označb (skic) čez fotografijo
  const [annotatingPhotoId, setAnnotatingPhotoId] = useState<string | null>(null);
  // FAZA 24: zgodovina razveljivih akcij (več korakov nazaj)
  const [undoStack, setUndoStack] = useState<{ message: string; run: () => void }[]>([]);
  // FAZA 27: dnevnik opravljenih dejanj
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const pushUndo = useCallback((message: string, run: () => void) => {
    setUndoStack(prev => [...prev.slice(-9), { message, run }]);
  }, []);

  const handleUndo = useCallback(() => {
    setUndoStack(prev => {
      const zadnja = prev[prev.length - 1];
      if (!zadnja) return prev;
      zadnja.run();
      return prev.slice(0, -1);
    });
  }, []);

  const handleDismissUndo = useCallback(() => {
    setUndoStack(prev => prev.slice(0, -1));
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // FAZA 7 (P0): zadnje shranjeno stanje prepreči neskončno pisanje v IndexedDB.
  const currentProjectRef = useRef<Project | null>(null);
  const lastSavedSignature = useRef<string | null>(null);
  // FAZA 10: trenutni korak, da nalaganje projekta uporabnika ne vrže nazaj na
  // korak, v katerega je sam preklopil (npr. med nalaganjem fotografij).
  const currentStepRef = useRef<WorkflowStep>('new_project');

  useEffect(() => {
    currentProjectRef.current = currentProject;
  }, [currentProject]);

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  /**
   * FAZA 7 (P0): naloži projekt skupaj s CELOTNIM stanjem (meritve, načrti,
   * predračun, merilo, konfiguracije) — uporabljeno ob zagonu in ob izbiri projekta.
   */
  /**
   * FAZA 27: zabeleži dogodek v dnevnik projekta.
   */
  const logActivity = useCallback((type: ActivityType, message: string, meta?: Record<string, string | number | boolean>) => {
    const projectId = currentProjectRef.current?.id;
    if (!projectId) return;
    const entry: ActivityEntry = {
      id: uuidv4(),
      projectId,
      type,
      message,
      meta,
      timestamp: new Date(),
    };
    setActivity(prev => [entry, ...prev]);
    void addActivity(entry).catch(err => console.error('Failed to log activity:', err));
  }, []);

  // Osveži dnevnik ob odprtju projekta
  const refreshActivity = useCallback(async (projectId: string) => {
    setActivityLoading(true);
    try {
      setActivity(await getActivities(projectId));
    } catch (err) {
      console.error('Failed to load activity:', err);
      setActivity([]);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  const openProject = useCallback(async (project: Project) => {
    // FAZA 7 (P0): fotografije se naložijo iz ločene shrambe, stari podvojeni
    // zapisi se ob tem enkrat preselijo in počistijo.
    const { project: projectToUse, photos: photosToUse } = await loadProjectWithPhotos(project);

    const snapshot = snapshotProjectState(projectToUse);
    currentProjectRef.current = projectToUse;
    lastSavedSignature.current = stateSignature(snapshot);

    setCurrentProject(projectToUse);
    setPhotos(photosToUse);
    setSelectedPhoto(photosToUse[0] ?? null);
    setMeasurements(snapshot.measurements);
    setFencePlan(snapshot.fencePlan);
    setBoardPlan(snapshot.boardPlan);
    setStairsPlan(snapshot.stairsPlan);
    setEstimate(snapshot.estimate);
    setPixelToMeter(snapshot.settings.pixelToMeter);
    setFenceConfig(snapshot.settings.fenceConfig);
    setStairsConfig(snapshot.settings.stairsConfig);
    setLaborRate(snapshot.settings.laborRate);
    setLaborHours(snapshot.settings.laborHours);
    setTaxRate(snapshot.settings.taxRate);
    setCapturedSteps(snapshot.settings.capturedSteps);
    setFenceSegments(snapshot.settings.fenceSegments);
    setMaterialPrices(snapshot.settings.materialPrices);
    setLengthUnit(normalizeUnit(snapshot.settings.lengthUnit));
    setMeasurePoints([]);
    setMeasuringMode(false);
    setComparePhoto(null);
    setPhotoMatchings([]);
    setReferenceLength('');
    setVizStartPoint(null);
    setVizEndPoint(null);
    // Samodejni skok na korak projekta samo, če uporabnik še ni preklopil koraka.
    if (currentStepRef.current === 'new_project') {
      setCurrentStep(STATUS_TO_STEP[projectToUse.status] ?? 'capture');
    }
    setCurrentProjectId(projectToUse.id);
    // FAZA 27: naloži dnevnik opravljenih dejanj
    void refreshActivity(projectToUse.id);
  }, [refreshActivity]);

  // Create new project
  const createProject = useCallback((name: string, type: ObjectType) => {
    const project: Project = {
      id: uuidv4(),
      name,
      objectType: type,
      createdAt: new Date(),
      updatedAt: new Date(),
      photos: [],
      measurements: [],
      materials: {
        productLine: 'Roksal Standard',
        color: 'Antracit RAL 7016',
        finish: 'Prašno barvan',
        panelMaterial: 'Aluminij',
        postMaterial: 'Aluminij',
        fastenerType: 'A2 inox'
      },
      settings: normalizeSettings(DEFAULT_SETTINGS),
      status: 'capture'
    };

    // Nov projekt se začne s praznim stanjem — privzete nastavitve veljajo tudi v UI.
    setMeasurements([]);
    setFencePlan(null);
    setBoardPlan(null);
    setStairsPlan(null);
    setEstimate(null);
    setPixelToMeter(null);
    setFenceConfig(DEFAULT_FENCE_CONFIG);
    setStairsConfig(DEFAULT_STAIRS_CONFIG);
    setLaborRate(DEFAULT_SETTINGS.laborRate);
    setLaborHours(DEFAULT_SETTINGS.laborHours);
    setTaxRate(DEFAULT_SETTINGS.taxRate);
    setCapturedSteps([]);
    setFenceSegments([]);
    setMaterialPrices(DEFAULT_MATERIAL_PRICES);
    setPhotos([]);
    setSelectedPhoto(null);
    setMeasurePoints([]);
    setMeasuringMode(false);
    setComparePhoto(null);
    setPhotoMatchings([]);
    setReferenceLength('');
    setVizStartPoint(null);
    setVizEndPoint(null);

    currentProjectRef.current = project;
    lastSavedSignature.current = stateSignature(emptySnapshot());
    setCurrentProject(project);
    setProjects(prev => [...prev, project]);
    setCurrentStep('capture');

    // Save to IndexedDB
    saveProject(project).catch(err => console.error('Failed to save project:', err));
    setCurrentProjectId(project.id);

    // FAZA 27: zabeleži ustvaritev projekta
    const entry: ActivityEntry = {
      id: uuidv4(),
      projectId: project.id,
      type: 'project_created',
      message: 'Projekt »' + project.name + '« je ustvarjen',
      timestamp: new Date(),
    };
    setActivity(prev => [entry, ...prev]);
    void addActivity(entry).catch(err => console.error('Failed to log activity:', err));
  }, []);

  /**
   * FAZA 13: konfigurator (napredna orodje) prenese izbiro v projekt, kjer se
   * uporabi za izračun predračuna — prej je bil to slepa ulica.
   */
  const handleApplyFenceConfig = useCallback((result: {
    profileId: string;
    fenceHeightM: number;
    boardSpacingMm: number;
    orientation: 'vertical' | 'horizontal';
  }) => {
    setFenceConfig(prev => ({
      ...prev,
      constructionType: 'board',
      profileId: result.profileId,
      panelHeight: result.fenceHeightM,
      boardSpacing: result.boardSpacingMm,
      orientation: result.orientation,
    }));
    setShowFenceConfigurator(false);
  }, []);

  // Odpri obstoječi projekt s klikom na seznam
  const handleOpenProject = useCallback(async (id: string) => {
    try {
      const project = await getProject(id);
      if (project) await openProject(project);
    } catch (err) {
      console.error('Failed to open project:', err);
      alert('Projekta ni bilo mogoče odpreti.');
    }
  }, [openProject]);

  // Izbriši projekt skupaj z njegovimi fotografijami (brez sirot v IndexedDB)
  const handleDeleteProject = useCallback(async (id: string) => {
    try {
      // Pred brisanjem shranimo projekt in njegove fotografije (za razveljavo).
      const izbrisanProjekt = projects.find(p => p.id === id);
      const izbrisaneFotografije = await getPhotosByProject(id);

      await deletePhotosByProject(id);
      await deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));

      // FAZA 22: ponudi razveljavo
      if (izbrisanProjekt) {
        pushUndo(`Projekt "${izbrisanProjekt.name}" je izbrisan.`,
          () => {
            void saveProject(izbrisanProjekt).catch(err => console.error('Failed to restore project:', err));
            for (const photo of izbrisaneFotografije) {
              void savePhoto({ ...photo, projectId: id }).catch(err => console.error('Failed to restore photo:', err));
            }
            setProjects(prev => [...prev, izbrisanProjekt]);
        });
      }

      if (currentProjectRef.current?.id === id) {
        currentProjectRef.current = null;
        lastSavedSignature.current = null;
        setCurrentProject(null);
        setPhotos([]);
        setSelectedPhoto(null);
        setMeasurements([]);
        setFencePlan(null);
        setBoardPlan(null);
        setStairsPlan(null);
        setEstimate(null);
        setPixelToMeter(null);
        setCapturedSteps([]);
        setCurrentStep('new_project');
        setCurrentProjectId(null);
      }
    } catch (err) {
      console.error('Failed to delete project:', err);
      alert('Projekta ni bilo mogoče izbrisati.');
    }
  }, [projects, pushUndo]);

  /**
   * FAZA 7 (P0): samodejno shrani celotno stanje projekta. Prej so se meritve,
   * načrti in predračun ob osvežitvi strani izgubili.
   */
  useEffect(() => {
    const project = currentProjectRef.current;
    if (!project) return;

    const settings: ProjectSettings = {
      pixelToMeter,
      fenceConfig,
      stairsConfig,
      laborRate,
      laborHours,
      taxRate,
      capturedSteps,
      fenceSegments,
      materialPrices,
      lengthUnit,
    };
    const snapshot: ProjectStateSnapshot = {
      measurements,
      fencePlan,
      boardPlan,
      stairsPlan,
      estimate,
      settings,
    };

    const signature = stateSignature(snapshot);
    if (signature === lastSavedSignature.current) return;
    lastSavedSignature.current = signature;

    const updated = applySnapshotToProject(project, snapshot);
    currentProjectRef.current = updated;
    setCurrentProject(updated);
    saveProject(updated)
      .then(() => setStorageWarning(null))
      .catch(err => {
        console.error('Failed to save project state:', err);
        setStorageWarning('Projekta ni bilo mogoče shraniti. Meritve so v tej seji še vidne — izvozi varnostno kopijo.');
      });
  }, [measurements, fencePlan, boardPlan, stairsPlan, estimate, pixelToMeter, fenceConfig, stairsConfig, laborRate, laborHours, taxRate, capturedSteps, fenceSegments, materialPrices, lengthUnit, pushUndo]);

  // Load projects from IndexedDB on mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const savedProjects = await getAllProjects();
        if (savedProjects.length === 0) return;
        setProjects(savedProjects);

        // Restore last active project
        const lastProjectId = getCurrentProjectId();
        if (!lastProjectId) return;
        const lastProject = await getProject(lastProjectId);
        if (lastProject) await openProject(lastProject);
      } catch (err) {
        console.error('Failed to load projects:', err);
      }
    };

    loadProjects();
  }, [openProject, pushUndo]);

  /**
   * FAZA 8 (P1): shranjevanje fotografije z obravnavo napak (npr. polna kvota
   * IndexedDB). Fotografija ostane v stanju aplikacije, uporabnik pa dobi
   * razumljivo opozorilo, ne okna z napako.
   */
  const persistPhoto = useCallback((photo: Photo) => {
    const projectId = currentProjectRef.current?.id;
    if (!projectId) return;
    // FAZA 27: zabeleži dodano fotografijo
    logActivity('photo_added', 'Dodana fotografija (kakovost ' + Math.round(photo.quality.overallScore * 100) + ' %)');
    savePhoto({ ...photo, projectId }).catch(err => {
      console.error('Failed to save photo:', err);
      const quotaExceeded = err && (err.name === 'QuotaExceededError' || err.code === 22);
      setStorageWarning(quotaExceeded
        ? 'Shramba v napravi je polna — fotografija ni bila shranjena. Izvozi varnostno kopijo ali izbriši star projekt.'
        : 'Fotografija ni bila shranjena. Meritve in načrt so varno shranjeni.');
    });
  }, [logActivity]);

  // Handle photo capture/upload
  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const img = new Image();
        img.onload = () => {
          // Analyze image quality
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const quality = assessImageQuality(imageData);

          const photo: Photo = {
            id: uuidv4(),
            dataUrl,
            timestamp: new Date(),
            quality,
            coverage: 0,
            status: quality.overallScore > 0.4 ? 'analyzed' : 'rejected',
            rejectionReason: quality.overallScore <= 0.4 ? 'Nizka kakovost slike' : undefined,
            width: img.width,
            height: img.height
          };

          // Ensure dimensions are always set
          if (!photo.width || !photo.height) {
            console.warn('Photo dimensions missing, using image dimensions:', img.width, img.height);
            photo.width = img.width;
            photo.height = img.height;
          }

          setPhotos(prev => [...prev, photo]);
          if (!selectedPhoto) setSelectedPhoto(photo);

          // FAZA 7 (P0): fotografija se shrani SAMO v shrambo fotografij.
          // Prej se je ista slika (z dataUrl) zapisala še v projekt — dvojna poraba kvote.
          persistPhoto(photo);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  }, [selectedPhoto, persistPhoto]);

  // Handle camera capture
  const handleCameraCapture = useCallback((dataUrl: string, quality: ImageQuality, stepId?: string) => {
    const img = new Image();
    img.onload = () => {
      const photo: Photo = {
        id: uuidv4(),
        dataUrl,
        timestamp: new Date(),
        quality,
        coverage: 0,
        status: quality.overallScore > 0.4 ? 'analyzed' : 'rejected',
        rejectionReason: quality.overallScore <= 0.4 ? 'Nizka kakovost slike' : undefined,
        width: img.width,
        height: img.height
      };

      setPhotos(prev => [...prev, photo]);
      if (!selectedPhoto) setSelectedPhoto(photo);
      setShowCamera(false);
      
      // Mark step as captured if this is part of guided capture
      if (stepId) {
        setCapturedSteps(prev => [...prev, stepId]);
      }

      // FAZA 7 (P0): fotografija samo v shrambo fotografij (brez podvajanja v projektu).
      persistPhoto(photo);
    };
    img.src = dataUrl;
  }, [selectedPhoto, persistPhoto]);

  // Compute photo matchings
  const computePhotoMatchings = useCallback(async () => {
    if (photos.length < 2) {
      setPhotoMatchings([]);
      return;
    }

    try {
      const { computeAllMatchings } = await import('./utils/photoMatching');
      const matchings = await computeAllMatchings(photos);
      
      // Convert to format expected by PhotoMatchingView
      const viewMatchings: PhotoPairMatching[] = matchings.map(m => ({
        photo1: photos.find(p => p.id === m.photo1Id)!,
        photo2: photos.find(p => p.id === m.photo2Id)!,
        features1: m.features1,
        features2: m.features2,
        matches: m.matches,
        inliers: m.inliers,
        homography: m.homography,
        reprojError: m.reprojError,
        status: m.status,
        message: m.message,
        // Podatki za risanje povezav med značilnicami (prej niso bili posredovani,
        // zato je bil prikaz ujemanja prazen).
        features1Points: m.features1Points,
        features2Points: m.features2Points,
        inlierMatches: m.inlierMatches,
      }));
      
      setPhotoMatchings(viewMatchings);
    } catch (err) {
      console.error('Failed to compute matchings:', err);
      setPhotoMatchings([]);
    }
  }, [photos]);

  // Analyze selected photo for features
  const analyzePhoto = useCallback((photo: Photo) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 640;
      const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      const gray = toGrayscale(imageData);
      const features = harrisCornerDetection(gray, canvas.width, canvas.height);
      const lines = houghLineDetection(gray, canvas.width, canvas.height);

      // Store features in photo object for coverage calculation
      const featurePoints: FeaturePoint[] = features.map(f => ({
        x: f.point.x,
        y: f.point.y,
        response: f.response,
        scale: f.scale,
        angle: f.angle
      }));
      
      // Update photo with detected features
      setPhotos(prev => prev.map(p => 
        p.id === photo.id 
          ? { ...p, features: featurePoints, coverage: featurePoints.length }
          : p
      ));

      // Draw features on canvas
      if (canvasRef.current) {
        canvasRef.current.width = canvas.width;
        canvasRef.current.height = canvas.height;
        const displayCtx = canvasRef.current.getContext('2d')!;
        displayCtx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Draw feature points
        displayCtx.fillStyle = '#00ff88';
        features.forEach(f => {
          displayCtx.beginPath();
          displayCtx.arc(f.point.x, f.point.y, 3, 0, Math.PI * 2);
          displayCtx.fill();
        });

        // Draw detected lines
        displayCtx.strokeStyle = '#ff6600';
        displayCtx.lineWidth = 1;
        lines.slice(0, 10).forEach(line => {
          const cos = Math.cos(line.angle * Math.PI / 180);
          const sin = Math.sin(line.angle * Math.PI / 180);
          const x0 = cos * line.rho;
          const y0 = sin * line.rho;
          displayCtx.beginPath();
          displayCtx.moveTo(x0 - 1000 * sin, y0 + 1000 * cos);
          displayCtx.lineTo(x0 + 1000 * sin, y0 - 1000 * cos);
          displayCtx.stroke();
        });

        // Info overlay
        displayCtx.fillStyle = 'rgba(0,0,0,0.7)';
        displayCtx.fillRect(5, 5, 200, 80);
        displayCtx.fillStyle = '#fff';
        displayCtx.font = '12px monospace';
        displayCtx.fillText(`Značilnice: ${features.length}`, 10, 22);
        displayCtx.fillText(`Linije: ${lines.length}`, 10, 38);
        displayCtx.fillText(`Kakovost: ${(photo.quality.overallScore * 100).toFixed(0)}%`, 10, 54);
        displayCtx.fillText(`Ostrina: ${(photo.quality.sharpness * 100).toFixed(0)}%`, 10, 70);
      }
    };
    img.src = photo.dataUrl;
  }, []);

  // Handle measurement on image
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!measuringMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMeasurePoints(prev => {
      const newPoints = [...prev, { x, y }];
      if (newPoints.length === 2) {
        // Calculate distance
        const dx = newPoints[1].x - newPoints[0].x;
        const dy = newPoints[1].y - newPoints[0].y;
        const pixelDist = Math.sqrt(dx * dx + dy * dy);
        
        // Draw measurement line
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d')!;
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(newPoints[0].x, newPoints[0].y);
          ctx.lineTo(newPoints[1].x, newPoints[1].y);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Draw points
          ctx.fillStyle = '#ff0000';
          newPoints.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.fill();
          });
          
          // Label
          const midX = (newPoints[0].x + newPoints[1].x) / 2;
          const midY = (newPoints[0].y + newPoints[1].y) / 2;
          const metricDist = pixelToMeter ? (pixelDist * pixelToMeter).toFixed(3) : `${pixelDist.toFixed(0)} px`;
          ctx.fillStyle = '#00ff00';
          ctx.font = 'bold 14px sans-serif';
          ctx.fillText(`${metricDist}${pixelToMeter ? ' m' : ''}`, midX + 5, midY - 5);
        }
        
        // Create measurement record
        const measurement: Measurement = {
          id: uuidv4(),
          type: 'length',
          value: pixelToMeter ? pixelDist * pixelToMeter : pixelDist,
          unit: pixelToMeter ? 'm' : 'px',
          source: 'manual',
          scaleSource: pixelToMeter ? 'manual_reference' : 'unknown',
          status: pixelToMeter ? 'verified' : 'warning',
          uncertainty: pixelToMeter ? 3 : 20,
          confidence: pixelToMeter ? 0.85 : 0.3,
          photoIds: selectedPhoto ? [selectedPhoto.id] : [],
          algorithm: 'pixel_distance',
          createdAt: new Date()
        };
        setMeasurements(prev => [...prev, measurement]);
        logActivity('measurement_added', 'Meritev ' + measurement.value.toFixed(2) + ' ' + measurement.unit);
        return [];
      }
      return newPoints;
    });
  }, [measuringMode, pixelToMeter, selectedPhoto, logActivity]);

  /**
   * FAZA 10 (P0): klik na platno v koraku »Merilo« NE sme ustvarjati meritve.
   *
   * Prej je ScaleView uporabljal isti handler kot korak »Meritve«: ob drugem
   * kliku je bila ustvarjena meritev in točke so se ponastavile — zato se je
   * vnos referenčne dolžine prikazal šele nikoli in kalibracija merila v UI-ju
   * ni bila mogoča (vse meritve so ostale v slikovnih točkah).
   */
  const handleReferenceClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!measuringMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMeasurePoints(prev => {
      const next = [...prev, { x, y }];
      return next.length > 2 ? next.slice(-2) : next;
    });
  }, [measuringMode]);

  /**
   * FAZA 14: ročni vnos dolžine (m). Uporabno na terenu, ko dolžina ni izmerjena
   * na fotografiji (npr. po meritvi z metrom) — vrednost gre v načrt in predračun
   * enako kot meritev na sliki.
   */
  const handleAddManualLength = useCallback((value: number) => {
    // FAZA 31: uporabnik vpiše v izbrani enoti, shranimo v metre.
    const metres = fromUnit(value, lengthUnit);
    if (!isFinite(metres) || metres <= 0) return;
    const measurement: Measurement = {
      id: uuidv4(),
      type: 'length',
      value: metres,
      unit: 'm',
      source: 'manual',
      scaleSource: 'manual_reference',
      status: 'verified',
      uncertainty: 2,
      confidence: 0.9,
      photoIds: [],
      algorithm: 'manual_entry',
      notes: 'Ročno vnesena dolžina',
      createdAt: new Date(),
      verifiedAt: new Date(),
    };
    setMeasurements(prev => [...prev, measurement]);
    logActivity('measurement_added', 'Ročno vnesena dolžina ' + metres.toFixed(2) + ' m');
  }, [logActivity, lengthUnit]);

  // Set reference scale
  const setScale = useCallback(() => {
    if (measurePoints.length !== 2 || !referenceLength) return;
    const dx = measurePoints[1].x - measurePoints[0].x;
    const dy = measurePoints[1].y - measurePoints[0].y;
    const pixelDist = Math.sqrt(dx * dx + dy * dy);
    const meters = parseFloat(referenceLength);
    if (meters > 0 && pixelDist > 0) {
      setPixelToMeter(meters / pixelDist);
      
      // Create calibration measurement
      const calibMeasurement: Measurement = {
        id: uuidv4(),
        type: 'length',
        value: meters,
        unit: 'm',
        // FAZA 7 (P0): referenca je merilo fotografije, NE del objekta.
        source: 'reference_scale',
        scaleSource: 'manual_reference',
        isScaleReference: true,
        status: 'verified',
        uncertainty: 2,
        confidence: 0.9,
        photoIds: selectedPhoto ? [selectedPhoto.id] : [],
        algorithm: 'reference_calibration',
        calibration: {
          method: 'manual_reference',
          referenceLength: meters,
          pixelToMeterRatio: meters / pixelDist
        },
        createdAt: new Date(),
        verifiedAt: new Date()
      };
      setMeasurements(prev => [...prev, calibMeasurement]);
      setMeasurePoints([]);
      logActivity('scale_calibrated', 'Merilo kalibrirano: ' + meters.toFixed(2) + ' m');

      // FAZA 10 (P2): meritve, narejene PRED kalibracijo, so bile v slikovnih točkah.
      // Zdaj se ob potrditvi merila pretvorijo v metre — uporabnik ne mora
      // znova meriti, kar je bilo prej izguba dela na terenu.
      const ratio = meters / pixelDist;
      setMeasurements(prev => prev.map(m => {
        if (m.unit !== 'px' || !isFinite(m.value)) return m;
        return {
          ...m,
          value: m.value * ratio,
          unit: 'm',
          scaleSource: 'manual_reference',
          status: 'verified',
          uncertainty: 3,
          confidence: 0.85,
          verifiedAt: new Date(),
        };
      }));
    }
  }, [measurePoints, referenceLength, selectedPhoto, logActivity]);

  // FAZA 19: fotografija, ki jo trenutno označujemo
  const annotatingPhoto = annotatingPhotoId ? photos.find(p => p.id === annotatingPhotoId) : undefined;

  // Calculate fence plan
  // FAZA 17: measurementsOverride omogoča preračun po brisanju meritve, še
  // preden se novo stanje renderira.
  const calculateFence = useCallback((measurementsOverride?: Measurement[]) => {
    // FAZA 26: enoten izracun (panelna in deskna konstrukcija) v enem modulu.
    const source = Array.isArray(measurementsOverride) ? measurementsOverride : measurements;
    const validMeasurements = selectFenceLengthMeasurements(source);

    if (validMeasurements.length < 1) {
      setFencePlan(null);
      setBoardPlan(null);
      setEstimate(null);
      return;
    }

    // Segmenti: dolzina iz meritve + azimut/dvig iz urejevalnika segmentov.
    const overrides = new Map(fenceSegments.map(s => [s.id, s]));
    const segments = validMeasurements.map(m => {
      const o = overrides.get(m.id);
      return {
        id: m.id,
        length: m.value,
        bearingDeg: o?.bearingDeg ?? 0,
        heightChange: o?.heightChange ?? 0,
      };
    });

    const profile = fenceConfig.profileId ? getProfileById(fenceConfig.profileId) : undefined;
    const result = calculateFenceCalculation({
      segments,
      config: fenceConfig,
      profile,
      prices: materialPrices,
    });

    setFencePlan(result.plan);
    setBoardPlan(result.boardPlan);
    logActivity(
      'plan_calculated',
      'Izračunana ograja (' + (result.constructionType === 'board' ? 'deskna' : 'panelna') + '): ' +
        result.totalLength.toFixed(2) + ' m'
    );

    if (result.errors.length > 0 || result.materials.length === 0) {
      setEstimate(null);
      return;
    }

    setEstimate(buildCostEstimate(
      result.materials,
      { hours: laborHours, rate: laborRate },
      taxRate / 100,
      // FAZA 7 (P0): referencna kalibracija ni meritev objekta in ne sodi v statistiko
      // predracuna; neveljavne/opozorilne meritve pa morajo ostati vidne.
      source
        .filter(m => m.isScaleReference !== true && m.source !== 'reference_scale' && m.algorithm !== 'reference_calibration')
        .map(m => ({ status: m.status, scaleSource: m.scaleSource }))
    ));
  }, [measurements, fenceConfig, laborHours, laborRate, taxRate, fenceSegments, materialPrices, logActivity]);

  /**
   * FAZA 17: brisanje meritve. Če je bil izračunan načrt, ga takoj preračunamo,
   * da v predračunu ne ostane izbrisana dolžina.
   */
  const handleDeleteMeasurement = useCallback((id: string) => {
    const izbrisana = measurements.find(m => m.id === id);
    if (!izbrisana) return;
    const segment = fenceSegments.find(s => s.id === id);
    const remaining = measurements.filter(m => m.id !== id);
    setMeasurements(remaining);
    setFenceSegments(prev => prev.filter(s => s.id !== id));
    if (fencePlan || boardPlan) {
      calculateFence(remaining);
    }
    // FAZA 22: ponudi razveljavo
    pushUndo('Meritev je izbrisana.',
      () => {
        setMeasurements(prev => [...prev, izbrisana]);
        if (segment) setFenceSegments(prev => [...prev, segment]);
        calculateFence([...remaining, izbrisana]);
    });
  }, [measurements, fenceSegments, fencePlan, boardPlan, calculateFence, pushUndo]);

  /**
   * FAZA 17: vklop/izklop meritve v načrtu (dokumentacijska meritev).
   */
  const handleToggleMeasurementExcluded = useCallback((id: string) => {
    const updated = measurements.map(m =>
      m.id === id ? { ...m, excludedFromPlan: !m.excludedFromPlan } : m
    );
    setMeasurements(updated);
    if (fencePlan || boardPlan) {
      calculateFence(updated);
    }
  }, [measurements, fencePlan, boardPlan, calculateFence]);

  /**
   * FAZA 17: brisanje fotografije iz projekta (npr. zamegljena ali nepotrebna).
   */
  const handleDeletePhoto = useCallback(async (photoId: string) => {
    const izbrisana = photos.find(p => p.id === photoId);
    if (!izbrisana) return;
    try {
      await deletePhoto(photoId);
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      setSelectedPhoto(prev => (prev?.id === photoId ? null : prev));
      // Meritve s to fotografijo ostanejo (so lahko pomembne), a uporabnik jih
      // lahko izključi iz načrta ali izbriše.
      // FAZA 22: ponudi razveljavo
      logActivity('photo_removed', 'Odstranjena fotografija');
      pushUndo('Fotografija je izbrisana.', () => {
        const projectId = currentProjectRef.current?.id;
        if (projectId) {
          void savePhoto({ ...izbrisana, projectId }).catch(err =>
            console.error('Failed to restore photo:', err)
          );
        }
        setPhotos(prev => [...prev, izbrisana]);
      });
    } catch (err) {
      console.error('Failed to delete photo:', err);
      setStorageWarning('Fotografije ni bilo mogoče izbrisati.');
    }
  }, [photos, pushUndo, logActivity]);

  /**
   * FAZA 19: shrani skico (označbe) na fotografijo — v stanju in v bazi.
   */
  const handleSaveAnnotation = useCallback(async (photoId: string, annotation: PhotoAnnotation) => {
    const photo = photos.find(p => p.id === photoId);
    if (!photo) return;
    const updated: Photo = { ...photo, annotation };
    setPhotos(prev => prev.map(p => (p.id === photoId ? updated : p)));
    setAnnotatingPhotoId(null);
    try {
      const projectId = currentProjectRef.current?.id;
      if (projectId) {
        await updatePhoto({ ...updated, projectId });
      }
    } catch (err) {
      console.error('Failed to save annotation:', err);
      setStorageWarning('Skice ni bilo mogoče shraniti v shrambo.');
    }
  }, [photos]);

  /**
   * FAZA 20: označi vlogo posnetka (pred / po / detajl) — omogoča primerjavo.
   */
  const handleSetPhotoRole = useCallback(async (photoId: string, role: Photo['role']) => {
    const photo = photos.find(p => p.id === photoId);
    if (!photo) return;
    const updated: Photo = { ...photo, role };
    setPhotos(prev => prev.map(p => (p.id === photoId ? updated : p)));
    try {
      const projectId = currentProjectRef.current?.id;
      if (projectId) await updatePhoto({ ...updated, projectId });
    } catch (err) {
      console.error('Failed to save photo role:', err);
      setStorageWarning('Oznake posnetka ni bilo mogoče shraniti.');
    }
  }, [photos]);

  // Calculate stairs
  const calculateStairs = useCallback(() => {
    // FAZA 1: neveljavni vhodi zdaj vržejo napako — prikažemo jo, ne tiho NaN-građimo načrt.
    try {
      const plan = calculateStairsPlan(
        stairsConfig.numSteps,
        stairsConfig.totalRise,
        stairsConfig.totalRun,
        stairsConfig.handrailHeight
      );
      setStairsPlan(plan);
    } catch (e) {
      setStairsPlan(null);
      alert(e instanceof Error ? e.message : 'Neveljaven vnos za stopnice.');
    }
  }, [stairsConfig]);

  // Export data
  const exportData = useCallback((format: 'csv' | 'json' | 'pdf') => {
    if (!currentProject) {
      alert('Ni izbranega projekta za izvoz.');
      return;
    }
    
    if (format === 'csv') {
      const data = measurements.map(m => ({
        id: m.id,
        type: m.type,
        value: m.value,
        unit: m.unit,
        status: m.status,
        uncertainty: m.uncertainty,
        source: m.source,
        algorithm: m.algorithm
      }));
      const csv = exportMeasurementsCSV(data);
      downloadFile(csv, 'mera3d_meritve.csv', 'text/csv');
      logActivity('export_created', 'Izvoz meritve (CSV)');
    } else if (format === 'json') {
      const exportObj = {
        project: currentProject,
        photos: photos.map(p => ({ id: p.id, timestamp: p.timestamp, quality: p.quality, status: p.status })),
        measurements,
        fencePlan,
        stairsPlan,
        estimate,
        exportedAt: new Date().toISOString()
      };
      downloadFile(JSON.stringify(exportObj, null, 2), 'mera3d_project.json', 'application/json');
    } else if (format === 'pdf') {
      // FAZA 7 (P0): fotografije niso več del zapisa projekta, zato jih za poročilo
      // (število fotografij) podamo iz stanja.
      generatePDFReport({ ...currentProject, photos }, measurements, fencePlan, stairsPlan, estimate, activity, lengthUnit);
    }
  }, [measurements, currentProject, photos, fencePlan, stairsPlan, estimate, activity, lengthUnit, logActivity]);

  /**
   * FAZA 7 (P0): varnostna kopija — JSON s projektom, stanjem IN fotografijami.
   * Običajni izvoz JSON ne vsebuje slik, zato projekta ni bilo mogoče obnoviti.
   */
  const handleExportBackup = useCallback(() => {
    if (!currentProject) {
      alert('Ni izbranega projekta za varnostno kopijo.');
      return;
    }
    try {
      const json = createBackup(currentProject, photos);
      const safeName = currentProject.name.replace(/[^\w-]+/g, '_').slice(0, 40) || 'projekt';
      downloadFile(json, `mera3d_kopija_${safeName}.json`, 'application/json');
      logActivity('backup_created', 'Izdelana varnostna kopija projekta');
    } catch (err) {
      console.error('Failed to create backup:', err);
      alert('Varnostne kopije ni bilo mogoče ustvariti.');
    }
  }, [currentProject, photos, logActivity]);

  /**
   * FAZA 32: deli dokumentacijo kot SAMOSTOJEN HTML dokument (brez strežnika) —
   * pisarna ga odpre v kateremkoli brskalniku, ne potrebuje aplikacije.
   */
  const handleShareDocumentation = useCallback(() => {
    if (!currentProject) {
      alert('Ni izbranega projekta za deljenje.');
      return;
    }
    try {
      const velikost = estimateShareSizeMB(photos);
      if (velikost > 25) {
        const potrdi = window.confirm(
          `Dokumentacija bo velika (~${velikost.toFixed(0)} MB zaradi fotografij). ` +
          `Kljub, da jo želiš poslati tako?`
        );
        if (!potrdi) return;
      }
      const html = buildShareDocument({
        project: currentProject,
        photos,
        measurements,
        fencePlan,
        boardPlan,
        estimate,
        lengthUnit,
      });
      const safeName = currentProject.name.replace(/[^\w-]+/g, '_').slice(0, 40) || 'projekt';
      downloadFile(html, `dokumentacija_${safeName}.html`, 'text/html;charset=utf-8');
      logActivity('export_created', 'Izdelana dokumentacija za deljenje (samostojen HTML)');
    } catch (err) {
      console.error('Failed to share documentation:', err);
      alert('Dokumentacije ni bilo mogoče ustvariti.');
    }
  }, [currentProject, photos, measurements, fencePlan, boardPlan, estimate, lengthUnit, logActivity]);

  /**
   * FAZA 13: varnostna kopija celotnega delovnega okolja (vsi projekti) —
   * za prenos na drugo napravo ali arhiviranje.
   */
  const handleExportWorkspaceBackup = useCallback(async () => {
    try {
      const allProjects = await getAllProjects();
      if (allProjects.length === 0) {
        alert('Ni projektov za varnostno kopijo.');
        return;
      }
      const photosByProject = new Map<string, Photo[]>();
      for (const p of allProjects) {
        photosByProject.set(p.id, await getPhotosByProject(p.id));
      }
      const json = createWorkspaceBackup(allProjects, photosByProject);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadFile(json, `mera3d_vse_projekti_${stamp}.json`, 'application/json');
    } catch (err) {
      console.error('Failed to create workspace backup:', err);
      alert('Varnostne kopije vseh projektov ni bilo mogoče ustvariti.');
    }
  }, []);



  /**
   * Uvoz varnostne kopije — podpira OBE obliki:
   *  - kopija enega projekta (projekt + fotografije),
   *  - kopija celotnega delovnega okolja (vsi projekti).
   */
  const handleImportBackup = useCallback(async (file: File) => {
    try {
      const text = await file.text();

      // 1) posamezni projekt
      const single = parseBackup(text);
      if (single.ok) {
        const result = await restoreBackup(text);
        const refreshed = await getAllProjects();
        setProjects(refreshed);
        const restored = await getProject(result.projectId);
        if (restored) await openProject(restored);
        return;
      }

      // 2) celotno delovno okolje
      const workspace = parseWorkspaceBackup(text);
      if (!workspace.ok) throw new Error(workspace.error);
      const result = await restoreWorkspaceBackup(text);
      const refreshed = await getAllProjects();
      setProjects(refreshed);
      setStorageWarning(`Obnovljenih ${result.projectIds.length} projektov (${result.photoCount} fotografij).`);
    } catch (err) {
      console.error('Failed to restore backup:', err);
      alert(err instanceof Error ? err.message : 'Varnostne kopije ni bilo mogoče obnoviti.');
    }
  }, [openProject]);

  // Workflow steps config
  const steps: { key: WorkflowStep; label: string; icon: string }[] = [
    { key: 'new_project', label: 'Nov projekt', icon: '📁' },
    { key: 'capture', label: 'Zajem', icon: '📷' },
    { key: 'quality_check', label: 'Kakovost', icon: '✅' },
    { key: 'scale_verification', label: 'Merilo', icon: '📏' },
    { key: 'measurements', label: 'Meritve', icon: '📐' },
    { key: 'material_selection', label: 'Materiali', icon: '🪵' },
    { key: 'visualization', label: 'Vizualizacija', icon: '🎨' },
    { key: 'quantity_calc', label: 'Količine', icon: '🔢' },
    { key: 'estimate', label: 'Predračun', icon: '💰' },
    { key: 'history', label: 'Zgodovina', icon: '🕘' },
    { key: 'export', label: 'Izvoz', icon: '📤' },
  ];

  // Show test runner if URL hash is #tests
  if (showTests) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <div className="p-4">
          <a href="#" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">← Nazaj na aplikacijo</a>
        </div>
        <Suspense fallback={<p className="text-sm text-slate-400 p-4">Nalaganje testnega prikaza…</p>}>
          <MathTestRunner />
        </Suspense>
      </div>
    );
  }

  // Kamera za monterje (brez AI modela) — meni obrti ali voden zajem
  if (tradeRoute.capture && ['ograje', 'keramika', 'fasade', 'krovstvo'].includes(tradeRoute.capture)) {
    return <TradeCapture trade={tradeRoute.capture} onBack={() => { window.location.hash = '#trade'; }} />;
  }
  if (tradeRoute.menu) {
    return <TradeMenu />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => {
            setShowCamera(false);
            setCurrentCaptureStep(null);
          }}
          stepId={currentCaptureStep || undefined}
        />
      )}

      {showFenceVisualizer && selectedPhoto && (
        <FenceVisualizer
          photo={selectedPhoto}
          onClose={() => setShowFenceVisualizer(false)}
        />
      )}

      {showRoksalGallery && (
        <RoksalGalleryView
          onClose={() => setShowRoksalGallery(false)}
        />
      )}

      {annotatingPhoto && (
        <PhotoAnnotator
          photo={annotatingPhoto}
          onSave={annotation => void handleSaveAnnotation(annotatingPhoto.id, annotation)}
          onClose={() => setAnnotatingPhotoId(null)}
        />
      )}

      {showPhotoSheet && (
        <PhotoSheetView
          photos={photos}
          measurements={measurements}
          project={currentProject ?? undefined}
          projectName={currentProject?.name ?? 'Mera3D Pro'}
          summary={fencePlan
            ? `Dolžina ograje ${fencePlan.totalLength.toFixed(2)} m · ${fencePlan.totalPanels} paneli · ${fencePlan.totalPosts} stebrov`
            : boardPlan
              ? `Dolžina ograje ${boardPlan.totalLength.toFixed(2)} m · ${boardPlan.boards} desk · ${boardPlan.posts} stebrov`
              : undefined}
          onClose={() => setShowPhotoSheet(false)}
        />
      )}

      {showFenceConfigurator && (
        <FenceConfigurator
          onClose={() => setShowFenceConfigurator(false)}
          onApply={handleApplyFenceConfig}
        />
      )}

      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📐</span>
          <div>
            <h1 className="text-lg font-bold text-emerald-400">Mera3D Pro</h1>
            <p className="text-xs text-slate-400">Profesionalne 3D-meritve in montaža</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-emerald-900/50 text-emerald-300 px-2 py-1 rounded">
            Offline ✓
          </span>
          {/* FAZA 14: ponudba namestitve (PWA) in indikator povezave */}
          <InstallPrompt />
          <button
            onClick={() => setShowAccuracyTests(!showAccuracyTests)}
            className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded hover:bg-blue-800/50"
          >
            🧪 Testi
          </button>
          {currentProject && (
            <span className="text-sm text-slate-300">
              {currentProject.name}
            </span>
          )}
        </div>
      </header>

      {/* Workflow Progress */}
      <nav className="bg-slate-800/50 border-b border-slate-700 px-4 py-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {steps.map((step, idx) => (
            <button
              key={step.key}
              onClick={() => setCurrentStep(step.key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                currentStep === step.key
                  ? 'bg-emerald-600 text-white'
                  : steps.findIndex(s => s.key === currentStep) > idx
                  ? 'bg-emerald-900/30 text-emerald-400'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              <span>{step.icon}</span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Sidebar - Project Info */}
        {currentProject && (
          <aside className="lg:w-64 bg-slate-800/30 border-b lg:border-b-0 lg:border-r border-slate-700 p-4 overflow-y-auto">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Projekt</h3>
            {projects.length > 0 && (
              <label className="block mb-3">
                <span className="sr-only">Aktiven projekt</span>
                <select
                  value={currentProject.id}
                  onChange={e => handleOpenProject(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                  title="Preklopi projekt"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
            )}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Tip:</span>
                <span className="text-slate-200">{getObjectTypeLabel(currentProject.objectType)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fotografije:</span>
                <span className="text-slate-200">{photos.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Meritve:</span>
                <span className="text-slate-200">{measurements.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Preverjene:</span>
                <span className="text-emerald-400">{measurements.filter(m => m.status === 'verified').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Opozorila:</span>
                <span className="text-amber-400">{measurements.filter(m => m.status === 'warning').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Neveljavne:</span>
                <span className="text-red-400">{measurements.filter(m => m.status === 'invalid').length}</span>
              </div>
              {pixelToMeter && (
                <div className="flex justify-between mt-2 pt-2 border-t border-slate-700">
                  <span className="text-slate-400">Merilo:</span>
                  <span className="text-emerald-400">{pixelToMeter.toFixed(4)} m/px</span>
                </div>
              )}
            </div>

            {/* Photos list */}
            {photos.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-slate-400 mb-2">Fotografije</h4>
                <div className="grid grid-cols-2 gap-1">
                  {photos.map(photo => (
                    <button
                      key={photo.id}
                      onClick={() => { setSelectedPhoto(photo); analyzePhoto(photo); }}
                      className={`relative rounded overflow-hidden aspect-video border-2 transition-colors ${
                        selectedPhoto?.id === photo.id ? 'border-emerald-400' : 'border-transparent'
                      }`}
                    >
                      <img src={photo.dataUrl} alt="" className="w-full h-full object-cover" />
                      <span className={`absolute top-0.5 right-0.5 w-2 h-2 rounded-full ${
                        photo.status === 'analyzed' ? 'bg-emerald-400' :
                        photo.status === 'rejected' ? 'bg-red-400' : 'bg-amber-400'
                      }`} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}

        {/* Main Panel */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* FAZA 8 (P1): opozorilo o shrambi (npr. polna kvota) */}
          {storageWarning && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-700 bg-amber-950/60 px-4 py-3 text-sm text-amber-200">
              <span aria-hidden>⚠</span>
              <span className="flex-1">{storageWarning}</span>
              <button
                onClick={() => setStorageWarning(null)}
                className="text-xs text-amber-300 hover:text-amber-100 px-2 py-1 rounded"
                aria-label="Zapri opozorilo"
              >
                ✕
              </button>
            </div>
          )}

          {/* New Project Step */}
          {currentStep === 'new_project' && (
            <NewProjectView
              onCreateProject={createProject}
              projects={projects}
              currentProjectId={currentProject?.id ?? null}
              onOpenProject={handleOpenProject}
              onDeleteProject={handleDeleteProject}
              onImportBackup={handleImportBackup}
              onExportWorkspaceBackup={handleExportWorkspaceBackup}
            />
          )}

          {/* Capture Step */}
          {currentStep === 'capture' && (
            <CaptureView
              photos={photos}
              onUpload={handlePhotoUpload}
              fileInputRef={fileInputRef}
              selectedPhoto={selectedPhoto}
              onSelectPhoto={setSelectedPhoto}
              onAnalyze={analyzePhoto}
              onDeletePhoto={handleDeletePhoto}
              onAnnotate={setAnnotatingPhotoId}
              onSetPhotoRole={handleSetPhotoRole}
              canvasRef={canvasRef}
              showInstructions={showInstructions}
              onToggleInstructions={() => setShowInstructions(!showInstructions)}
              onOpenCamera={() => setShowCamera(true)}
              objectType={currentProject?.objectType || 'fence'}
              capturedSteps={capturedSteps}
              onCaptureStep={(stepId) => {
                // Store step ID and open camera
                setCurrentCaptureStep(stepId);
                setShowCamera(true);
              }}
            />
          )}

          {/* Feature Matching between photos */}
          {currentStep === 'capture' && photos.length >= 2 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold text-slate-300">🔗 Ujemanje med slikami</h3>
                <select
                  value={comparePhoto?.id || ''}
                  onChange={e => setComparePhoto(photos.find(p => p.id === e.target.value) || null)}
                  className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                >
                  <option value="">Izberite sliko za primerjavo</option>
                  {photos.filter(p => p.id !== selectedPhoto?.id).map(p => (
                    <option key={p.id} value={p.id}>
                      Slika {photos.indexOf(p) + 1} — {p.timestamp.toLocaleTimeString('sl-SI')}
                    </option>
                  ))}
                </select>
              </div>
              {selectedPhoto && comparePhoto && (
                <FeatureMatchingView photo1={selectedPhoto} photo2={comparePhoto} />
              )}
            </div>
          )}

          {/* Quality Check */}
          {currentStep === 'quality_check' && (
            <QualityCheckView photos={photos} onSelectPhoto={(p) => { setSelectedPhoto(p); analyzePhoto(p); setCurrentStep('capture'); }} />
          )}

          {/* Scale Verification */}
          {currentStep === 'scale_verification' && (
            <div className="space-y-4">
              <ScaleView
                selectedPhoto={selectedPhoto}
                canvasRef={canvasRef}
                measuringMode={measuringMode}
                onToggleMeasuring={() => setMeasuringMode(!measuringMode)}
                measurePoints={measurePoints}
                referenceLength={referenceLength}
                onSetReferenceLength={setReferenceLength}
                onSetScale={setScale}
                pixelToMeter={pixelToMeter}
                onCanvasClick={handleReferenceClick}
                onAnalyze={analyzePhoto}
              />
              
              {/* New Measurement Overlay */}
              {selectedPhoto && (
                <div className="mt-6 border-t border-slate-700 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-emerald-400">
                      📐 Napredno merjenje z referenco
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowFenceConfigurator(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-medium transition-colors"
                      >
                        ⚙️ Konfigurator
                      </button>
                      <button
                        onClick={() => setShowRoksalGallery(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors"
                      >
                        🖼️ Galerija
                      </button>
                      <button
                        onClick={() => setShowFenceVisualizer(true)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm font-medium transition-colors"
                      >
                        🏗️ Visualizer
                      </button>
                    </div>
                  </div>
                  <MeasurementOverlay
                    imageUrl={selectedPhoto.dataUrl}
                    imageWidth={selectedPhoto.width || 800}
                    imageHeight={selectedPhoto.height || 600}
                  />
                </div>
              )}

              {/* Photo Matching */}
              {photos.length >= 2 && (
                <div className="mt-6 border-t border-slate-700 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-emerald-400">
                      🔗 Povezovanje fotografij
                    </h3>
                    <button
                      onClick={computePhotoMatchings}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors"
                    >
                      Izračunaj ujemanja
                    </button>
                  </div>
                  <PhotoMatchingView matchings={photoMatchings} />
                </div>
              )}
            </div>
          )}

          {/* Measurements */}
          {currentStep === 'measurements' && (
            <MeasurementsView
              measurements={measurements}
              selectedPhoto={selectedPhoto}
              canvasRef={canvasRef}
              measuringMode={measuringMode}
              onToggleMeasuring={() => setMeasuringMode(!measuringMode)}
              measurePoints={measurePoints}
              onCanvasClick={handleCanvasClick}
              pixelToMeter={pixelToMeter}
              onAnalyze={analyzePhoto}
              onAddManualLength={handleAddManualLength}
              onDeleteMeasurement={handleDeleteMeasurement}
              onToggleExcluded={handleToggleMeasurementExcluded}
              lengthUnit={lengthUnit}
              onChangeLengthUnit={setLengthUnit}
            />
          )}

          {/* Material Selection */}
          {currentStep === 'material_selection' && (
            <MaterialView
              currentProject={currentProject}
              fenceConfig={fenceConfig}
              onFenceConfigChange={setFenceConfig}
              stairsConfig={stairsConfig}
              onStairsConfigChange={setStairsConfig}
              onCalculateFence={calculateFence}
              onCalculateStairs={calculateStairs}
              measurements={measurements}
              fenceSegments={fenceSegments}
              onFenceSegmentsChange={setFenceSegments}
              materialPrices={materialPrices}
              onMaterialPricesChange={setMaterialPrices}
            />
          )}

          {/* Visualization */}
          {currentStep === 'visualization' && (
            <div>
              <h2 className="text-xl font-bold text-emerald-400 mb-4">🎨 Vizualizacija</h2>
              <FenceVisualization
                photoUrl={selectedPhoto?.dataUrl || null}
                fencePlan={fencePlan}
                startPoint={vizStartPoint}
                endPoint={vizEndPoint}
                onStartPointChange={setVizStartPoint}
                onEndPointChange={setVizEndPoint}
                fenceHeight={vizFenceHeight}
                onFenceHeightChange={setVizFenceHeight}
                numBoards={vizNumBoards}
                onNumBoardsChange={setVizNumBoards}
                color={vizColor}
                onColorChange={setVizColor}
              />
            </div>
          )}

          {/* Quantity Calculation */}
          {currentStep === 'quantity_calc' && (
            <QuantityView fencePlan={fencePlan} boardPlan={boardPlan} stairsPlan={stairsPlan} />
          )}

          {/* Estimate */}
          {currentStep === 'estimate' && (
            <EstimateView
              estimate={estimate}
              measurements={measurements}
              laborRate={laborRate}
              laborHours={laborHours}
              taxRate={taxRate}
              onLaborRateChange={setLaborRate}
              onLaborHoursChange={setLaborHours}
              onTaxRateChange={setTaxRate}
              onRecalculate={calculateFence}
            />
          )}

          {/* History */}
          {currentStep === 'history' && (
            <HistoryView entries={activity} loading={activityLoading} />
          )}

          {/* Export */}
          {currentStep === 'export' && (
            <ExportView
              onExport={exportData}
              onExportBackup={handleExportBackup}
              onOpenPhotoSheet={() => setShowPhotoSheet(true)}
              onShareDocumentation={handleShareDocumentation}
              measurements={measurements}
              currentProject={currentProject}
              fencePlan={fencePlan}
              stairsPlan={stairsPlan}
              estimate={estimate}
              pixelToMeter={pixelToMeter}
            />
          )}

          {/* Measurement Accuracy Tests */}
          {showAccuracyTests && (
            <div className="bg-slate-800 rounded-lg p-6 mt-4">
              <Suspense fallback={<p className="text-sm text-slate-400">Nalaganje…</p>}>
                <MeasurementAccuracyTests />
              </Suspense>
            </div>
          )}
        </div>
      </main>

      {/* Status Bar */}
      <footer className="bg-slate-800 border-t border-slate-700 px-4 py-1.5 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span>Motor: Harris + BRIEF</span>
          <span>|</span>
          <span>RANSAC: pripravljen</span>
          <span>|</span>
          <span className="text-emerald-400">Lokalno delovanje ✓</span>
        </div>
        <div>
          <span>Mera3D Pro v4.1 — lokalno delovanje, AI detekcija je izbirna</span>
        </div>
      </footer>

      {/* FAZA 22: razveljitev destruktivne akcije */}
      {undoStack.length > 0 && (
        <UndoSnackbar
          message={undoStack[undoStack.length - 1].message}
          pendingCount={undoStack.length}
          onUndo={handleUndo}
          onDismiss={handleDismissUndo}
        />
      )}
    </div>
  );
}

export default App;
