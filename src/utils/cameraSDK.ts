/**
 * cameraSDK.ts — "Kamera SDK" (namesto AI modela)
 * =================================================
 * 100% brezplačna, offline skripta/SDK brez AI/ML modelov in brez CDN.
 * Vse temelji na standardnih brskalniških API-ih:
 *   - MediaDevices / getUserMedia  → živ predogled kamere
 *   - ImageCapture + MediaStreamTrack.getCapabilities() → foto zajem, zoom, bliskavica, fokus
 *   - Canvas API                    → obdelava sličic (downscale, histogram, ostrina)
 *   - DeviceOrientation + Geolocation → metapodatki meritve (nagnom, lokacija)
 *
 * Namenjen monterjem: balkonske ograje, keramičarji, fasaderji, krovci.
 * Podpira tipove meritev značilne za posamezno obrt (see TRADE_PROFILES).
 */

// ─────────────────────────────────────────────
// Tipi
// ─────────────────────────────────────────────

export type TradeId = 'ograje' | 'keramika' | 'fasade' | 'krovstvo';

export interface MeasurementRequirement {
  id: string;
  label: string;          // slovensko navodilo za monterja
  hint: string;           // kaj snemati s kamero
  minPhotos: number;
  reference?: 'a4' | 'metro' | 'coin' | 'level'; // referenčni predmet za merilo
}

export interface TradeProfile {
  id: TradeId;
  name: string;
  icon: string;           // emoji (brez zunanjih ikon => offline)
  description: string;
  requirements: MeasurementRequirement[];
}

export interface CameraCapabilitiesInfo {
  supported: boolean;
  facingModes: string[];
  zoomRange: { min: number; max: number; step: number } | null;
  torchSupported: boolean;
  focusModes: string[];
  exposureModes: string[];
  whiteBalanceModes: string[];
  photoResolutions: Array<{ width: number; height: number }>;
}

export interface FrameStats {
  width: number;
  height: number;
  /** Laplacian variance ~ ostrina (pod 60 = zamegleno) */
  sharpness: number;
  /** povprečna svetlost 0..255 */
  meanBrightness: number;
  /** delež pikslov v sencah (motenje za merjenje) */
  darkRatio: number;
  quality: 'good' | 'blurry' | 'too_dark' | 'too_bright';
}

// ─────────────────────────────────────────────
// Profili obrti — vsebina za monterje
// ─────────────────────────────────────────────

export const TRADE_PROFILES: Record<TradeId, TradeProfile> = {
  ograje: {
    id: 'ograje',
    name: 'Balkonske ograje',
    icon: '🏗️',
    description: 'Merjenje in fotografiranje balkonskih/strešnih ograj (Roksal program panelov).',
    requirements: [
      { id: 'ograja_fronta', label: 'Celoten pogled na ograjo', hint: 'Fotografiraj celotno dolžino ograje pravokotno s sredine razdalje.', minPhotos: 1, reference: 'metro' },
      { id: 'ograja_visina', label: 'Višina in ročaj', hint: 'Detalj: višina od tal do vrha ročaja, metrična vira ob stebričku.', minPhotos: 2, reference: 'metro' },
      { id: 'ograja_stebricki', label: 'Razmiki stebričkov', hint: 'Vsak spoj/podkonstrukcija — posnemi razmik A-B-C po celotni dolžini.', minPhotos: 3, reference: 'a4' },
      { id: 'ograja_koti', label: 'Koti in prehodi', hint: 'Notranji/zunanji kot, prehod na stopnišče ali lopo.', minPhotos: 1 },
      { id: 'ograja_podlaga', label: 'Podlaga montaže', hint: 'Betonski rob, vogalni profili, način pritrditve s kemičnimi sidrami/vijaki.', minPhotos: 1 },
    ],
  },
  keramika: {
    id: 'keramika',
    name: 'Keramika / ploščice',
    icon: '🧱',
    description: 'Zajem dimenzij prostora, pozicij inštalacij in vzorca polaganja.',
    requirements: [
      { id: 'ker_tloris', label: 'Tloris prostora', hint: 'Posnemi vsak zid od tal do stropa, prekrivanje kotov ~30 %.', minPhotos: 4 },
      { id: 'ker_dimenzije', label: 'Dimenzije (širina×višina)', hint: 'Metro ali A4 papir ob merjeni stranici za skaliranje slike.', minPhotos: 2, reference: 'a4' },
      { id: 'ker_instalacije', label: 'Inštalacije in odvodi', hint: 'Odtok, cevi, stikala — razdalje do vogalov.', minPhotos: 2, reference: 'metro' },
      { id: 'ker_vzorec', label: 'Vzorec/polaganje', hint: 'Trenutna podlaga: raven, nagib proti odtoku (preveri z vodotekom).', minPhotos: 1, reference: 'level' },
      { id: 'ker_prehodi', label: 'Prehodi in stiki', hint: 'Stik z drugimi materiali (les, kamen, okno, vrata).', minPhotos: 1 },
    ],
  },
  fasade: {
    id: 'fasade',
    name: 'Fasade',
    icon: '🎨',
    description: 'Stanje obstoječe fasade, detajli robov, oken in montažnih elementov.',
    requirements: [
      { id: 'fas_celo', label: 'Celotna fasada', hint: 'Zajemi celotno ploskev s koraki (parallax), desno→levo.', minPhotos: 3 },
      { id: 'fas_poškodbe', label: 'Razpoke in poškodbe', hint: 'Detalj vsake razpoke z A4 listom poleg za merilo.', minPhotos: 1, reference: 'a4' },
      { id: 'fas_okna', label: 'Okna in odprtine', hint: 'Širina/visina odprtin, globina vhodnega okvirja.', minPhotos: 2, reference: 'metro' },
      { id: 'fas_detajli', label: 'Robovi in detajli', hint: 'Kapi, štoklani, fuge, toplotne črpe—kjer je vidna poškodba.', minPhotos: 2 },
      { id: 'fas_osnova', label: 'Podlaga/sistem', hint: 'Tip podlage: žbuka, ETICS, lesena opa—bližje posnemi material.', minPhotos: 1 },
    ],
  },
  krovstvo: {
    id: 'krovstvo',
    name: 'Krovci',
    icon: '🏠',
    description: 'Strešine: naklon, dimenzije ploskev, detajli strešnih oken in ostrešij.',
    requirements: [
      { id: 'kro_ploskev', label: 'Strešne ploskve', hint: 'Vsaka ploskev posebej, pravokotno čim bližje ravnini strehe.', minPhotos: 2 },
      { id: 'kro_naklon', label: 'Naklon strehe', hint: 'Posnemi med tem ko držiš levelirjem ob levi/strehi (telefon poroča nagib).', minPhotos: 1, reference: 'level' },
      { id: 'kro_dimenzije', label: 'Dimenzije (razpon×dolžina)', hint: 'Z merilnim trakom vidnim na sliki — od robu do grebena.', minPhotos: 2, reference: 'metro' },
      { id: 'kro_prehodi', label: 'Strešna okna, dimniki, sonde', hint: 'Obseg in lego vsakega prehoda glede na strešne module.', minPhotos: 2 },
      { id: 'kro_odvod', label: 'Odvod in sneg', hint: 'Žlebovi, mračnice, protisnežne ovire—stanje in razmiki.', minPhotos: 1 },
    ],
  },
};

// ─────────────────────────────────────────────
// SDK: kamera (getUserMedia wrapper brez AI)
// ─────────────────────────────────────────────

export interface CameraSDKOptions {
  facingMode?: 'environment' | 'user';
  preferredWidth?: number;
  preferredHeight?: number;
}

/** Branje zmožnosti tracka — varno, vrnimo prazno če brskalnik ne podpira. */
function readCapabilities(track: MediaStreamTrack): any {
  const src = track as any;
  if (typeof src.getCapabilities === 'function') {
    try { return src.getCapabilities(); } catch { /* ignore */ }
  }
  return {};
}

export class CameraSDK {
  private stream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private imageCapture: any = null;

  get isLive(): boolean {
    return this.stream !== null && this.stream.getVideoTracks().length > 0;
  }

  get activeTrack(): MediaStreamTrack | null {
    return this.stream?.getVideoTracks()[0] ?? null;
  }

  /** Zažene živo kamero v podanem <video> elementu. */
  async start(videoEl: HTMLVideoElement, opts: CameraSDKOptions = {}): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Brskalnik ne podpira getUserMedia (potreben HTTPS).');
    }
    this.stop();
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: opts.facingMode ?? 'environment',
        width: { ideal: opts.preferredWidth ?? 1920 },
        height: { ideal: opts.preferredHeight ?? 1080 },
      },
      audio: false,
    };
    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.videoEl = videoEl;
    videoEl.srcObject = this.stream;
    await videoEl.play();
    const track = this.activeTrack;
    if (track && typeof (window as any).ImageCapture === 'function') {
      try { this.imageCapture = new (window as any).ImageCapture(track); }
      catch { this.imageCapture = null; }
    }
  }

  stop(): void {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.imageCapture = null;
    if (this.videoEl) this.videoEl.srcObject = null;
  }

  /** Preklop sprednja/hrbtna kamera. */
  async switchCamera(facingMode: 'environment' | 'user'): Promise<boolean> {
    if (!this.videoEl) return false;
    const current = this.activeTrack
      ? (readCapabilities(this.activeTrack).facingMode || []).includes(facingMode)
      : false;
    if (!current) return false;
    await this.start(this.videoEl, { facingMode });
    return true;
  }

  /** Zmožnosti trenutne kamere za UI (zoom, bliskavica, fokus…). */
  getCapabilitiesInfo(): CameraCapabilitiesInfo {
    const track = this.activeTrack;
    if (!track) {
      return { supported: false, facingModes: [], zoomRange: null, torchSupported: false,
               focusModes: [], exposureModes: [], whiteBalanceModes: [], photoResolutions: [] };
    }
    const cap = readCapabilities(track);
    const zoom = cap.zoom;
    let zoomRange: CameraCapabilitiesInfo['zoomRange'] = null;
    if (zoom && typeof zoom.min === 'number') {
      zoomRange = { min: zoom.min, max: zoom.max ?? zoom.min, step: zoom.step ?? 0.1 };
    }
    const res: CameraCapabilitiesInfo['photoResolutions'] = [];
    if (Array.isArray(cap.photoModes)) {
      for (const pm of cap.photoModes) {
        const w = pm?.image?.width?.max ?? pm?.width;
        const h = pm?.image?.height?.max ?? pm?.height;
        if (w && h) res.push({ width: w, height: h });
      }
    }
    return {
      supported: true,
      facingModes: cap.facingMode ?? ['environment'],
      zoomRange,
      torchSupported: !!cap.torch,
      focusModes: cap.focusMode ?? [],
      exposureModes: cap.exposureMode ?? [],
      whiteBalanceModes: cap.whiteBalanceMode ?? [],
      photoResolutions: res,
    };
  }

  /** Nastavi digitalni zoom (če ga naprava podpira). Vrne dejansko vrednost. */
  async setZoom(value: number): Promise<number | null> {
    const track = this.activeTrack;
    if (!track) return null;
    const cap = readCapabilities(track);
    if (!cap.zoom) return null;
    const clamped = Math.min(Math.max(value, cap.zoom.min), cap.zoom.max ?? value);
    try {
      await (track as any).applyConstraints({ advanced: [{ zoom: clamped }] as any });
      return clamped;
    } catch { return null; }
  }

  /** Bliskavica: 'torch' (neprekinjeno) ali 'auto'. */
  async setTorch(on: boolean): Promise<boolean> {
    const track = this.activeTrack;
    if (!track) return false;
    const cap = readCapabilities(track);
    if (!cap.torch) return false;
    try {
      await (track as any).applyConstraints({ advanced: [{ torch: on }] as any });
      return on;
    } catch { return false; }
  }

  /** Fokus na dotik (che podprto): x,y v koordinatah videa (px). */
  async focusAt(x: number, y: number): Promise<boolean> {
    const track = this.activeTrack;
    if (!track || !this.videoEl) return false;
    const cap = readCapabilities(track);
    if (!(cap.focusMode || []).includes('single-shot')) return false;
    try {
      const settings = track.getSettings();
      const vw = settings.width ?? this.videoEl.videoWidth ?? 1;
      const vh = settings.height ?? this.videoEl.videoHeight ?? 1;
      const relX = Math.min(Math.max(x / (this.videoEl.clientWidth || 1), 0), 1);
      const relY = Math.min(Math.max(y / (this.videoEl.clientHeight || 1), 0), 1);
      await (track as any).applyConstraints({
        advanced: [{ focusMode: 'single-shot' } as any],
      });
      // Points-of-interest (nov API, fallback tiho ignoriran)
      try {
        await (track as any).applyConstraints({
          advanced: [{ pointsOfInterest: { x: relX, y: relY } } as any],
        });
      } catch { /* ni podprto */ }
      void vw; void vh;
      return true;
    } catch { return false; }
  }

  /**
   * Zajem fotografije. Uporabi ImageCapture.grabFrame če je na voljo
   * (polna ločljivost), sicer canvas drawImage fallback.
   */
  async capturePhoto(maxWidth = 2048): Promise<{ blob: Blob; dataUrl: string; stats: FrameStats }> {
    let source: HTMLCanvasElement | null = null;
    if (this.imageCapture?.grabFrame) {
      try {
        const frame: VideoFrame = await this.imageCapture.grabFrame();
        source = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / frame.displayWidth);
        source.width = Math.round(frame.displayWidth * scale);
        source.height = Math.round(frame.displayHeight * scale);
        source.getContext('2d')!.drawImage(frame, 0, 0, source.width, source.height);
        frame.close();
      } catch { source = null; }
    }
    if (!source) {
      if (!this.videoEl) throw new Error('Kamera ni zagnana.');
      const v = this.videoEl;
      source = document.createElement('canvas');
      const scale = Math.min(1, maxWidth / (v.videoWidth || maxWidth));
      source.width = Math.round((v.videoWidth || 1280) * scale);
      source.height = Math.round((v.videoHeight || 720) * scale);
      source.getContext('2d')!.drawImage(v, 0, 0, source.width, source.height);
    }
    const stats = analyzeFrame(source);
    const dataUrl = source.toDataURL('image/jpeg', 0.9);
    const blob: Blob = await new Promise((res, rej) =>
      source!.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/jpeg', 0.9));
    return { blob, dataUrl, stats };
  }

  /** Neprekinjen nadzor kakovosti živega predogleda (~4x/s). */
  startLiveQualityWatch(cb: (stats: FrameStats) => void, intervalMs = 250): () => void {
    const timer = window.setInterval(() => {
      if (!this.videoEl || this.videoEl.videoWidth === 0) return;
      const c = document.createElement('canvas');
      c.width = 320;
      c.height = Math.round(320 * this.videoEl.videoHeight / this.videoEl.videoWidth);
      c.getContext('2d')!.drawImage(this.videoEl, 0, 0, c.width, c.height);
      cb(analyzeFrame(c));
    }, intervalMs);
    return () => window.clearInterval(timer);
  }
}

// ─────────────────────────────────────────────
// Analiza sličice (klasični CV, brez AI)
// ─────────────────────────────────────────────

/** Sivi kanal + downscale na največ 400 px širine. */
function toGray(canvas: HTMLCanvasElement): { data: Float32Array; w: number; h: number } {
  const targetW = Math.min(canvas.width, 400);
  const scale = targetW / canvas.width;
  const c = document.createElement('canvas');
  c.width = targetW;
  c.height = Math.max(1, Math.round(canvas.height * scale));
  const ctx = c.getContext('2d')!;
  ctx.drawImage(canvas, 0, 0, c.width, c.height);
  const img = ctx.getImageData(0, 0, c.width, c.height).data;
  const gray = new Float32Array(c.width * c.height);
  for (let i = 0, p = 0; i < img.length; i += 4, p++) {
    gray[p] = 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2];
  }
  return { data: gray, w: c.width, h: c.height };
}

/**
 * Kakovost kadra: Laplaceova varianca (ostrina) + histogram (svetlost).
 * Uporablja se za samodejno opozorilo "drži mirno / več svetlobe".
 */
export function analyzeFrame(canvas: HTMLCanvasElement): FrameStats {
  const { data, w, h } = toGray(canvas);
  let sum = 0, dark = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    if (data[i] < 30) dark++;
  }
  const mean = sum / data.length;

  // Laplacian kernel [[0,1,0],[1,-4,1],[0,1,0]]
  let lSum = 0, lSq = 0, n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = data[i - w] + data[i + w] + data[i - 1] + data[i + 1] - 4 * data[i];
      lSum += lap; lSq += lap * lap; n++;
    }
  }
  const sharpness = n > 0 ? lSq / n - (lSum / n) ** 2 : 0;

  let quality: FrameStats['quality'] = 'good';
  if (sharpness < 60) quality = 'blurry';
  else if (mean < 45) quality = 'too_dark';
  else if (mean > 235) quality = 'too_bright';

  return {
    width: canvas.width,
    height: canvas.height,
    sharpness: Math.round(sharpness),
    meanBrightness: Math.round(mean),
    darkRatio: +(dark / data.length).toFixed(3),
    quality,
  };
}

// ─────────────────────────────────────────────
// Metapodatki meritev: nagnom + lokacija (API, brez SDK-jev tretjih oseb)
// ─────────────────────────────────────────────

export interface CaptureMeta {
  headingDeg: number | null;     // smer pogleda (0=N)
  tiltDeg: number | null;        // nagib telefona (za naklon strehe!)
  lat: number | null;
  lon: number | null;
  accuracyM: number | null;
  timestamp: string;
}

export async function collectCaptureMeta(): Promise<CaptureMeta> {
  const meta: CaptureMeta = {
    headingDeg: null, tiltDeg: null, lat: null, lon: null, accuracyM: null,
    timestamp: new Date().toISOString(),
  };
  // Nagnom: DeviceOrientation (iOS potrebuje dovoljenje v gesture handlerju)
  try {
    const anyDO = (DeviceOrientationEvent as any)?.requestPermission;
    if (typeof anyDO === 'function' && anyDO) {
      const perm = await anyDO.call(DeviceOrientationEvent);
      if (perm !== 'granted') throw new Error('orientation denied');
    }
    const reading = await new Promise<any>((resolve, reject) => {
      const to = setTimeout(() => reject(new Error('orientation timeout')), 1500);
      const on = (e: DeviceOrientationEvent) => {
        window.removeEventListener('deviceorientation', on);
        clearTimeout(to); resolve(e);
      };
      window.addEventListener('deviceorientation', on, { once: true });
    });
    meta.tiltDeg = reading.beta != null ? Math.round(reading.beta - 90) : null;
    const ch = (reading as any).webkitCompassHeading;
    meta.headingDeg = typeof ch === 'number' ? Math.round(ch)
      : reading.alpha != null ? Math.round((360 - reading.alpha) % 360) : null;
  } catch { /* tih fallback */ }
  // Lokacija
  try {
    if (navigator.geolocation) {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        const to = setTimeout(() => reject(new Error('geo timeout')), 4000);
        navigator.geolocation.getCurrentPosition(
          p => { clearTimeout(to); resolve(p); },
          e => { clearTimeout(to); reject(e); },
          { enableHighAccuracy: true, timeout: 4000, maximumAge: 30000 });
      });
      meta.lat = +pos.coords.latitude.toFixed(6);
      meta.lon = +pos.coords.longitude.toFixed(6);
      meta.accuracyM = Math.round(pos.coords.accuracy);
    }
  } catch { /* user zavrne */ }
  return meta;
}

// Singleton za celotno aplikacijo
export const cameraSDK = new CameraSDK();
