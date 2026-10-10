import { useState, useRef, useCallback, useEffect } from 'react';
import type {
  Project, Photo, Measurement, WorkflowStep, ObjectType,
  MeasurementStatus, ScaleSource, FencePlan, StairsPlan,
  CostEstimate, MaterialItem, ImageQuality, FeaturePoint
} from './types';
import { assessImageQuality, harrisCornerDetection, toGrayscale, houghLineDetection } from './utils/cv';
import { calculateFencePlan, calculateStairsPlan, estimateFenceMaterials, buildCostEstimate, formatMeasurement, exportMeasurementsCSV } from './utils/geometry';
import { generatePDFReport } from './utils/pdfExport';
import { v4 as uuidv4 } from 'uuid';
import { FenceVisualization } from './components/FenceVisualization';
import { CoverageMapView, CameraGuide } from './components/CoverageMap';
import { FeatureMatchingView } from './components/FeatureMatching';
import { ProjectSummary } from './components/ProjectSummary';

// Icons as simple SVG components
const IconCamera = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const IconRuler = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>;
const IconFence = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16M7 3v18M12 3v18M17 3v18" /></svg>;
const IconStairs = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h3v-3h3v-3h3v-3h3V9h3V6h3V3" /></svg>;
const IconCheck = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
const IconWarning = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>;
const IconX = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const IconExport = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const IconPlus = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
const IconSave = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>;

function App() {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('new_project');
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [fencePlan, setFencePlan] = useState<FencePlan | null>(null);
  const [stairsPlan, setStairsPlan] = useState<StairsPlan | null>(null);
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [activeTab, setActiveTab] = useState<string>('capture');
  const [showInstructions, setShowInstructions] = useState(true);
  const [measuringMode, setMeasuringMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<{x: number; y: number}[]>([]);
  const [referenceLength, setReferenceLength] = useState<string>('');
  const [pixelToMeter, setPixelToMeter] = useState<number | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [fenceConfig, setFenceConfig] = useState({
    panelWidth: 1.8,
    panelHeight: 1.5,
    postWidth: 0.06,
    maxGap: 0.12,
    mountingStyle: 'stepped' as 'level' | 'stepped' | 'mixed',
    slopeThreshold: 5
  });
  const [stairsConfig, setStairsConfig] = useState({
    numSteps: 5,
    totalRise: 1.2,
    totalRun: 2.5,
    handrailHeight: 0.9
  });
  const [laborRate, setLaborRate] = useState(35);
  const [laborHours, setLaborHours] = useState(8);
  const [taxRate, setTaxRate] = useState(22);
  const [vizStartPoint, setVizStartPoint] = useState<{x: number; y: number} | null>(null);
  const [vizEndPoint, setVizEndPoint] = useState<{x: number; y: number} | null>(null);
  const [vizFenceHeight, setVizFenceHeight] = useState(1.5);
  const [vizNumBoards, setVizNumBoards] = useState(12);
  const [vizColor, setVizColor] = useState('#2d3436');
  const [comparePhoto, setComparePhoto] = useState<Photo | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      status: 'capture'
    };
    setCurrentProject(project);
    setProjects(prev => [...prev, project]);
    setCurrentStep('capture');
  }, []);

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
            rejectionReason: quality.overallScore <= 0.4 ? 'Nizka kakovost slike' : undefined
          };

          setPhotos(prev => [...prev, photo]);
          if (!selectedPhoto) setSelectedPhoto(photo);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  }, [selectedPhoto]);

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
        return [];
      }
      return newPoints;
    });
  }, [measuringMode, pixelToMeter, selectedPhoto]);

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
        source: 'manual',
        scaleSource: 'manual_reference',
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
    }
  }, [measurePoints, referenceLength, selectedPhoto]);

  // Calculate fence plan
  const calculateFence = useCallback(() => {
    // Only use verified measurements with metric units
    const validMeasurements = measurements.filter(m => 
      m.status === 'verified' && 
      m.unit === 'm' && 
      m.scaleSource !== 'unknown' && 
      m.scaleSource !== 'demo' &&
      m.scaleSource !== 'normalized'
    );
    
    if (validMeasurements.length < 1) {
      // No valid measurements - cannot calculate fence
      setFencePlan(null);
      setEstimate(null);
      return;
    }

    // Use ONLY valid measurements to create segments
    const segments = validMeasurements.map((m, i) => ({
      startPoint: [i * 2, 0] as [number, number],
      endPoint: [i * 2 + m.value, 0] as [number, number],
      // Height change only from valid measurements
      heightChange: i === 0 ? 0 : (validMeasurements[i]?.value || 0) * 0.1
    }));

    const plan = calculateFencePlan(segments, fenceConfig);
    setFencePlan(plan);

    // Calculate materials
    const materialItems = estimateFenceMaterials(plan, {
      panelPricePerM: 85,
      postPriceEach: 45,
      railPricePerM: 12,
      fastenerPriceEach: 0.5,
      endCapPriceEach: 8
    });

    const costEstimate = buildCostEstimate(
      materialItems,
      { hours: laborHours, rate: laborRate },
      taxRate / 100,
      measurements.map(m => ({ status: m.status, scaleSource: m.scaleSource }))
    );
    setEstimate(costEstimate);
  }, [measurements, fenceConfig, laborHours, laborRate, taxRate]);

  // Calculate stairs
  const calculateStairs = useCallback(() => {
    const plan = calculateStairsPlan(
      stairsConfig.numSteps,
      stairsConfig.totalRise,
      stairsConfig.totalRun,
      stairsConfig.handrailHeight
    );
    setStairsPlan(plan);
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
      generatePDFReport(currentProject, measurements, fencePlan, stairsPlan, estimate);
    }
  }, [measurements, currentProject, photos, fencePlan, stairsPlan, estimate]);

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

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
    { key: 'export', label: 'Izvoz', icon: '📤' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📐</span>
          <div>
            <h1 className="text-lg font-bold text-emerald-400">Mera3D Pro</h1>
            <p className="text-xs text-slate-400">Profesionalne 3D-meritve in montaža</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs bg-emerald-900/50 text-emerald-300 px-2 py-1 rounded">
            Offline ✓
          </span>
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
          {/* New Project Step */}
          {currentStep === 'new_project' && (
            <NewProjectView onCreateProject={createProject} projects={projects} />
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
              canvasRef={canvasRef}
              showInstructions={showInstructions}
              onToggleInstructions={() => setShowInstructions(!showInstructions)}
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
              onCanvasClick={handleCanvasClick}
              onAnalyze={analyzePhoto}
            />
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
            <QuantityView fencePlan={fencePlan} stairsPlan={stairsPlan} />
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

          {/* Export */}
          {currentStep === 'export' && (
            <ExportView
              onExport={exportData}
              measurements={measurements}
              currentProject={currentProject}
              fencePlan={fencePlan}
              stairsPlan={stairsPlan}
              estimate={estimate}
              pixelToMeter={pixelToMeter}
            />
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
          <span>Mera3D Pro v4.1 — Brez AI-modelov v končnem izdelku</span>
        </div>
      </footer>
    </div>
  );
}

// ==================== SUB-COMPONENTS ====================

function NewProjectView({ onCreateProject, projects }: {
  onCreateProject: (name: string, type: ObjectType) => void;
  projects: Project[];
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ObjectType>('fence');

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-emerald-400">Nov projekt</h2>
      
      <div className="bg-slate-800 rounded-lg p-6 mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">Ime projekta</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="npr. Ograja - Družina Novak"
          className="w-full bg-slate-700 border border-slate-600 rounded px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
        />
        
        <label className="block text-sm font-medium text-slate-300 mt-4 mb-2">Tip objekta</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { value: 'fence', label: 'Ograja', icon: '🏗️' },
            { value: 'stairs', label: 'Stopnice', icon: '🪜' },
            { value: 'facade', label: 'Fasada', icon: '🏢' },
            { value: 'terrain', label: 'Teren', icon: '⛰️' },
            { value: 'combined', label: 'Kombinirano', icon: '📋' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setType(opt.value as ObjectType)}
              className={`p-3 rounded border text-center transition-colors ${
                type === opt.value
                  ? 'border-emerald-500 bg-emerald-900/30 text-emerald-300'
                  : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              <span className="text-xl">{opt.icon}</span>
              <p className="text-xs mt-1">{opt.label}</p>
            </button>
          ))}
        </div>

        <button
          onClick={() => name && onCreateProject(name, type)}
          disabled={!name}
          className="mt-6 w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:text-slate-400 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <IconPlus /> Ustvari projekt
        </button>
      </div>

      {projects.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Obstoječi projekti</h3>
          <div className="space-y-2">
            {projects.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-slate-700/50 rounded p-3">
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-slate-400">{getObjectTypeLabel(p.objectType)} • {p.createdAt.toLocaleDateString('sl-SI')}</p>
                </div>
                <span className="text-xs bg-slate-600 px-2 py-1 rounded">{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CaptureView({ photos, onUpload, fileInputRef, selectedPhoto, onSelectPhoto, onAnalyze, canvasRef, showInstructions, onToggleInstructions }: {
  photos: Photo[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  selectedPhoto: Photo | null;
  onSelectPhoto: (p: Photo) => void;
  onAnalyze: (p: Photo) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  showInstructions: boolean;
  onToggleInstructions: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-emerald-400">📷 Zajem fotografij</h2>
        <button
          onClick={onToggleInstructions}
          className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded text-slate-300"
        >
          {showInstructions ? 'Skrij navodila' : 'Pokaži navodila'}
        </button>
      </div>

      {showInstructions && (
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-blue-300 mb-2">📋 Navodila za zajem</h3>
          <ul className="text-xs text-blue-200 space-y-1">
            <li>• Fotografirajte objekt z vsaj 30% prekrivanja med sosednjimi posnetki</li>
            <li>• Premikajte se počasi in enakomerno</li>
            <li>• Izogibajte se bleščanju in senci</li>
            <li>• Zajemite celoten objekt od začetka do konca</li>
            <li>• Za merilo vključite znan referenčni objekt (npr. meter, letvico)</li>
            <li>• Sistem bo sproti ocenjeval kakovost in pokritost</li>
          </ul>
        </div>
      )}

      {/* Upload area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-emerald-500 transition-colors mb-4"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          onChange={onUpload}
          className="hidden"
        />
        <IconCamera />
        <p className="text-slate-300 mt-2">Kliknite za zajem ali nalaganje fotografij</p>
        <p className="text-xs text-slate-500 mt-1">Podprti formati: JPG, PNG • Več datotek hkrati</p>
      </div>

      {/* Analysis canvas */}
      {selectedPhoto && (
        <div className="bg-slate-800 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-300">Analiza značilnic</h3>
            <button
              onClick={() => onAnalyze(selectedPhoto)}
              className="text-xs bg-emerald-700 hover:bg-emerald-600 px-3 py-1 rounded text-white"
            >
              Ponovno analiziraj
            </button>
          </div>
          <canvas
            ref={canvasRef}
            className="w-full rounded border border-slate-700 max-h-96 object-contain"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            <QualityBadge label="Kakovost" value={selectedPhoto.quality.overallScore} />
            <QualityBadge label="Ostrina" value={selectedPhoto.quality.sharpness} />
            <QualityBadge label="Svetlost" value={selectedPhoto.quality.brightness} />
            <QualityBadge label="Kontrast" value={selectedPhoto.quality.contrast} />
          </div>
          {selectedPhoto.quality.glareDetected && (
            <div className="mt-2 bg-amber-900/30 border border-amber-700 rounded p-2 text-xs text-amber-300">
              ⚠️ Zaznano bleščanje. Priporočamo ponovni posnetek.
            </div>
          )}
        </div>
      )}

      {/* Coverage Map */}
      {photos.length > 0 && (
        <CoverageMapView photos={photos} gridSize={6} />
      )}



      {/* Camera Guide */}
      {selectedPhoto && (
        <div className="mt-4">
          <CameraGuide
            quality={selectedPhoto.quality}
            coverage={photos.length > 0 ? Math.min(photos.length * 15, 100) : 0}
            trackingStable={selectedPhoto.quality.overallScore > 0.5}
          />
        </div>
      )}

      {/* Photo gallery */}
      {photos.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-4 mt-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">
            Zajete fotografije ({photos.length})
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {photos.map(photo => (
              <button
                key={photo.id}
                onClick={() => { onSelectPhoto(photo); onAnalyze(photo); }}
                className={`relative rounded overflow-hidden aspect-video border-2 transition-all ${
                  selectedPhoto?.id === photo.id ? 'border-emerald-400 scale-105' : 'border-slate-700 hover:border-slate-500'
                }`}
              >
                <img src={photo.dataUrl} alt="" className="w-full h-full object-cover" />
                <div className={`absolute top-1 right-1 w-3 h-3 rounded-full ${
                  photo.status === 'analyzed' ? 'bg-emerald-400' :
                  photo.status === 'rejected' ? 'bg-red-400' : 'bg-amber-400'
                }`} />
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                  <span className="text-[10px] text-white">{(photo.quality.overallScore * 100).toFixed(0)}%</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QualityBadge({ label, value }: { label: string; value: number }) {
  const color = value > 0.7 ? 'text-emerald-400' : value > 0.4 ? 'text-amber-400' : 'text-red-400';
  const bg = value > 0.7 ? 'bg-emerald-900/30' : value > 0.4 ? 'bg-amber-900/30' : 'bg-red-900/30';
  return (
    <div className={`${bg} rounded p-2 text-center`}>
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{(value * 100).toFixed(0)}%</p>
    </div>
  );
}

function QualityCheckView({ photos, onSelectPhoto }: { photos: Photo[]; onSelectPhoto: (p: Photo) => void }) {
  const accepted = photos.filter(p => p.status === 'analyzed');
  const rejected = photos.filter(p => p.status === 'rejected');
  const pending = photos.filter(p => p.status === 'pending');

  return (
    <div>
      <h2 className="text-xl font-bold text-emerald-400 mb-4">✅ Kontrola kakovosti</h2>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-emerald-400">{accepted.length}</p>
          <p className="text-xs text-emerald-300">Sprejeto</p>
        </div>
        <div className="bg-amber-900/20 border border-amber-800 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-amber-400">{pending.length}</p>
          <p className="text-xs text-amber-300">V čakanju</p>
        </div>
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-red-400">{rejected.length}</p>
          <p className="text-xs text-red-300">Zavrnjeno</p>
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p>Ni fotografij. Najprej zajemite fotografije.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {photos.map(photo => (
            <div key={photo.id} className="bg-slate-800 rounded-lg p-3 flex items-center gap-3">
              <img src={photo.dataUrl} alt="" className="w-16 h-12 object-cover rounded" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <StatusIcon status={photo.status} />
                  <span className="text-sm text-slate-200">
                    {photo.timestamp.toLocaleTimeString('sl-SI')}
                  </span>
                </div>
                <div className="flex gap-3 mt-1 text-xs text-slate-400">
                  <span>Ostrina: {(photo.quality.sharpness * 100).toFixed(0)}%</span>
                  <span>Svetlost: {(photo.quality.brightness * 100).toFixed(0)}%</span>
                  {photo.quality.glareDetected && <span className="text-amber-400">⚠ Bleščanje</span>}
                </div>
                {photo.rejectionReason && (
                  <p className="text-xs text-red-400 mt-1">{photo.rejectionReason}</p>
                )}
              </div>
              <button
                onClick={() => onSelectPhoto(photo)}
                className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300"
              >
                Odpri
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'analyzed') return <span className="text-emerald-400"><IconCheck /></span>;
  if (status === 'rejected') return <span className="text-red-400"><IconX /></span>;
  return <span className="text-amber-400"><IconWarning /></span>;
}

function ScaleView({ selectedPhoto, canvasRef, measuringMode, onToggleMeasuring, measurePoints, referenceLength, onSetReferenceLength, onSetScale, pixelToMeter, onCanvasClick, onAnalyze }: {
  selectedPhoto: Photo | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  measuringMode: boolean;
  onToggleMeasuring: () => void;
  measurePoints: {x: number; y: number}[];
  referenceLength: string;
  onSetReferenceLength: (v: string) => void;
  onSetScale: () => void;
  pixelToMeter: number | null;
  onCanvasClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onAnalyze: (p: Photo) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-emerald-400 mb-4">📏 Kalibracija merila</h2>
      
      {!selectedPhoto ? (
        <div className="bg-slate-800 rounded-lg p-8 text-center text-slate-400">
          <p>Izberite fotografijo za kalibracijo merila.</p>
          <p className="text-xs mt-2">Fotografija mora vsebovati znan referenčni objekt.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-300 mb-2">Postopek kalibracije</h3>
            <ol className="text-xs text-blue-200 space-y-1 list-decimal list-inside">
              <li>Vključite način merjenja</li>
              <li>Kliknite začetno in končno točko znanega objekta</li>
              <li>Vnesite dejansko dolžino v metrih</li>
              <li>Potrdite kalibracijo</li>
            </ol>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={onToggleMeasuring}
              className={`px-4 py-2 rounded font-medium text-sm ${
                measuringMode ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {measuringMode ? '🎯 Merjenje aktivno' : '📏 Vključi merjenje'}
            </button>
            {pixelToMeter && (
              <span className="px-3 py-2 bg-emerald-900/30 text-emerald-300 rounded text-sm">
                Merilo: {pixelToMeter.toFixed(5)} m/px ✓
              </span>
            )}
          </div>

          <canvas
            ref={canvasRef}
            onClick={onCanvasClick}
            className={`w-full rounded border-2 max-h-96 object-contain ${
              measuringMode ? 'border-emerald-500 cursor-crosshair' : 'border-slate-700'
            }`}
          />

          {measurePoints.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-4">
              <p className="text-sm text-slate-300 mb-2">
                Točke: {measurePoints.length}/2
                {measurePoints.length === 2 && ' ✓'}
              </p>
              {measurePoints.length === 2 && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={referenceLength}
                    onChange={e => onSetReferenceLength(e.target.value)}
                    placeholder="Dolžina v metrih"
                    className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                  />
                  <span className="text-slate-400 text-sm">m</span>
                  <button
                    onClick={onSetScale}
                    disabled={!referenceLength}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 px-4 py-2 rounded text-sm text-white font-medium"
                  >
                    Potrdi merilo
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Vir merila</h3>
            <div className="space-y-1 text-xs">
              <ScaleRow label="Demo merilo" status={pixelToMeter ? 'inactive' : 'available'} />
              <ScaleRow label="Ročno vnesena referenca" status={pixelToMeter ? 'active' : 'available'} />
              <ScaleRow label="Kalibracijski marker" status="unavailable" />
              <ScaleRow label="Preverjeno merilo modela" status="unavailable" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScaleRow({ label, status }: { label: string; status: 'active' | 'available' | 'inactive' | 'unavailable' }) {
  const colors = {
    active: 'text-emerald-400 bg-emerald-900/20',
    available: 'text-slate-300 bg-slate-700/50',
    inactive: 'text-slate-500 bg-slate-800/50',
    unavailable: 'text-slate-600 bg-slate-800/30'
  };
  const labels = {
    active: '✓ Aktivno',
    available: 'Na voljo',
    inactive: 'Ni aktivno',
    unavailable: 'Ni na voljo'
  };
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-slate-300">{label}</span>
      <span className={`px-2 py-0.5 rounded text-xs ${colors[status]}`}>{labels[status]}</span>
    </div>
  );
}

function MeasurementsView({ measurements, selectedPhoto, canvasRef, measuringMode, onToggleMeasuring, measurePoints, onCanvasClick, pixelToMeter, onAnalyze }: {
  measurements: Measurement[];
  selectedPhoto: Photo | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  measuringMode: boolean;
  onToggleMeasuring: () => void;
  measurePoints: {x: number; y: number}[];
  onCanvasClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  pixelToMeter: number | null;
  onAnalyze: (p: Photo) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-emerald-400 mb-4">📐 Meritve</h2>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={onToggleMeasuring}
          className={`px-4 py-2 rounded font-medium text-sm ${
            measuringMode ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
          }`}
        >
          {measuringMode ? '🎯 Merjenje aktivno - kliknite na sliko' : '📏 Novo merjenje'}
        </button>
        {!pixelToMeter && (
          <span className="px-3 py-2 bg-amber-900/30 text-amber-300 rounded text-xs">
            ⚠ Kalibrirajte merilo za metrične vrednosti
          </span>
        )}
      </div>

      {selectedPhoto && (
        <canvas
          ref={canvasRef}
          onClick={onCanvasClick}
          className={`w-full rounded border-2 max-h-80 object-contain mb-4 ${
            measuringMode ? 'border-emerald-500 cursor-crosshair' : 'border-slate-700'
          }`}
        />
      )}

      {/* Measurements table */}
      <div className="bg-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-700/50">
              <th className="text-left px-3 py-2 text-slate-300">Status</th>
              <th className="text-left px-3 py-2 text-slate-300">Vrednost</th>
              <th className="text-left px-3 py-2 text-slate-300">Vir</th>
              <th className="text-left px-3 py-2 text-slate-300">Negotovost</th>
              <th className="text-left px-3 py-2 text-slate-300">Algoritem</th>
            </tr>
          </thead>
          <tbody>
            {measurements.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  Ni meritev. Kliknite na sliko v načinu merjenja.
                </td>
              </tr>
            ) : (
              measurements.map(m => (
                <tr key={m.id} className="border-t border-slate-700/50">
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                      m.status === 'verified' ? 'bg-emerald-900/30 text-emerald-400' :
                      m.status === 'warning' ? 'bg-amber-900/30 text-amber-400' :
                      'bg-red-900/30 text-red-400'
                    }`}>
                      {m.status === 'verified' ? '✓' : m.status === 'warning' ? '⚠' : '✗'}
                      {m.status === 'verified' ? 'PREVERJENA' : m.status === 'warning' ? 'OPOZORILO' : 'NEVELJAVNA'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-200 font-mono">
                    {formatMeasurement(m.value, m.unit, m.uncertainty)}
                  </td>
                  <td className="px-3 py-2 text-slate-400 text-xs">{m.source}</td>
                  <td className="px-3 py-2 text-slate-400 text-xs">±{m.uncertainty.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-slate-400 text-xs">{m.algorithm}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Measurement rules */}
      <div className="mt-4 bg-slate-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Merilna pravila</h3>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>• PREVERJENA: izpolnjuje merilna pravila, ima dokumentirano merilo</li>
          <li>• OPOZORILO: uporabna z omejitvami, zahteva potrditev uporabnika</li>
          <li>• NEVELJAVNA: ne sme biti vključena v predračun</li>
          <li>• Brez kalibriranega merila: metrične vrednosti niso preverjene</li>
        </ul>
      </div>
    </div>
  );
}

function MaterialView({ currentProject, fenceConfig, onFenceConfigChange, stairsConfig, onStairsConfigChange, onCalculateFence, onCalculateStairs }: {
  currentProject: Project | null;
  fenceConfig: any;
  onFenceConfigChange: (c: any) => void;
  stairsConfig: any;
  onStairsConfigChange: (c: any) => void;
  onCalculateFence: () => void;
  onCalculateStairs: () => void;
}) {
  const [activeSection, setActiveSection] = useState<'fence' | 'stairs'>('fence');

  return (
    <div>
      <h2 className="text-xl font-bold text-emerald-400 mb-4">🪵 Izbira materialov in konfiguracija</h2>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveSection('fence')}
          className={`px-4 py-2 rounded text-sm font-medium ${
            activeSection === 'fence' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
          }`}
        >
          🏗️ Ograja
        </button>
        <button
          onClick={() => setActiveSection('stairs')}
          className={`px-4 py-2 rounded text-sm font-medium ${
            activeSection === 'stairs' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
          }`}
        >
          🪜 Stopnice
        </button>
      </div>

      {activeSection === 'fence' && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Konfiguracija ograje</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">Širina panela (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={fenceConfig.panelWidth}
                  onChange={e => onFenceConfigChange({ ...fenceConfig, panelWidth: parseFloat(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Višina panela (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={fenceConfig.panelHeight}
                  onChange={e => onFenceConfigChange({ ...fenceConfig, panelHeight: parseFloat(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Širina stebra (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={fenceConfig.postWidth}
                  onChange={e => onFenceConfigChange({ ...fenceConfig, postWidth: parseFloat(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Max. razmik (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={fenceConfig.maxGap}
                  onChange={e => onFenceConfigChange({ ...fenceConfig, maxGap: parseFloat(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-400">Način montaže</label>
                <select
                  value={fenceConfig.mountingStyle}
                  onChange={e => onFenceConfigChange({ ...fenceConfig, mountingStyle: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
                >
                  <option value="level">Ravna (level)</option>
                  <option value="stepped">Stopničasta (stepped)</option>
                  <option value="mixed">Mešana (auto)</option>
                </select>
              </div>
            </div>
            <button
              onClick={onCalculateFence}
              className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded text-sm"
            >
              Izračunaj ograjo
            </button>
          </div>
        </div>
      )}

      {activeSection === 'stairs' && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Konfiguracija stopnic</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">Število stopnic</label>
                <input
                  type="number"
                  min="1"
                  value={stairsConfig.numSteps}
                  onChange={e => onStairsConfigChange({ ...stairsConfig, numSteps: parseInt(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Skupna višina (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={stairsConfig.totalRise}
                  onChange={e => onStairsConfigChange({ ...stairsConfig, totalRise: parseFloat(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Skupna dolžina (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={stairsConfig.totalRun}
                  onChange={e => onStairsConfigChange({ ...stairsConfig, totalRun: parseFloat(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Višina ograje (m)</label>
                <input
                  type="number"
                  step="0.05"
                  value={stairsConfig.handrailHeight}
                  onChange={e => onStairsConfigChange({ ...stairsConfig, handrailHeight: parseFloat(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
                />
              </div>
            </div>
            <button
              onClick={onCalculateStairs}
              className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded text-sm"
            >
              Izračunaj stopnice
            </button>
          </div>
        </div>
      )}

      {/* Product info */}
      <div className="bg-slate-800 rounded-lg p-4 mt-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Izbrani produkt</h3>
        <div className="text-xs text-slate-400 space-y-1">
          <p>Linija: <span className="text-slate-200">{currentProject?.materials.productLine || 'Roksal Standard'}</span></p>
          <p>Barva: <span className="text-slate-200">{currentProject?.materials.color || 'Antracit RAL 7016'}</span></p>
          <p>Obdelava: <span className="text-slate-200">{currentProject?.materials.finish || 'Prašno barvan'}</span></p>
          <p>Material: <span className="text-slate-200">{currentProject?.materials.panelMaterial || 'Aluminij'}</span></p>
        </div>
        <p className="text-xs text-amber-400 mt-2">
          ⚠ Produktni podatki so privzeti. Za točne specifikacije uvozite katalog.
        </p>
      </div>
    </div>
  );
}

function QuantityView({ fencePlan, stairsPlan }: { fencePlan: FencePlan | null; stairsPlan: StairsPlan | null }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-emerald-400 mb-4">🔢 Količine in materialni seznam</h2>

      {fencePlan && (
        <div className="bg-slate-800 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">🏗️ Ograja - povzetek</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Skupna dolžina" value={`${fencePlan.totalLength.toFixed(2)} m`} />
            <StatCard label="Paneli" value={`${fencePlan.totalPanels} kos`} />
            <StatCard label="Stebri" value={`${fencePlan.totalPosts} kos`} />
            <StatCard label="Letve" value={`${fencePlan.totalRails} kos`} />
            <StatCard label="Pritrdilni elem." value={`${fencePlan.totalFasteners} kos`} />
            <StatCard label="Višina" value={`${fencePlan.panelHeight} m`} />
            <StatCard label="Način" value={fencePlan.mountingStyle === 'stepped' ? 'Stopničasta' : 'Ravna'} />
            <StatCard label="Segmenti" value={`${fencePlan.segments.length}`} />
          </div>

          {fencePlan.segments.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-slate-400 mb-2">Segmenti</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-700/50">
                      <th className="px-2 py-1 text-left text-slate-400">#</th>
                      <th className="px-2 py-1 text-left text-slate-400">Dolžina</th>
                      <th className="px-2 py-1 text-left text-slate-400">ΔVišina</th>
                      <th className="px-2 py-1 text-left text-slate-400">Naklon</th>
                      <th className="px-2 py-1 text-left text-slate-400">Paneli</th>
                      <th className="px-2 py-1 text-left text-slate-400">Montaža</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fencePlan.segments.map((seg, i) => (
                      <tr key={seg.id} className="border-t border-slate-700/50">
                        <td className="px-2 py-1 text-slate-300">{i + 1}</td>
                        <td className="px-2 py-1 text-slate-200">{seg.length.toFixed(2)} m</td>
                        <td className="px-2 py-1 text-slate-200">{seg.heightChange.toFixed(2)} m</td>
                        <td className="px-2 py-1 text-slate-200">{seg.slope.toFixed(1)}°</td>
                        <td className="px-2 py-1 text-slate-200">{seg.numPanels}</td>
                        <td className="px-2 py-1 text-slate-200">{seg.mountingType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {stairsPlan && (
        <div className="bg-slate-800 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">🪜 Stopnice - povzetek</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Stopnice" value={`${stairsPlan.numSteps} kos`} />
            <StatCard label="Skupna višina" value={`${stairsPlan.totalRise.toFixed(2)} m`} />
            <StatCard label="Skupna dolžina" value={`${stairsPlan.totalRun.toFixed(2)} m`} />
            <StatCard label="Naklon" value={`${stairsPlan.slope.toFixed(1)}°`} />
            <StatCard label="Povp. stopnica" value={`${(stairsPlan.averageRise * 100).toFixed(1)} cm`} />
            <StatCard label="Povp. gaz" value={`${(stairsPlan.averageRun * 100).toFixed(1)} cm`} />
            <StatCard label="Dolžina ograje" value={`${stairsPlan.railingLength.toFixed(2)} m`} />
            <StatCard label="Višina ograje" value={`${stairsPlan.handrailHeight} m`} />
          </div>
        </div>
      )}

      {!fencePlan && !stairsPlan && (
        <div className="bg-slate-800 rounded-lg p-8 text-center text-slate-400">
          <p>Ni izračunov. Najprej konfigurirajte in izračunajte v zavihku Materiali.</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-700/50 rounded p-2">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="text-sm font-bold text-slate-200">{value}</p>
    </div>
  );
}

function EstimateView({ estimate, measurements, laborRate, laborHours, taxRate, onLaborRateChange, onLaborHoursChange, onTaxRateChange, onRecalculate }: {
  estimate: CostEstimate | null;
  measurements: Measurement[];
  laborRate: number;
  laborHours: number;
  taxRate: number;
  onLaborRateChange: (v: number) => void;
  onLaborHoursChange: (v: number) => void;
  onTaxRateChange: (v: number) => void;
  onRecalculate: () => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-emerald-400 mb-4">💰 Predračun</h2>

      {/* Measurement validity check */}
      <div className="bg-slate-800 rounded-lg p-4 mb-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Preverjanje veljavnosti meritev</h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-emerald-900/20 rounded p-2 text-center">
            <p className="text-lg font-bold text-emerald-400">{measurements.filter(m => m.status === 'verified').length}</p>
            <p className="text-xs text-emerald-300">Preverjene</p>
          </div>
          <div className="bg-amber-900/20 rounded p-2 text-center">
            <p className="text-lg font-bold text-amber-400">{measurements.filter(m => m.status === 'warning').length}</p>
            <p className="text-xs text-amber-300">Opozorila</p>
          </div>
          <div className="bg-red-900/20 rounded p-2 text-center">
            <p className="text-lg font-bold text-red-400">{measurements.filter(m => m.status === 'invalid').length}</p>
            <p className="text-xs text-red-300">Neveljavne</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          ⚠ Neveljavne meritve so izključene iz vseh količin in predračuna.
        </p>
      </div>

      {/* Labor config */}
      <div className="bg-slate-800 rounded-lg p-4 mb-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Delo</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-400">Urna postavka (€)</label>
            <input
              type="number"
              value={laborRate}
              onChange={e => onLaborRateChange(parseFloat(e.target.value))}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Število ur</label>
            <input
              type="number"
              value={laborHours}
              onChange={e => onLaborHoursChange(parseFloat(e.target.value))}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">DDV (%)</label>
            <input
              type="number"
              value={taxRate}
              onChange={e => onTaxRateChange(parseFloat(e.target.value))}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
            />
          </div>
        </div>
        <button
          onClick={onRecalculate}
          className="mt-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-1.5 rounded"
        >
          Preračunaj
        </button>
      </div>

      {/* Estimate table */}
      {estimate ? (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-700/50">
                <th className="text-left px-3 py-2 text-slate-300">Material</th>
                <th className="text-right px-3 py-2 text-slate-300">Kol.</th>
                <th className="text-right px-3 py-2 text-slate-300">Enota</th>
                <th className="text-right px-3 py-2 text-slate-300">Skupaj</th>
              </tr>
            </thead>
            <tbody>
              {estimate.materials.map(item => (
                <tr key={item.id} className="border-t border-slate-700/50">
                  <td className="px-3 py-2 text-slate-200">
                    <p>{item.name}</p>
                    {item.notes && <p className="text-xs text-slate-400">{item.notes}</p>}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-200">{item.quantity}</td>
                  <td className="px-3 py-2 text-right text-slate-400">{item.unitPrice.toFixed(2)} €/{item.unit}</td>
                  <td className="px-3 py-2 text-right text-slate-200 font-medium">{item.totalPrice.toFixed(2)} €</td>
                </tr>
              ))}
              {estimate.labor && (
                <tr className="border-t border-slate-700/50">
                  <td className="px-3 py-2 text-slate-200">Montaža</td>
                  <td className="px-3 py-2 text-right text-slate-200">{estimate.labor.hours} ur</td>
                  <td className="px-3 py-2 text-right text-slate-400">{estimate.labor.rate.toFixed(2)} €/h</td>
                  <td className="px-3 py-2 text-right text-slate-200 font-medium">{estimate.labor.total.toFixed(2)} €</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-600">
                <td colSpan={3} className="px-3 py-2 text-slate-300">Vmesni seštevek</td>
                <td className="px-3 py-2 text-right text-slate-200">{estimate.subtotal.toFixed(2)} €</td>
              </tr>
              {estimate.labor && (
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-slate-300">Materiali + delo</td>
                  <td className="px-3 py-2 text-right text-slate-200">{(estimate.subtotal + estimate.labor.total).toFixed(2)} €</td>
                </tr>
              )}
              <tr>
                <td colSpan={3} className="px-3 py-2 text-slate-300">DDV ({estimate.taxRate * 100}%)</td>
                <td className="px-3 py-2 text-right text-slate-200">{estimate.tax.toFixed(2)} €</td>
              </tr>
              <tr className="bg-emerald-900/20">
                <td colSpan={3} className="px-3 py-3 text-emerald-300 font-bold">SKUPAJ</td>
                <td className="px-3 py-3 text-right text-emerald-300 font-bold text-lg">{estimate.total.toFixed(2)} €</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg p-8 text-center text-slate-400">
          <p>Predračun ni na voljo. Najprej izračunajte količine.</p>
        </div>
      )}
    </div>
  );
}

function ExportView({ onExport, measurements, currentProject, fencePlan, stairsPlan, estimate, pixelToMeter }: {
  onExport: (format: 'csv' | 'json' | 'pdf') => void;
  measurements: Measurement[];
  currentProject: Project | null;
  fencePlan: FencePlan | null;
  stairsPlan: StairsPlan | null;
  estimate: CostEstimate | null;
  pixelToMeter: number | null;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-emerald-400 mb-4">📤 Izvoz podatkov</h2>

      {/* Project Summary */}
      <ProjectSummary
        project={currentProject}
        measurements={measurements}
        fencePlan={fencePlan}
        stairsPlan={stairsPlan}
        estimate={estimate}
        pixelToMeter={pixelToMeter}
      />

      <div className="mt-4">

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => onExport('csv')}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg p-6 text-center transition-colors"
        >
          <span className="text-3xl">📊</span>
          <p className="text-sm font-medium text-slate-200 mt-2">CSV</p>
          <p className="text-xs text-slate-400 mt-1">Meritve v tabelarni obliki</p>
        </button>
        <button
          onClick={() => onExport('json')}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg p-6 text-center transition-colors"
        >
          <span className="text-3xl">📋</span>
          <p className="text-sm font-medium text-slate-200 mt-2">JSON</p>
          <p className="text-xs text-slate-400 mt-1">Celoten projekt</p>
        </button>
        <button
          onClick={() => onExport('pdf')}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg p-6 text-center transition-colors"
        >
          <span className="text-3xl">📄</span>
          <p className="text-sm font-medium text-slate-200 mt-2">PDF</p>
          <p className="text-xs text-slate-400 mt-1">Predračun za stranko</p>
        </button>
      </div>

      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Varnost izvoza</h3>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>✓ Neveljavne meritve so izključene iz vseh izvozov</li>
          <li>✓ Vsaka mera ima sledljiv izvor in algoritem</li>
          <li>✓ Negotovost je navedena za vsako meritev</li>
          <li>✓ Status veljavnosti je ohranjen v izvozu</li>
          <li>✓ Lokalni izvoz — podatki ne zapustijo naprave</li>
        </ul>
      </div>

      {measurements.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-4 mt-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Povzetek za izvoz</h3>
          <div className="text-xs text-slate-400 space-y-1">
            <p>Skupno meritev: {measurements.length}</p>
            <p>Preverjene (vključene): {measurements.filter(m => m.status === 'verified').length}</p>
            <p>Opozorila (pogočno): {measurements.filter(m => m.status === 'warning').length}</p>
            <p>Neveljavne (izključene): {measurements.filter(m => m.status === 'invalid').length}</p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function getObjectTypeLabel(type: ObjectType): string {
  const labels: Record<ObjectType, string> = {
    fence: 'Ograja',
    stairs: 'Stopnice',
    facade: 'Fasada',
    terrain: 'Teren',
    combined: 'Kombinirano'
  };
  return labels[type];
}

export default App;
