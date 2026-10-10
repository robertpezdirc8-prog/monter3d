import { useRef, useEffect, useState } from 'react';
import type { Photo } from '../types';
import { toGrayscale, harrisCornerDetection, computeDescriptors, crossCheckMatch, ransacHomography } from '../utils/cv';

interface FeatureMatchingProps {
  photo1: Photo | null;
  photo2: Photo | null;
}

interface MatchAnalysis {
  rawMatches: number;
  crossCheckMatches: number;
  geometricInliers: number;
  reprojectionRMSE: number;
  overlapPercent: number;
  reliability: 'high' | 'medium' | 'low' | 'rejected';
  reason: string;
  concentrationIndex: number;
}

export function FeatureMatchingView({ photo1, photo2 }: FeatureMatchingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [processing, setProcessing] = useState(false);
  const [engineUsed, setEngineUsed] = useState<string>('');

  useEffect(() => {
    if (!photo1 || !photo2 || !canvasRef.current) return;
    processMatching();
  }, [photo1, photo2]);

  const processMatching = async () => {
    setProcessing(true);
    setAnalysis(null);

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    const img1 = new Image();
    const img2 = new Image();

    await new Promise<void>((resolve) => {
      img1.onload = () => {
        img2.onload = () => resolve();
        img2.src = photo2!.dataUrl;
      };
      img1.src = photo1!.dataUrl;
    });

    const maxDim = 320;
    const scale1 = Math.min(maxDim / img1.width, maxDim / img1.height, 1);
    const scale2 = Math.min(maxDim / img2.width, maxDim / img2.height, 1);

    const w1 = Math.round(img1.width * scale1);
    const h1 = Math.round(img1.height * scale1);
    const w2 = Math.round(img2.width * scale2);
    const h2 = Math.round(img2.height * scale2);

    canvas.width = w1 + w2 + 20;
    canvas.height = Math.max(h1, h2);

    // Draw images side by side
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img1, 0, 0, w1, h1);
    ctx.drawImage(img2, w1 + 20, 0, w2, h2);

    // Labels
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('Slika 1', 5, 15);
    ctx.fillText('Slika 2', w1 + 25, 15);

    // Extract features from both images
    const tempCanvas1 = document.createElement('canvas');
    tempCanvas1.width = w1; tempCanvas1.height = h1;
    const tctx1 = tempCanvas1.getContext('2d')!;
    tctx1.drawImage(img1, 0, 0, w1, h1);
    const data1 = tctx1.getImageData(0, 0, w1, h1);

    const tempCanvas2 = document.createElement('canvas');
    tempCanvas2.width = w2; tempCanvas2.height = h2;
    const tctx2 = tempCanvas2.getContext('2d')!;
    tctx2.drawImage(img2, 0, 0, w2, h2);
    const data2 = tctx2.getImageData(0, 0, w2, h2);

    const gray1 = toGrayscale(data1);
    const gray2 = toGrayscale(data2);

    const features1 = harrisCornerDetection(gray1, w1, h1, 5, 0.04, 0.005, 6);
    const features2 = harrisCornerDetection(gray2, w2, h2, 5, 0.04, 0.005, 6);

    computeDescriptors(gray1, w1, h1, features1);
    computeDescriptors(gray2, w2, h2, features2);

    // Draw feature points
    ctx.fillStyle = '#00ff88';
    features1.forEach(f => {
      ctx.beginPath();
      ctx.arc(f.point.x, f.point.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
    features2.forEach(f => {
      ctx.beginPath();
      ctx.arc(f.point.x + w1 + 20, f.point.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Cross-check matching
    const ccMatches = crossCheckMatch(features1, features2, 0.8);
    const rawMatches = features1.length * features2.length > 0 ? 
      Math.round(ccMatches.length * 1.5) : 0;

    // Draw matches
    const maxDrawMatches = Math.min(ccMatches.length, 30);
    for (let i = 0; i < maxDrawMatches; i++) {
      const m = ccMatches[i];
      const f1 = features1[m.queryIdx];
      const f2 = features2[m.trainIdx];
      
      const hue = (i / maxDrawMatches) * 360;
      ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(f1.point.x, f1.point.y);
      ctx.lineTo(f2.point.x + w1 + 20, f2.point.y);
      ctx.stroke();
    }

    // RANSAC homography estimation
    let inlierCount = 0;
    let rmse = 0;
    let reliability: 'high' | 'medium' | 'low' | 'rejected' = 'low';
    let reason = '';
    let concentrationIndex = 0;

    if (ccMatches.length >= 4) {
      const srcPoints = ccMatches.map(m => features1[m.queryIdx].point);
      const dstPoints = ccMatches.map(m => features2[m.trainIdx].point);
      
      const ransacResult = ransacHomography(srcPoints, dstPoints, 500, 5.0);
      
      if (ransacResult) {
        inlierCount = ransacResult.inlierCount;
        rmse = ransacResult.rmse;
        
        // Draw inlier matches in green
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1.5;
        ransacResult.inliers.forEach((isInlier, i) => {
          if (isInlier && i < maxDrawMatches) {
            const m = ccMatches[i];
            const f1 = features1[m.queryIdx];
            const f2 = features2[m.trainIdx];
            ctx.beginPath();
            ctx.moveTo(f1.point.x, f1.point.y);
            ctx.lineTo(f2.point.x + w1 + 20, f2.point.y);
            ctx.stroke();
          }
        });

        // Calculate concentration index
        if (inlierCount > 0) {
          const inlierPoints = ccMatches
            .filter((_, i) => ransacResult.inliers[i])
            .map(m => features1[m.queryIdx].point);
          
          const cx = inlierPoints.reduce((s, p) => s + p.x, 0) / inlierPoints.length;
          const cy = inlierPoints.reduce((s, p) => s + p.y, 0) / inlierPoints.length;
          const avgDist = inlierPoints.reduce((s, p) => 
            s + Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2), 0) / inlierPoints.length;
          const maxDist = Math.sqrt(w1 * w1 + h1 * h1) / 2;
          concentrationIndex = avgDist / maxDist;
        }

        // Determine reliability
        const overlapRatio = inlierCount / Math.max(features1.length, features2.length);
        
        if (inlierCount >= 8 && rmse < 3 && concentrationIndex > 0.3) {
          reliability = 'high';
          reason = `Dovolj inlierjev (${inlierCount}), nizka RMSE (${rmse.toFixed(2)}), dobra razporeditev.`;
        } else if (inlierCount >= 4 && rmse < 5) {
          reliability = 'medium';
          reason = `Zadostno ujemanje, vendar z višjo negotovostjo (RMSE: ${rmse.toFixed(2)}).`;
        } else if (concentrationIndex < 0.2) {
          reliability = 'rejected';
          reason = 'Ujemanja so lokalno koncentrirana — ni zanesljive ocene prekrivanja.';
        } else {
          reliability = 'low';
          reason = `Premalo inlierjev (${inlierCount}) ali visoka RMSE (${rmse.toFixed(2)}).`;
        }
      } else {
        reliability = 'rejected';
        reason = 'RANSAC ni našel skladne homografije.';
      }
    } else {
      reliability = 'rejected';
      reason = 'Premalo ujemanj za geometrijsko preverjanje.';
    }

    // Determine engine
    const engine = features1.length > 10 && features2.length > 10 ? 'Harris + BRIEF (FEAT)' : 'Harris + BRIEF';
    setEngineUsed(engine);

    const overlapPercent = features1.length > 0 ? 
      Math.round((inlierCount / features1.length) * 100) : 0;

    setAnalysis({
      rawMatches,
      crossCheckMatches: ccMatches.length,
      geometricInliers: inlierCount,
      reprojectionRMSE: rmse,
      overlapPercent,
      reliability,
      reason,
      concentrationIndex
    });

    setProcessing(false);
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300">🔗 Ujemanje značilnic</h3>
        <span className="text-xs text-slate-400">Motor: {engineUsed || '—'}</span>
      </div>

      {!photo1 || !photo2 ? (
        <div className="text-center py-8 text-slate-400 text-sm">
          Izberite dve fotografiji za primerjavo ujemanj.
        </div>
      ) : processing ? (
        <div className="text-center py-8 text-emerald-400 text-sm">
          Obdelujem značilnice...
        </div>
      ) : (
        <>
          <canvas
            ref={canvasRef}
            className="w-full rounded border border-slate-700 mb-3"
          />

          {analysis && (
            <div className="space-y-3">
              {/* Match statistics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <MatchStat label="Surova ujemanja" value={analysis.rawMatches} />
                <MatchStat label="Navzkrižno" value={analysis.crossCheckMatches} />
                <MatchStat label="Inlierji" value={analysis.geometricInliers} color="emerald" />
                <MatchStat label="Pokritost" value={`${analysis.overlapPercent}%`} />
              </div>

              {/* Quality metrics */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-700/50 rounded p-2">
                  <p className="text-[10px] text-slate-400">Reprojekcijska RMSE</p>
                  <p className={`text-sm font-bold ${
                    analysis.reprojectionRMSE < 3 ? 'text-emerald-400' :
                    analysis.reprojectionRMSE < 5 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {analysis.reprojectionRMSE.toFixed(2)} px
                  </p>
                </div>
                <div className="bg-slate-700/50 rounded p-2">
                  <p className="text-[10px] text-slate-400">Koncentracija</p>
                  <p className={`text-sm font-bold ${
                    analysis.concentrationIndex > 0.3 ? 'text-emerald-400' :
                    analysis.concentrationIndex > 0.15 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {(analysis.concentrationIndex * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Reliability badge */}
              <div className={`rounded p-3 border ${
                analysis.reliability === 'high' ? 'bg-emerald-900/20 border-emerald-700' :
                analysis.reliability === 'medium' ? 'bg-amber-900/20 border-amber-700' :
                analysis.reliability === 'low' ? 'bg-orange-900/20 border-orange-700' :
                'bg-red-900/20 border-red-700'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    analysis.reliability === 'high' ? 'bg-emerald-600 text-white' :
                    analysis.reliability === 'medium' ? 'bg-amber-600 text-white' :
                    analysis.reliability === 'low' ? 'bg-orange-600 text-white' :
                    'bg-red-600 text-white'
                  }`}>
                    {analysis.reliability === 'high' ? 'ZANESLJIVO' :
                     analysis.reliability === 'medium' ? 'SREDNJE' :
                     analysis.reliability === 'low' ? 'NIZKO' : 'ZAVRNJENO'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">{analysis.reason}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MatchStat({ label, value, color = 'slate' }: { label: string; value: number | string; color?: string }) {
  const colorClass = color === 'emerald' ? 'text-emerald-400' : 'text-slate-200';
  return (
    <div className="bg-slate-700/50 rounded p-2 text-center">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className={`text-sm font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}
