# Third-Party Licenses

This document lists all third-party dependencies used in Mera3D Pro, their licenses, and usage restrictions.

**Last updated:** 2026-01-11

---

## Direct Dependencies

### React & Build Tools

| Package | Version | License | Commercial Use | Notes |
|---------|---------|---------|----------------|-------|
| react | ^18.3.1 | MIT | ✅ Yes | |
| react-dom | ^18.3.1 | MIT | ✅ Yes | |
| typescript | ^5.7.3 | Apache-2.0 | ✅ Yes | |
| vite | ^6.0.7 | MIT | ✅ Yes | |
| tailwindcss | ^4.0.0 | MIT | ✅ Yes | |
| @tailwindcss/vite | ^4.0.0 | MIT | ✅ Yes | |
| vitest | ^3.2.4 | MIT | ✅ Yes | |

### Application Dependencies

| Package | Version | License | Commercial Use | Notes |
|---------|---------|---------|----------------|-------|
| uuid | ^11.0.5 | MIT | ✅ Yes | |
| @supabase/supabase-js | ^2.49.1 | MIT | ✅ Yes | Optional cloud sync |
| @techstark/opencv-js | ^5.0.0 | Apache-2.0 | ✅ Yes | Lazy-loaded, 4.2MB gzipped |
| framer-motion | ^12.0.0 | MIT | ✅ Yes | |
| recharts | ^2.15.0 | MIT | ✅ Yes | |
| lucide-react | ^0.469.0 | ISC | ✅ Yes | |

---

## OpenCV.js Notice

This product includes software developed by the OpenCV project (https://opencv.org/), licensed under the Apache License 2.0.

```
Copyright 2000-2026, OpenCV team.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

OpenCV.js is loaded lazily (on-demand) and is NOT included in the initial bundle.
Size: ~25.4 MB minified / ~4.2 MB gzipped.

---

## Roksal Images & Data

All Roksal product images, profiles, and catalog data are property of **Roksal d.o.o.**
Used with permission for product visualization within Mera3D Pro.

- Source: https://roksal.com
- Usage: Internal product visualization only
- Redistribution: NOT permitted without written consent from Roksal d.o.o.
- HEX color values are approximations; actual colors may vary

---

## Proposed Dependencies (Not Yet Integrated)

### COLMAP

| Item | Details |
|------|---------|
| Repository | https://github.com/colmap/colmap |
| Version | 4.2.1 |
| License | BSD-3-Clause |
| Commercial Use | ✅ Yes (with conditions) |
| Status | **DOCUMENTED ONLY** - not integrated |

**COLMAP Dependencies to Verify:**
- Ceres Solver: BSD-3 ✅
- PoseLib: BSD-3 ✅
- SiftGPU: **Research-only license** ⚠️ **Requires written permission for commercial use**
- VLFeat: BSD ✅

**Action Required:** Before commercial deployment, obtain written permission for SiftGPU or replace with alternative feature detector (e.g., ORB, AKAZE).

### Open3D

| Item | Details |
|------|---------|
| Repository | https://github.com/isl-org/Open3D |
| Version | 0.20 |
| License | MIT |
| Commercial Use | ✅ Yes |
| Status | **DOCUMENTED ONLY** - not integrated |

### DUSt3R / MASt3R / Fast3R

| Model | License | Commercial Use | Status |
|-------|---------|----------------|--------|
| DUSt3R | CC BY-NC-SA 4.0 | ❌ **NO** | Do not integrate |
| MASt3R | CC BY-NC-SA 4.0 | ❌ **NO** | Do not integrate |
| Fast3R | FAIR NC Research | ❌ **NO** | Do not integrate |

**These models are NOT suitable for commercial products.**
Do NOT integrate without confirmed commercial rights from rights holders.

### ARCore Depth API (Android)

| Item | Details |
|------|---------|
| Provider | Google |
| License | Apache 2.0 |
| Commercial Use | ✅ Yes |
| Status | **ASSESSMENT ONLY** - no code |

ARCore is available for Android devices with Depth API support.
Integration requires native Android wrapper (Kotlin/Java).

---

## License Compliance Checklist

- [x] All direct dependencies have permissive licenses (MIT, Apache-2.0, ISC)
- [x] OpenCV.js Apache 2.0 notice included
- [x] Roksal images used with permission
- [ ] SiftGPU commercial license verified (REQUIRED before COLMAP integration)
- [ ] DUSt3R/MASt3R/Fast3R NOT integrated (non-commercial licenses)
- [ ] No AI models with restrictive licenses in production build

---

## Distribution Requirements

When distributing Mera3D Pro:

1. **Include this THIRD-PARTY-LICENSES.md file**
2. **Include OpenCV Apache 2.0 license text** (shown above)
3. **Include MIT license texts** for React, Vite, Tailwind, etc.
4. **Do NOT redistribute Roksal images** without permission
5. **Do NOT include DUSt3R/MASt3R/Fast3R** in commercial builds

---

## Legal Review Status

| Component | Status | Action Required |
|-----------|--------|-----------------|
| Core dependencies | ✅ Cleared | None |
| OpenCV.js | ✅ Cleared | Include notice |
| Roksal data | ⚠️ Permission needed | Written consent from Roksal |
| COLMAP + SiftGPU | ❌ Not cleared | Verify SiftGPU license |
| DUSt3R/MASt3R | ❌ Not cleared | Do not use commercially |

---

**For legal questions, consult with a qualified attorney.**
This document is provided as-is and does not constitute legal advice.
