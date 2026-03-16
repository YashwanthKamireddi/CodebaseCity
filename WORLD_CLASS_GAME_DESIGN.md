# World-Class 3D City Game Design System

> A deep-dive architecture and design analysis for Codebase City.
> Written from the perspective of a world-class game engineer + technical director.

---

## 1. Reference Analysis — What the Best Do

### 1.1 Cyberpunk 2077 Night City
**Rendering tricks we can steal:**
- Overworldrendered bloom on all emissive surfaces (threshold ≈ 0.1 luma) — **already added**
- Holographic billboards that render pseudo-text / scanlines — **HolographicBillboards.jsx added**
- Rain droplets on the "camera lens" as a postprocess pass (ChromaticAberration + Noise in wet conditions)
- Car headlight god-rays via volumetric fog slices — approximate with a radial blur fullscreen pass
- Cinematic depth-of-field that racks focus when you hover a building

**Lesson**: Every bright surface feeds the bloom pipeline. Overdrive emissives `* 2.5–4.0` so they glow visibly. We do this in every new shader.

---

### 1.2 Tron Legacy (our aesthetic north star)
**Key techniques:**
- All geometry is dark (`#050810`) with glowing edge outlines
- Grid lines pulse with a slow travelling wave (our Ground.jsx does this)
- Light-cycle trails: thin coloured Lines with a fading tail — we can do this for dependency edges
- No ambient light — all light is emitted from objects themselves (we use `MeshBasicMaterial` / `toneMapped: false` throughout)
- UI panels are translucent with scanlines and CRT flicker — our HologramPanel does this

**Lesson**: Darkness amplifies glow. The background must be near-black, letting emissive geometry own the frame.

---

### 1.3 Cities: Skylines
**Systems we should match:**
- **Info layers** that colour the city by a chosen metric (complexity, coupling, churn) — **we already do this** via color_metric + colorUtils
- **Time-lapse** that shows city growth over commits — **our TimelineController does this**
- **Per-district statistics** overlaid as floating panels — **DistrictLabels + HologramPanel**
- **LOD system** dropping poly count beyond 500m — partially done by InstancedCity; needs formal LOD manager
- **Procedural road network** from graph layout — our Roads.jsx generates from building positions

**Lesson**: Info density increases perceived depth. Layers that can be toggled make the city readable.

---

### 1.4 Journey (thatgamecompany)
**Atmosphere techniques:**
- Rolling sand dunes = we translate to subtle atmospheric fog (`<fog>`)
- Sound design: 3 ambient layers (bass drone, mid texture, high sparkle) mixed by user action — **not yet implemented**
- Particle wind streams that respond to camera direction — AtmosphericParticles.jsx partially does this
- Everything feels alive even when static — achieved by very low frequency oscillation on every element

**Lesson**: The world must breathe even at 0 interactions per second. Every component needs a subtle idle animation.

---

### 1.5 Bruno Simon Portfolio (threejs.journey.com)
**Web-native innovations:**
- Physics-based interaction (cannon-es) driving engagement — we could do a "flick" interaction on buildings
- Sound activated by cursor position — hover over a building plays a tone whose pitch = complexity score
- Camera spring/inertia using lerp on every frame — **our CameraController does this**
- Intro sequence: object assembles from particles, then camera flies to start position — **not yet implemented**

**Lesson**: The onboarding sequence sets the emotional tone for the whole experience.

---

### 1.6 Active Theory (activetheo.ry interactive web)
**Cinematic web techniques:**
- GPU particle explosions on state transitions — filing a repo triggers a particle burst
- Custom postprocessing passes written in raw GLSL — beyond postprocessing presets
- Screen-space reflection on dark ground planes — SSR at low resolution for ground
- `EffectComposer` chaining 5–8 passes in sequence — **we now have Bloom + Vignette + Noise**

**Lesson**: Transitions communicate system state changes. Loading a new repo should feel like a world collision, not a spinner.

---

## 2. Current State Inventory

### 2.1 Active Components (draw-call budget)

| Component | Draw Calls | useFrame fps | Notes |
|---|---|---|---|
| InstancedCity | 1 | 30 | GPU-instanced, O(1) selection update |
| Roads | 1 | 30 | Roundabouts + straight roads |
| Ground | 1 | 0 | Static grid |
| NeonDistrictBorders | 1 | 0 | Static line segments |
| DataStreams | 1 | 30 | Dependency flow tubes |
| AtmosphericParticles | 1 | 30 (alt frames) | 300 dust points |
| MothershipCore | ~4 | 30 | Rings + core |
| EnergyCoreReactor | ~3 | 30 | Nexus spire |
| DistrictFloors | 1 | 0 | Translucent floor planes |
| DistrictLabels | n | 0 | HTML overlays |
| CommTowers | 1 | 10 | Antenna spires |
| SkyBridges | 1 | 30 | Glowing connectors |
| EmergencyBeacons | 1 | 30 | Instanced octahedra |
| EnergyShieldDome | 1 | 30 | GLSL hex dome |
| LandingPads | ~n | 30 | Canvas texture per pad |
| PulseWaves | 1 | 30 | Radial sonar rings |
| HolographicBillboards | ~5 | 30 | Pseudo-kanji screens |
| OrbitalSatellites | 1 | 30 | 80 GPU-instanced |
| SentinelDrones | 4 | 30 | 30 drones × 4 meshes |
| Starfield | 1 | 10 | 3000 GPU-instanced stars |
| **Total** | **~35** | — | Target < 50 |

### 2.2 Postprocessing Pipeline

```
Canvas render → EffectComposer (HDR buffer) →
  Bloom  (luminanceThreshold=0.12, intensity=1.6, mipmapBlur, 8 levels) →
  Vignette (offset=0.28, darkness=0.62) →
  Noise (opacity=0.022) →
  Output
```

Applied only on `!isLowEnd` (hardware-concurrency > 4 and no touch input).

---

## 3. Tier System — Improvements by Priority

### TIER 0 — DONE (this session)

- [x] @react-three/postprocessing installed (v3.0.4)
- [x] Bloom + Vignette + Noise EffectComposer (App.jsx)
- [x] Starfield (3000 instanced stars, twinkle shader, Bloom-fed)
- [x] Activated CommTowers, SkyBridges, EmergencyBeacons, EnergyShieldDome, LandingPads, PulseWaves
- [x] HolographicBillboards (CRT scanlines, pseudo-kanji, chromatic glitch)
- [x] OrbitalSatellites (80 orbital bodies, Bloom-fed)
- [x] SentinelDrones (30 quadcopters, scanning cones, hover physics)

---

### TIER 1 — High Impact, Low Risk (next sprint)

#### 1.1 Depth-of-Field on Building Selection
**What**: When the user selects a building, rack focus to it — background blurs.
**How**: `import { DepthOfField } from '@react-three/postprocessing'`. Add to EffectComposer conditionally when `selectedBuilding` is set.
```jsx
{selectedBuilding && !isLowEnd && (
  <DepthOfField
    focusDistance={focusDist}  // computed from camera distance to building
    focalLength={0.025}
    bokehScale={3.0}
  />
)}
```
**Effort**: ~30 min. **Impact**: Huge — makes selections feel cinematic.

#### 1.2 ChromaticAberration on Camera Move
**What**: Subtle RGB split when the camera is moving; fades to 0 when still.
**How**: Track camera velocity in CameraController, pass as uniform to a custom `ChromaticAberration` effect. Use drei's `useFrame` to update `offset` each frame.
**Implementation sketch**:
```jsx
const abRef = useRef()
useFrame(() => {
  const v = cameraVelocity.current           // magnitude of camera delta
  abRef.current.offset.set(v * 0.002, 0)    // horizontal CA
})
<ChromaticAberration ref={abRef} offset={[0, 0]} />
```
**Effort**: ~1h. **Impact**: Medium — adds life to fly-to animations.

#### 1.3 HDR Environment Map
**What**: Replace ambient `color="black"` with an HDRI probe for subtle environment reflections.
**How**: Use drei's `<Environment preset="night" />` or a custom exr.
**Caveat**: Only add if materials switch from `MeshBasicMaterial` to `MeshStandardMaterial`. Currently most materials are unlit by design — keep this optional via a toggle.
**Effort**: ~2h (requires material audit). **Impact**: Medium for lit materials.

#### 1.4 Ambient Sound Layer (Web Audio API)
**What**: Low-frequency synth drone that plays while the city is visible. Pitch subtly changes based on total complexity score.
**How**:
```js
// useCityAmbience.js
const ctx = new AudioContext()
const osc = ctx.createOscillator()
osc.type = 'sawtooth'
osc.frequency.value = 60 + (totalComplexity / 1000) * 20  // 60–80Hz
const gain = ctx.createGain()
gain.gain.value = 0.04
osc.connect(gain).connect(ctx.destination)
```
Add UI toggle (mute button in toolbar). Resume AudioContext on first user gesture.
**Effort**: ~3h (incl. UI). **Impact**: Transforms the emotional register.

---

### TIER 2 — Medium Impact, Medium Complexity

#### 2.1 Cinematic Intro Sequence
**What**: On first page load (no cached data), play a 4-second flythrough that assembles the city.
**Sequence**:
1. Camera starts 8000 units above, looking straight down
2. Tween to isometric position over 3s with ease-in-out
3. Buildings rise from floor during descent (already have spring animation in InstancedCity? Add if not)
4. HolographicCityName fades in at t=2.5s

**How**: Zustand flag `isIntroPlaying`. CameraController checks it and runs a scripted path instead of responding to user input. Buildings start at `scale.y = 0` and tween to full height via `useFrame`.

**Effort**: ~4h. **Impact**: Huge for first impressions.

#### 2.2 Minimap Overlay
**What**: A 180×180px 2D canvas in the corner showing a top-down district map with the camera frustum drawn as a trapezoid.
**How**: Separate `<Canvas orthographic>` in the UI layer (not inside the 3D canvas). Read building positions from zustand. Draw districts as coloured rectangles. Update camera frustum position via `useFrame` + a shared Zustand value.
**Effort**: ~5h. **Impact**: High — players get context for large repos.

#### 2.3 Building Hover Ripple
**What**: When the mouse hovers a building, a concentric ring ripple expands outward from its base.
**How**: Maintain a `ripples[]` array in `useInteractionSlice`. Each ripple has `{x, z, t0}`. In `PulseWaves.jsx` (or a new `HoverRipples.jsx`), compute `t - t0` as the ripple phase. Scale and fade based on that.
**Effort**: ~2h. **Impact**: Medium — tactile feedback makes selection feel good.

#### 2.4 Dependency Arc Visualization
**What**: When a building is selected, animated bezier arcs fly from it to all its dependents.
**How**: Use drei's `<QuadraticBezierLine>` or a custom `TubeGeometry` built from a `QuadraticBezierCurve3`. Animate tube `drawRange` from 0 → full on mount.
```jsx
<QuadraticBezierLine
  start={building.position}
  end={dep.position}
  mid={midpoint}
  color="#00f0ff"
  lineWidth={1.5}
/>
```
**Effort**: ~3h. **Impact**: High — makes the dependency graph visible spatially.

---

### TIER 3 — High Complexity, Very High Impact

#### 3.1 Dynamic Weather System Tied to Code Health
**What**: Repo health drives weather conditions:
- Low complexity + low coupling → clear sky, Starfield bright
- High coupling → light fog (`<fog near={400} far={2000} />`)
- High churn + bad coverage → rain particles (adapt AtmosphericParticles to fall downward)
- Critical complexity everywhere → red emergency lightning flashes

**Implementation**:
```js
// In createCitySlice.js
const healthScore = computeHealthScore(buildings)  // 0-1
set({ weatherState: healthScore < 0.3 ? 'storm' : healthScore < 0.6 ? 'fog' : 'clear' })
```
Change fog `far` and rain particle velocity based on `weatherState`.

**Effort**: ~6h. **Impact**: Extraordinary — makes the city a living diagnostic.

#### 3.2 Day/Night Cycle
**What**: 90-second cycle. Dawn → Day → Dusk → Night. Affects fog color, Starfield opacity, ground grid brightness, bloom intensity.
**How**: Single `dayPhase` uniform shared across all materials (passed via a context or zustand). Starfield fades in at night. Bloom intensity `0.8 → 1.6` (day → night).
**Effort**: ~8h (many material changes). **Impact**: High — grounds the city in time.

#### 3.3 Screen-Space Reflections on Ground
**What**: The dark ground reflects city lights as blurred smear-reflections (like wet asphalt).
**How**: Custom GLSL postprocess pass that samples the colour buffer flipped vertically at attenuated intensity. Only in the lower half of the screen.
**Simplified approach**: Render a second transparent `PlaneGeometry` just below z=0 with `MeshBasicMaterial` + `envMap` from a low-res `CubeCamera` that updates every 3 seconds.
**Effort**: ~10h (custom postprocess). **Impact**: Very high visually.

#### 3.4 LOD Manager for 10K+ Repos
**What**: Formal LOD system that reduces instance detail based on camera distance.
**Current state**: InstancedCity renders every building at full fidelity.
**Target**:
- `distance < 300`: Full geometry (current)
- `300–800`: Simplified box proxy (already effectively a box)
- `800+`: Merge into 1 draw call per district using `BufferGeometryUtils.mergeGeometries`
**Effort**: ~8h. **Impact**: Critical for repos with >10K files.

---

### TIER 4 — Signature Features

#### 4.1 BuildingXRay — Live AST Wireframe Flythrough
**What**: When selected, a building transitions to a wireframe showing its internal AST structure. Nodes glow by node type (function=cyan, class=gold, import=magenta).
**How**: The analysis worker already produces an AST. Encode it as a point cloud. Animate a "scan" that reveals nodes from bottom to top over 1.5s.
**Effort**: ~12h. **Impact**: Unique — no competitor has this.

#### 4.2 Procedural City Soundtrack
**What**: Synthesize a city-specific ambient track using Web Audio API. Each district contributes a musical layer (strings for large districts, percussion for highly coupled ones).
**How**: Tone.js library. Define per-district instrument assignment. Loop at 120bpm. Fade layers in/out as districts enter/leave viewport.
**Effort**: ~15h. **Impact**: Exceptional — transforms Codebase City into an experience.

#### 4.3 Social Flythrough Mode
**What**: Record a camera path as JSON and share a URL. Recipients play back the flythrough automatically.
**How**: Record `[{t, position, target}]` array while user navigates. Serialize to base64 URL param. On load, detect param and run scripted camera path.
**Effort**: ~8h. **Impact**: High for virality / demo sharing.

---

### TIER 5 — Quality of Life

#### 5.1 Auto-Orbit Screensaver
**What**: After 60s of inactivity, camera slowly orbits the city at 45° elevation.
**How**: `useIdleTimer` hook. If idle, set `isOrbiting=true` in zustand. CameraController reads it and applies `camera.position.applyAxisAngle(UP, 0.0002)` each frame.
**Effort**: ~2h.

#### 5.2 District Double-Click Zoom
**What**: Double-click a district floor to fly into it and fill the viewport.
**How**: In `DistrictFloors.jsx`, add `onDoubleClick`. Compute bounding box of district buildings. Fly camera to look at center from 300 units.
**Effort**: ~2h.

#### 5.3 Building Pulse on Selection (not just color change)
**What**: When a building is selected, it scale-pulses once (1.0 → 1.15 → 1.0 over 0.4s).
**How**: `InstancedCity.jsx` on `selectedBuilding` change: run a `t=0` timer, each frame scale that instance by `1.0 + 0.15 * sin(t * PI)` until `t > 1`.
**Effort**: ~1h.

---

### TIER 6 — Render Research

#### 6.1 God Rays from Mothership
**What**: Volumetric crepuscular rays emitting from MothershipCore.
**How**: Custom postprocess pass. Render MothershipCore to a separate low-res buffer. Radially blur from screen-space position of core toward edges (Mie scattering approximation).
**Classic shader**: `for(int i=0;i<100;i++) { uv = lerp(uv, sunPos, 0.014); color += texture(buf, uv) * weight; weight *= decay; }`
**Effort**: ~12h.

#### 6.2 District Heat Haze
**What**: Districts with high complexity get a heat distortion shimmer above them.
**How**: Per-district custom fullscreen pass that samples the colour buffer with a time-varying sinusoidal UV offset in the district's screen-space bounding box.
**Effort**: ~6h.

---

## 4. Technical Architecture Target

### 4.1 Render Pipeline (target state)

```
User Gesture / AnimationPump (200ms)
         │
         ▼
    R3F invalidate()
         │
         ▼
  ┌─── frameloop: demand ───────────────────────────────────┐
  │                                                         │
  │  Scene Graph                    Uniforms                │
  │  ├─ Ground (static)             uTime ─→ all shaders    │
  │  ├─ InstancedCity (30fps)       uDayPhase ─→ sky/fog    │
  │  ├─ Roads (30fps)               uHealth ─→ weather      │
  │  ├─ Decorations (10–30fps)                              │
  │  │   CommTowers, SkyBridges, Beacons, Shield, Pads,     │
  │  │   PulseWaves, Billboards, Satellites, Drones         │
  │  ├─ Starfield (10fps)                                   │
  │  └─ UI (HTML / drei Html)                               │
  │                                                         │
  │  EffectComposer (HDR, !isLowEnd)                        │
  │  → Bloom → [DoF on select] → [CA on move]               │
  │  → Vignette → Noise → Output                            │
  └─────────────────────────────────────────────────────────┘
```

### 4.2 Draw Call Budget

| Category | Current | Target |
|---|---|---|
| City geometry | 1 | 1 |
| Road network | 1 | 1 |
| Decoration instanced | 8 | 8 |
| Multi-instance (drones, satellites) | 5 | 5 |
| UI (HTML/drei) | 0 GPU | 0 GPU |
| Postprocessing passes | 3 | 5–6 |
| **Total** | **~35** | **< 50** |

### 4.3 State Architecture

```
Zustand store
  ├── citySlice
  │   ├── cityData         // parsed building/district graph
  │   ├── analyzeRepo()    // triggers worker
  │   └── loadDemoCity()
  ├── interactionSlice
  │   ├── selectedBuilding
  │   ├── hoveredBuilding
  │   └── flyToBuilding()
  ├── uiSlice
  │   ├── panelOpen
  │   ├── colorMode        // complexity | coupling | churn
  │   └── weatherState     // clear | fog | storm (new)
  └── timeSlice
      ├── currentCommit
      └── isPlayingTimeline
```

### 4.4 Worker Architecture

```
Main thread                     Worker thread
     │                               │
     ├── analyzeRepo(path)  ─────→  analysis.worker.js
     │                               ├── ClientAnalyzer
     │                               ├── regexParser
     │                               ├── graphEngine (Louvain)
     │                               └── → postMessage(cityData)
     │
     └── useCityCache (IndexedDB)    // 24h TTL, silent fail
```

---

## 5. Performance Budget

### 5.1 Current Targets (mid-tier laptop, 1080p)

| Metric | Current | Target |
|---|---|---|
| Draw calls | ~35 | < 50 |
| GPU frame time | ~4ms | < 8ms |
| JS frame time | ~2ms | < 4ms |
| Bundle (gzip) | 280 kB (app) | < 350 kB |
| postprocessing overhead | 1.5ms | < 3ms |
| Cold load (no cache) | ~2s | < 3s |
| Warm load (IndexedDB) | ~0.3s | < 0.5s |

### 5.2 Low-End Fallback Rules

Conditions: `navigator.maxTouchPoints > 0` OR `navigator.hardwareConcurrency <= 4`

| Feature | Full | Low-End |
|---|---|---|
| Postprocessing | EffectComposer (Bloom+Vignette+Noise) | Skipped |
| Starfield | 3000 stars | 1000 stars |
| CommTowers | All | All (isLowEnd check inside) |
| PulseWaves | Active | Skipped |
| SentinelDrones | 30 | 15 (halved by count prop) |
| OrbitalSatellites | 80 | 40 |
| DistrictLabels | All | Top 5 districts |

---

## 6. Aesthetic System

### 6.1 Colour Palette

```
Background   #050812    -- near-black deep space
Grid lines   #0a1020    -- subtle dark grid
Primary glow #00f0ff    -- cyan (R3F default selection colour)
Critical     #ff3030    -- red emergency
Warning      #ffaa00    -- amber
Health green #00ff88    -- low complexity buildings
Coupling     #ff00ff    -- magenta (cross-district coupling)
Void         #1a0030    -- deep purple for void districts
Star cold    #88aaff    -- blue-white distant stars
Star warm    #fffbe8    -- warm ivory close stars
```

### 6.2 Bloom Calibration

Everything that should glow must have its emissive colour overdriven:
- `emissiveIntensity > 2.0` in MeshStandardMaterial
- Fragment shader output `* 2.5–4.0` in ShaderMaterial
- Bloom `luminanceThreshold = 0.12` captures anything overdrive
- Do not use `toneMapped: false` without emissive intensity — it will wash out to white

### 6.3 Animation Timing Guidelines

| Event | Duration | Easing |
|---|---|---|
| Camera fly-to | 1.2s | easeInOutCubic |
| Building selection colour | 100ms | linear (GPU side) |
| Panel slide-in | 300ms | easeOut |
| Intro sequence | 4.0s | custom multi-phase |
| Hover ripple expand | 800ms | easeOut |
| Sentinel drone hover bob | continuous, 2s period | sin |

---

## 7. Implementation Roadmap

### Sprint 1 (this session — COMPLETE)
- [x] Activate all 9 dormant visual components
- [x] Add Starfield with twinkle shader
- [x] Install and configure @react-three/postprocessing
- [x] Add Bloom + Vignette + Noise pipeline

### Sprint 2 (next)
- [ ] Depth-of-field on building selection (Tier 1.1)
- [ ] ChromaticAberration on camera move (Tier 1.2)
- [ ] Building hover ripple effect (Tier 2.3)
- [ ] Dependency arc visualization on selection (Tier 2.4)

### Sprint 3
- [ ] Cinematic intro sequence (Tier 2.1)
- [ ] Ambient sound system (Tier 1.4)
- [ ] Minimap overlay (Tier 2.2)

### Sprint 4
- [ ] Dynamic weather tied to repo health (Tier 3.1)
- [ ] Day/night cycle (Tier 3.2)

### Sprint 5 (advanced research)
- [ ] LOD manager for 10K+ repos (Tier 3.4)
- [ ] BuildingXRay AST wireframe (Tier 4.1)
- [ ] God rays from MothershipCore (Tier 6.1)

---

*Generated after Phase 19 implementation session.*
*Build: ✓ 2891 modules transformed. Tests: 116/116 passing.*
