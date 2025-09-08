# 📱 Mobile Optimization Guide for React Three Fiber

This guide provides comprehensive mobile optimization strategies for React Three Fiber applications, focusing on mid-range mobile devices while preparing for WebGPU adoption.

---

## 🎯 **Overview**

Our mobile optimization system delivers **smooth 30-60 FPS performance** on mid-range mobile phones through:

- **WebGL2 optimizations** with WebGPU preparation
- **Adaptive quality scaling** based on device capabilities
- **Thermal management** and battery optimization
- **Aggressive culling** and memory management
- **Device-specific shader variants**

---

## 🚀 **Quick Start**

### Basic Implementation

```tsx
import { useMobileOptimization } from './hooks/optimization/useMobileOptimization'
import { MobileOptimizedRenderer } from './components/optimization/MobileOptimizedRenderer'

function MyApp() {
  const { isMobile, isLowEnd, config } = useMobileOptimization()

  return (
    <Canvas dpr={config.pixelRatio}>
      <MobileOptimizedRenderer
        enableAdaptiveQuality={true}
        enableThermalManagement={isMobile}
      >
        {/* Your 3D content */}
      </MobileOptimizedRenderer>
    </Canvas>
  )
}
```

### Advanced Usage with All Optimizations

```tsx
import { MobileOptimizedRenderer } from './components/optimization/MobileOptimizedRenderer'
import { MobileShaderProvider } from './components/optimization/MobileShaderManager'
import { MobilePerformanceMonitor } from './components/optimization/MobilePerformanceMonitor'
import { MobileInstanceManager } from './components/optimization/MobileInstanceManager'
import { useMobileOptimization } from './hooks/optimization/useMobileOptimization'

function OptimizedVoxelWorld() {
  const {
    deviceProfile,
    isMobile,
    isLowEnd,
    config,
    metrics,
    recommendations
  } = useMobileOptimization()

  return (
    <Canvas dpr={config.pixelRatio}>
      <MobileOptimizedRenderer
        enableAdaptiveQuality={config.enableAdaptiveQuality}
        enableThermalManagement={config.enableThermalThrottling}
      >
        <MobileShaderProvider performanceTarget={
          isLowEnd ? 'battery' : 'balanced'
        }>
          <MobileInstanceManager
            geometry={geometry}
            material={material}
            config={{
              maxInstances: config.maxInstances,
              cullDistance: config.cullDistance,
              targetFPS: config.targetFPS
            }}
          />
          
          <MobilePerformanceMonitor
            showDebugInfo={true}
            targetFPS={config.targetFPS}
            enableThermalManagement={true}
            enableBatteryOptimization={isMobile}
          />
        </MobileShaderProvider>
      </MobileOptimizedRenderer>
    </Canvas>
  )
}
```

---

## 🔧 **Core Components**

### 1. MobileOptimizedRenderer

The main optimization wrapper that handles device detection and adaptive rendering.

**Features:**
- Automatic device capability detection
- Thermal throttling management
- Battery-aware optimizations
- WebGPU preparation layer

**Configuration:**
```tsx
<MobileOptimizedRenderer
  enableAdaptiveQuality={true}          // Auto quality adjustment
  enableThermalManagement={true}        // Thermal throttling
  onPerformanceChange={handleMetrics}   // Performance callback
/>
```

### 2. MobileShaderManager

WebGL2-optimized shader system with mobile variants.

**Shader Variants:**
- `ULTRA_LOW`: Minimal features, maximum performance
- `LOW`: Basic lighting, simple materials
- `MEDIUM`: PBR lighting, texture support
- `HIGH`: Full PBR, reflections, advanced effects

**Usage:**
```tsx
<MobileShaderProvider performanceTarget="balanced">
  {/* Your content gets optimized shaders */}
</MobileShaderProvider>
```

### 3. MobileInstanceManager

Optimized instanced rendering with spatial culling.

**Features:**
- Spatial grid culling system
- Memory pooling for performance
- LOD (Level of Detail) management
- Batch processing for mobile GPUs

**Configuration:**
```tsx
<MobileInstanceManager
  geometry={geometry}
  material={material}
  config={{
    maxInstances: 10000,           // Instance limit
    cullingDistance: 150,          // Cull distance
    lodDistances: [25, 75, 150],   // LOD breakpoints
    enableFrustumCulling: true,    // Frustum culling
    batchSize: 200,                // Processing batch size
    targetFPS: 30                  // Target frame rate
  }}
/>
```

### 4. MobilePerformanceMonitor

Real-time performance tracking with thermal management.

**Metrics Tracked:**
- FPS and frame timing
- Memory usage (JS heap)
- Draw calls and triangles
- Thermal state detection
- Battery level monitoring

**Usage:**
```tsx
<MobilePerformanceMonitor
  showDebugInfo={true}
  targetFPS={30}
  enableThermalManagement={true}
  enableBatteryOptimization={true}
  onMetricsUpdate={handleMetrics}
  onRecommendation={handleRecommendations}
/>
```

---

## ⚙️ **Device Detection & Auto-Configuration**

### Device Profiles

The system automatically detects device capabilities and applies appropriate settings:

#### Low-End Devices
**Detected by:** GPU renderer, memory < 2GB, cores ≤ 2
```javascript
{
  pixelRatio: 1.0,
  shadowMapSize: 512,
  enableShadows: false,
  maxInstances: 5000,
  targetFPS: 30,
  cullDistance: 100,
  enableThermalThrottling: true
}
```

#### Mid-Range Devices
**Detected by:** Standard mobile GPUs, 2-6GB memory
```javascript
{
  pixelRatio: 1.5,
  shadowMapSize: 1024,
  enableShadows: true,
  maxInstances: 15000,
  targetFPS: 45,
  cullDistance: 150,
  enableAdaptiveQuality: true
}
```

#### High-End Devices
**Detected by:** High-end GPUs, >6GB memory, >6 cores
```javascript
{
  pixelRatio: 2.0,
  shadowMapSize: 2048,
  enableShadows: true,
  enablePostProcessing: true,
  maxInstances: 30000,
  targetFPS: 60,
  cullDistance: 200
}
```

---

## 🌡️ **Thermal Management**

### Automatic Thermal Throttling

The system monitors performance degradation to detect thermal throttling:

```javascript
// Thermal states based on performance degradation
if (recentFrameTime > avgFrameTime * 2.5) {
  thermalState = 'critical'    // 50% performance reduction
} else if (recentFrameTime > avgFrameTime * 2.0) {
  thermalState = 'serious'     // 70% performance reduction
} else if (recentFrameTime > avgFrameTime * 1.5) {
  thermalState = 'fair'        // 85% performance reduction
}
```

### Thermal Response Actions

- **Fair:** Reduce pixel ratio slightly
- **Serious:** Disable post-processing, reduce LOD distances
- **Critical:** Switch to ultra-low shaders, aggressive culling

---

## 🔋 **Battery Optimization**

### Battery-Aware Performance Modes

Using the Battery API (where supported):

```javascript
// Automatic mode switching based on battery
if (!charging && level < 0.15) {
  mode = 'power-saver'    // 60% performance multiplier
} else if (!charging && level < 0.30) {
  mode = 'balanced'       // 80% performance multiplier  
} else {
  mode = 'performance'    // 100% performance multiplier
}
```

### Power-Saver Optimizations

- Reduced frame rate target (20-30 FPS)
- Lower pixel ratio (0.8x)
- Simplified shaders
- Increased culling distance
- Disabled particle effects

---

## 🎮 **WebGPU Preparation**

### WebGPU Feature Detection

```javascript
async function detectWebGPU() {
  if (!('gpu' in navigator)) return null
  
  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: 'high-performance'
  })
  
  if (!adapter) return null
  
  const device = await adapter.requestDevice()
  return { adapter, device }
}
```

### WebGPU Optimization Strategies

**Compute Shaders for Culling:**
```wgsl
@compute @workgroup_size(64)
fn cullInstances(
  @builtin(global_invocation_id) id: vec3<u32>
) {
  let index = id.x;
  if (index >= arrayLength(&instances)) { return; }
  
  let instance = instances[index];
  let distance = length(instance.position - camera.position);
  
  // Frustum and distance culling
  visible[index] = distance < cullDistance && inFrustum(instance.position);
}
```

**Optimized Vertex Processing:**
```wgsl
struct InstanceData {
  position: vec3<f32>,
  rotation: vec4<f32>,
  scale: vec3<f32>,
  color: vec3<f32>,
}

@vertex
fn vs_main(
  @location(0) position: vec3<f32>,
  @location(1) instanceIndex: u32
) -> VertexOutput {
  let instance = instances[instanceIndex];
  let worldPos = transformPosition(position, instance);
  
  return VertexOutput(
    projectionMatrix * viewMatrix * vec4<f32>(worldPos, 1.0),
    worldPos,
    instance.color
  );
}
```

---

## 📊 **Performance Metrics & Monitoring**

### Key Performance Indicators

```typescript
interface MobilePerformanceMetrics {
  fps: number                    // Target: 30+ (low-end), 45+ (mid), 60+ (high)
  frameTime: number              // Target: <33ms (low), <22ms (mid), <16ms (high)
  memoryUsage: number            // Monitor heap growth
  drawCalls: number              // Target: <20 (low), <35 (mid), <60 (high)
  thermalState: string           // 'nominal' | 'fair' | 'serious' | 'critical'
  cullingEfficiency: number      // % of objects culled
}
```

### Performance Grading System

```javascript
function calculateGrade(fps, frameTime, targetFPS) {
  const efficiency = Math.min(1, targetFrameTime / frameTime)
  
  if (efficiency >= 0.95) return 'A+'     // Excellent
  if (efficiency >= 0.85) return 'A'      // Very Good  
  if (efficiency >= 0.70) return 'B'      // Good
  if (efficiency >= 0.50) return 'C'      // Acceptable
  if (efficiency >= 0.30) return 'D'      // Poor
  return 'F'                              // Critical
}
```

### Real-Time Recommendations

The system provides actionable performance recommendations:

```javascript
const recommendations = [
  // Critical issues
  {
    type: 'critical',
    condition: frameTime > targetFrameTime * 1.5,
    message: 'Frame time exceeds target significantly',
    action: 'Reduce render quality or instance count'
  },
  
  // Warnings
  {
    type: 'warning', 
    condition: drawCalls > maxDrawCalls,
    message: 'High draw call count detected',
    action: 'Enable instanced rendering or reduce materials'
  },
  
  // Suggestions
  {
    type: 'suggestion',
    condition: isLowEnd && enableShadows,
    message: 'Shadows enabled on low-end device',
    action: 'Disable shadows for better performance'
  }
]
```

---

## 🎯 **Optimization Strategies by Device Type**

### iPhone/iPad Optimizations

**Strengths:** High-performance GPUs, good memory management
**Optimizations:**
- Utilize Metal-backed WebGL optimizations
- Enable higher pixel ratios (up to 3x on supported devices)
- Take advantage of hardware-accelerated compositing

```javascript
if (deviceProfile.isApple) {
  config.pixelRatio = Math.min(3.0, window.devicePixelRatio)
  config.enableHardwareCompositing = true
  config.metalOptimizations = true
}
```

### Android Optimizations

**Challenges:** Fragmented GPU landscape, varying memory constraints
**Optimizations:**
- Aggressive GPU detection and classification
- Conservative memory usage
- Thermal management priority

```javascript
if (deviceProfile.isAndroid) {
  // Conservative settings for Android fragmentation
  config.memoryPressureThreshold = 0.6  // vs 0.8 for iOS
  config.enableThermalThrottling = true
  config.thermalCheckInterval = 1000    // Check more frequently
}
```

### Tablet Optimizations

**Opportunities:** Larger screens, better cooling, more memory
**Optimizations:**
- Higher quality settings than phones
- Better suited for complex scenes
- Can handle more instances

```javascript
if (deviceProfile.deviceType === 'tablet') {
  config.maxInstances *= 1.5
  config.cullDistance *= 1.2
  config.enablePostProcessing = true
  config.shadowMapSize = 2048
}
```

---

## 🔍 **Debugging & Profiling**

### Debug Information Display

```tsx
<MobilePerformanceMonitor showDebugInfo={true} />
```

Shows real-time information:
- Device profile and capabilities
- Current FPS and frame timing
- Memory usage and pressure
- Thermal state and battery level
- Active optimizations and quality level
- Performance recommendations

### Performance Testing

```javascript
// Automated performance testing
const performanceTest = {
  // Stress test with increasing instance count
  stressTest: async (maxInstances) => {
    for (let count = 100; count <= maxInstances; count += 100) {
      await testInstanceCount(count)
      if (metrics.fps < targetFPS * 0.8) {
        return count - 100  // Return last stable count
      }
    }
  },
  
  // Thermal throttling test
  thermalTest: async (duration = 60000) => {
    const startTime = performance.now()
    const initialFPS = metrics.fps
    
    while (performance.now() - startTime < duration) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      const currentFPS = metrics.fps
      const degradation = initialFPS / currentFPS
      
      if (degradation > 1.5) {
        return 'thermal_throttling_detected'
      }
    }
    
    return 'thermal_stable'
  }
}
```

### Browser-Specific Debugging

```javascript
// Chrome DevTools integration
if (window.chrome && window.chrome.devtools) {
  // GPU memory tracking
  const memoryInfo = gl.getExtension('WEBGL_debug_renderer_info')
  console.log('GPU:', gl.getParameter(memoryInfo.UNMASKED_RENDERER_WEBGL))
}

// Firefox profiling
if (navigator.userAgent.includes('Firefox')) {
  // Use performance.mark for Firefox profiler integration
  performance.mark('render-start')
  // ... rendering code ...
  performance.mark('render-end')
  performance.measure('render-duration', 'render-start', 'render-end')
}
```

---

## 📱 **Mobile-Specific WebGL Extensions**

### Essential Extensions for Mobile

```javascript
const mobileExtensions = [
  // Instanced rendering (critical for performance)
  'ANGLE_instanced_arrays',
  'WEBGL_draw_buffers_indexed',
  
  // Texture compression (memory savings)
  'WEBGL_compressed_texture_s3tc',    // Desktop fallback
  'WEBGL_compressed_texture_etc',     // Android
  'WEBGL_compressed_texture_etc1',    // Older Android
  'WEBGL_compressed_texture_pvrtc',   // iOS
  'WEBGL_compressed_texture_astc',    // Modern mobile
  
  // Depth buffer optimizations
  'WEBGL_depth_texture',
  'EXT_frag_depth',
  
  // Performance monitoring
  'EXT_disjoint_timer_query_webgl2',
  
  // Vertex array objects (state management)
  'OES_vertex_array_object'
]

// Enable extensions with fallbacks
mobileExtensions.forEach(extName => {
  try {
    const ext = gl.getExtension(extName)
    if (ext) {
      console.log(`✅ ${extName} enabled`)
    }
  } catch (error) {
    console.warn(`❌ ${extName} not supported`)
  }
})
```

### Texture Compression for Mobile

```javascript
// Automatic texture compression based on platform
function getOptimalTextureFormat() {
  const gl = renderer.getContext()
  
  // Check for ASTC (best quality/size ratio)
  if (gl.getExtension('WEBGL_compressed_texture_astc')) {
    return 'astc'
  }
  
  // iOS: PVRTC
  if (deviceProfile.isApple && gl.getExtension('WEBGL_compressed_texture_pvrtc')) {
    return 'pvrtc'
  }
  
  // Android: ETC2 or ETC1
  if (deviceProfile.isAndroid) {
    if (gl.getExtension('WEBGL_compressed_texture_etc')) {
      return 'etc2'
    }
    if (gl.getExtension('WEBGL_compressed_texture_etc1')) {
      return 'etc1'
    }
  }
  
  // Fallback to uncompressed
  return 'rgba'
}
```

---

## 🚀 **Best Practices Summary**

### Do's ✅

1. **Always detect device capabilities first**
   ```javascript
   const { isMobile, isLowEnd, supportsWebGL2 } = useMobileOptimization()
   ```

2. **Use instanced rendering for multiple objects**
   ```javascript
   <MobileInstanceManager maxInstances={config.maxInstances} />
   ```

3. **Implement aggressive culling**
   ```javascript
   config.cullingDistance = isMobile ? 100 : 200
   config.enableFrustumCulling = true
   ```

4. **Monitor thermal state continuously**
   ```javascript
   if (thermalState === 'critical') {
     // Immediately reduce quality
     adjustQuality(0.5)
   }
   ```

5. **Use appropriate pixel ratios**
   ```javascript
   const dpr = Math.min(window.devicePixelRatio, isMobile ? 2.0 : 3.0)
   ```

### Don'ts ❌

1. **Don't assume desktop performance on mobile**
2. **Don't use the same settings for all devices**
3. **Don't ignore thermal throttling**
4. **Don't forget about battery optimization**
5. **Don't skip performance monitoring**

### Performance Targets by Device Tier

| Device Tier | Target FPS | Max Instances | Max Draw Calls | Pixel Ratio |
|-------------|------------|---------------|----------------|-------------|
| Low-End     | 30+ FPS    | 5,000        | 20             | 1.0         |
| Mid-Range   | 45+ FPS    | 15,000       | 35             | 1.5         |
| High-End    | 60+ FPS    | 30,000       | 60             | 2.0         |

---

## 🔮 **Future Roadmap**

### WebGPU Integration (2024-2025)

- **Compute shaders for culling and animation**
- **GPU-driven rendering pipelines**
- **Advanced memory management**
- **Cross-platform shader compilation**

### AI-Powered Optimizations

- **Machine learning for performance prediction**
- **Automatic quality adjustment based on usage patterns**
- **Predictive thermal management**

### Extended Platform Support

- **Progressive Web App optimizations**
- **WebXR mobile performance**
- **5G-optimized streaming content**

---

## 📞 **Support & Contributing**

### Getting Help

1. **Check device compatibility** first using the debug monitor
2. **Review performance recommendations** in the UI
3. **Test on actual mobile devices**, not just desktop browser dev tools
4. **Monitor thermal behavior** during extended use

### Contributing

When contributing mobile optimizations:

1. **Test on multiple device tiers** (low, mid, high-end)
2. **Verify battery impact** with extended testing
3. **Include performance benchmarks** in PR descriptions
4. **Document any new device-specific optimizations**

### Reporting Issues

Include in mobile performance reports:

- Device model and OS version
- WebGL capabilities (from debug monitor)
- Performance metrics during issue
- Thermal state at time of issue
- Battery level and charging status

---

**Last Updated:** December 2024  
**Mobile Optimization Version:** 1.0  
**Supported Devices:** iOS 14+, Android 8+, Modern Mobile Browsers

For the latest updates and device-specific optimizations, check our [GitHub repository](https://github.com/your-repo/descendants).