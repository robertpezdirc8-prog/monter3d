# Mera3D Pro — 3D Reconstruction Architecture & ARCore Assessment

## 1. Separate 3D Pipeline Architecture

### Overview

The core Mera3D Pro web application handles **2D measurements and fence configuration**.
For full 3D reconstruction from multiple photos, we propose a **separate optional pipeline**
that runs COLMAP + Open3D as a backend service, NOT as a required dependency of the web app.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Mera3D Pro Web App (Core)                     │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ CameraCapture │  │ Measurement  │  │ FenceConfigurator    │  │
│  │ (getUserMedia)│  │ Overlay      │  │ (Roksal catalog)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Perspective  │  │ OpenCV.js    │  │ Local Storage        │  │
│  │ Visualizer   │  │ (lazy load)  │  │ (IndexedDB)          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Optional: Export photos for 3D
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              3D Reconstruction Pipeline (Optional)               │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ COLMAP       │  │ Open3D       │  │ Results API          │  │
│  │ - SfM/MVS   │──│ - Point cloud │──│ - Mesh export        │  │
│  │ - Sparse     │  │ - Denoising  │  │ - Measurements       │  │
│  │ - Dense      │  │ - Meshing    │  │ - GLB/OBJ export     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
│  Deployment: Docker container or local CLI                       │
│  NOT bundled with web app                                        │
└─────────────────────────────────────────────────────────────────┘
```

### COLMAP Integration (Proposed)

**COLMAP** is the gold standard for Structure-from-Motion:
- Repository: https://github.com/colmap/colmap (12.9k stars)
- License: BSD-3-Clause
- Language: C++ with Python bindings (pycolmap)

**Workflow:**
1. User exports photos from Mera3D Pro (with calibration data)
2. Photos are sent to COLMAP backend (Docker or local)
3. COLMAP produces sparse point cloud + camera poses
4. Open3D processes dense reconstruction
5. Results are returned to Mera3D Pro for visualization

**Estimated accuracy:** ±2-5mm at 3m distance with good photos

### Open3D Integration (Proposed)

**Open3D** handles post-processing:
- Repository: https://github.com/isl-org/Open3D (14.1k stars)
- License: MIT
- Language: C++/Python

**Used for:**
- Point cloud denoising and filtering
- Surface reconstruction (Poisson, Ball Pivoting)
- Mesh simplification and export
- Measurement extraction from 3D model

---

## 2. License Assessment

| Library | Version | License | Commercial Use | Notes |
|---------|---------|---------|----------------|-------|
| OpenCV.js | 5.0.0 | Apache 2.0 | ✅ Yes | Notice required |
| COLMAP | 4.2.1 | BSD-3 | ✅ Yes | Check deps |
| Open3D | 0.20 | MIT | ✅ Yes | Check deps |
| DUSt3R | Latest | CC BY-NC-SA 4.0 | ❌ No | Non-commercial only |
| MASt3R | Latest | CC BY-NC-SA 4.0 | ❌ No | Non-commercial only |
| Fast3R | Latest | FAIR NC | ❌ No | Non-commercial only |

### OpenCV Notice Requirement

OpenCV 4.5.0+ uses Apache 2.0. Required notice:

```
This product includes software developed by the OpenCV project
(http://opencv.org/), licensed under the Apache License 2.0.

Copyright 2000-2026, OpenCV team.
```

### COLMAP Dependencies to Verify

COLMAP depends on:
- Ceres Solver (BSD-3) ✅
- PoseLib (BSD-3) ✅
- SiftGPU (research use only - verify for commercial) ⚠️
- VLFeat (BSD) ✅

**Action needed:** Verify SiftGPU license for commercial deployment.

### DUSt3R/MASt3R/Fast3R — NOT for Commercial Use

These AI-based reconstruction models use non-commercial licenses.
**Do NOT integrate into commercial products without confirmed rights.**

---

## 3. Android ARCore Depth API Assessment

### Overview

ARCore Depth API provides real-time depth estimation on Android devices.
This could enable **true AR measurements** without external hardware.

### Supported Devices

| Device Category | Examples | Depth API Support |
|----------------|----------|-------------------|
| Flagship (2020+) | Pixel 4+, Samsung S20+ | ✅ Full support |
| Mid-range (2021+) | Samsung A52+, Pixel 5a | ✅ Most supported |
| Budget (< 2020) | Various | ❌ Limited/None |
| iOS | iPhone 12+ (LiDAR) | N/A (ARKit instead) |

**Market coverage:** ~60-70% of active Android devices support Depth API

### Depth Data Return Modes

1. **Depth Map (per-frame)**
   - Resolution: Up to 240×180 (quarter resolution)
   - Format: Float16 depth in meters
   - Rate: 30 FPS on supported devices
   - Accuracy: ±1-3% at 1-4m distance

2. **Raw Depth Image**
   - Higher resolution but noisier
   - Includes confidence map
   - Requires more processing

3. **Occlusion Mode**
   - Virtual objects correctly occluded by real objects
   - Essential for AR fence visualization

### Integration Architecture for Mera3D

```
┌─────────────────────────────────────────────────┐
│           Android Native Layer (Kotlin)          │
│                                                  │
│  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ ARCore SDK   │  │ Depth API                │ │
│  │ - Session    │  │ - acquireDepthImage()    │ │
│  │ - Camera     │  │ - DepthImage → Float[]   │ │
│  │ - Anchors    │  │ - Confidence map         │ │
│  └──────────────┘  └──────────────────────────┘ │
│                                                  │
│  ┌──────────────────────────────────────────────┐│
│  │ Bridge (JNI/WebView)                         ││
│  │ - Depth data → JavaScript                    ││
│  │ - Camera pose → JavaScript                   ││
│  │ - Measurement results ← JavaScript           ││
│  └──────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
                    │
                    │ WebView Bridge
                    ▼
┌─────────────────────────────────────────────────┐
│           Mera3D Pro Web App                     │
│                                                  │
│  - Receives depth map as Float32Array            │
│  - Converts pixel+depth → real-world coordinates│
│  - Performs measurements using depth data        │
│  - Overlays fence visualization with occlusion   │
└─────────────────────────────────────────────────┘
```

### Estimated Accuracy with ARCore Depth

| Distance | Expected Accuracy | Notes |
|----------|------------------|-------|
| 0.5-1m | ±5-10mm | Very good for close-up |
| 1-3m | ±10-30mm | Good for fence measurement |
| 3-5m | ±30-50mm | Acceptable for rough estimates |
| 5m+ | ±50-100mm | Too imprecise for measurements |

### Implementation Effort Estimate

| Component | Effort | Priority |
|-----------|--------|----------|
| Android native wrapper | 2-3 weeks | P1 |
| WebView bridge | 1 week | P1 |
| Depth-to-measurement conversion | 1 week | P1 |
| AR fence overlay with occlusion | 2 weeks | P2 |
| Device compatibility testing | 1 week | P1 |
| Fallback for unsupported devices | 1 week | P2 |

**Total estimated effort:** 8-10 weeks for MVP

### Recommendation

**Phase 1 (Now):** Use OpenCV.js perspective transform + manual measurement
**Phase 2 (3-6 months):** Add ARCore Depth API for Android native wrapper
**Phase 3 (6-12 months):** Optional COLMAP backend for high-accuracy 3D

---

## 4. Dependency Size Budget

| Dependency | Minified | Gzipped | Load Strategy |
|-----------|----------|---------|---------------|
| OpenCV.js | 25.4 MB | 4.2 MB | Lazy (on-demand) |
| Core app | 361 KB | 101 KB | Initial |
| COLMAP | N/A (server) | N/A | Optional backend |
| Open3D | N/A (server) | N/A | Optional backend |

**Total initial load:** ~101 KB gzipped (unchanged)
**OpenCV.js load time:** ~5s on 4G, ~86s on slow 3G
**Strategy:** Load OpenCV.js only when user enters measurement/visualization mode

---

## 5. Open Items / Not Yet Supported

- [ ] JS-based perspective warp fallback (when OpenCV.js fails to load)
- [ ] Fence board rendering on warped surface (texture mapping)
- [ ] COLMAP Docker deployment configuration
- [ ] Open3D mesh export to GLB/OBJ
- [ ] ARCore Android native wrapper
- [ ] iOS ARKit LiDAR integration
- [ ] SiftGPU commercial license verification
- [ ] DUSt3R/MASt3R commercial rights assessment
- [ ] Real-time depth-guided measurement on mobile
- [ ] Multi-photo 3D reconstruction in browser (WebGPU-based)
