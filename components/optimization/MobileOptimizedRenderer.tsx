"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useThree, useFrame } from "@react-three/fiber";
import {
  WebGLRenderer,
  Scene,
  Camera,
  BufferGeometry,
  InstancedMesh,
  Matrix4,
  Vector3,
  Frustum,
  Material,
  WebGLRenderTarget,
  HalfFloatType,
  RGBAFormat,
  LinearFilter,
  ClampToEdgeWrapping,
} from "three";

// Mobile device detection and capabilities
interface MobileCapabilities {
  isMobile: boolean;
  isLowEndDevice: boolean;
  supportsWebGPU: boolean;
  supportsWebGL2: boolean;
  hasHardwareAntialias: boolean;
  maxTextureSize: number;
  maxVertexTextures: number;
  devicePixelRatio: number;
  memoryInfo: {
    totalJSHeapSize?: number;
    usedJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  };
  gpu?: {
    vendor: string;
    renderer: string;
  };
  thermalState: "nominal" | "fair" | "serious" | "critical";
  batteryLevel?: number;
}

// Mobile-specific configuration
const MOBILE_CONFIG = {
  // Performance tiers based on device capabilities
  LOW_END: {
    maxInstances: 5000,
    lodDistances: [15, 35, 60],
    shadowMapSize: 512,
    enableSSAO: false,
    enablePostProcessing: false,
    maxDrawCalls: 20,
    cullingThreshold: 0.8,
    targetFPS: 30,
    adaptiveQuality: true,
    thermalThrottling: true,
  },
  MID_RANGE: {
    maxInstances: 15000,
    lodDistances: [20, 50, 100],
    shadowMapSize: 1024,
    enableSSAO: false,
    enablePostProcessing: true,
    maxDrawCalls: 35,
    cullingThreshold: 0.7,
    targetFPS: 45,
    adaptiveQuality: true,
    thermalThrottling: true,
  },
  HIGH_END: {
    maxInstances: 30000,
    lodDistances: [25, 75, 150],
    shadowMapSize: 2048,
    enableSSAO: true,
    enablePostProcessing: true,
    maxDrawCalls: 50,
    cullingThreshold: 0.6,
    targetFPS: 60,
    adaptiveQuality: false,
    thermalThrottling: false,
  },
} as const;

// WebGL2 optimized mobile shaders
const mobileVertexShader = `#version 300 es
precision highp float;
precision highp int;

// Instancing attributes
in vec3 position;
in vec3 normal;
in vec2 uv;
in vec3 instancePosition;
in vec4 instanceColor;
in float instanceScale;

// Matrices
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
uniform float time;

// LOD uniforms
uniform float lodLevel;
uniform vec3 cameraPosition;

// Output to fragment shader
out vec3 vNormal;
out vec2 vUv;
out vec4 vColor;
out vec3 vWorldPosition;
out float vDistance;
out float vLodFactor;

// Mobile-optimized vertex processing
void main() {
    // Apply instance transformations
    vec3 instancedPosition = position * instanceScale + instancePosition;

    // Calculate distance for LOD
    float distance = length(cameraPosition - instancedPosition);
    vDistance = distance;

    // LOD factor for fragment shader optimization
    vLodFactor = clamp(1.0 - (distance / 100.0), 0.1, 1.0);

    // World position
    vWorldPosition = instancedPosition;

    // Transform position
    vec4 mvPosition = modelViewMatrix * vec4(instancedPosition, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Pass through attributes with mobile optimizations
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    vColor = instanceColor;
}
`;

const mobileFragmentShader = `#version 300 es
precision mediump float;
precision mediump int;

// Input from vertex shader
in vec3 vNormal;
in vec2 vUv;
in vec4 vColor;
in vec3 vWorldPosition;
in float vDistance;
in float vLodFactor;

// Uniforms
uniform float time;
uniform float lodLevel;
uniform bool enableLighting;
uniform bool enableTextures;
uniform sampler2D diffuseTexture;
uniform vec3 lightDirection;
uniform vec3 lightColor;
uniform float ambientIntensity;

// Output
out vec4 fragColor;

// Mobile-optimized lighting
vec3 computeLighting(vec3 normal, vec3 color) {
    if (!enableLighting) {
        return color;
    }

    // Simple directional lighting optimized for mobile
    float NdotL = max(dot(normal, -lightDirection), 0.0);
    vec3 diffuse = lightColor * NdotL;
    vec3 ambient = lightColor * ambientIntensity;

    return color * (diffuse + ambient);
}

void main() {
    vec3 baseColor = vColor.rgb;

    // LOD-based texture sampling
    if (enableTextures && vLodFactor > 0.5) {
        vec4 texColor = texture(diffuseTexture, vUv);
        baseColor = mix(baseColor, texColor.rgb, texColor.a);
    }

    // Apply mobile-optimized lighting
    vec3 litColor = computeLighting(normalize(vNormal), baseColor);

    // Distance-based alpha for performance
    float alpha = vColor.a * smoothstep(150.0, 100.0, vDistance);

    // Early fragment discard for performance
    if (alpha < 0.01) {
        discard;
    }

    fragColor = vec4(litColor, alpha);
}
`;

// Mobile device detection utility
function detectMobileCapabilities(): MobileCapabilities {
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");

  const capabilities: MobileCapabilities = {
    isMobile,
    isLowEndDevice: false,
    supportsWebGPU: "gpu" in navigator,
    supportsWebGL2: !!canvas.getContext("webgl2"),
    hasHardwareAntialias: false,
    maxTextureSize: 2048,
    maxVertexTextures: 8,
    devicePixelRatio: Math.min(window.devicePixelRatio, 2), // Cap at 2x for performance
    memoryInfo: {},
    thermalState: "nominal",
  };

  if (gl) {
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      capabilities.gpu = { vendor, renderer };

      // Detect low-end devices based on GPU
      const lowEndGPUs = [
        "adreno 530",
        "adreno 540",
        "mali-g71",
        "mali-g72",
        "powervr",
        "intel",
        "adreno 4",
        "adreno 5",
      ];
      capabilities.isLowEndDevice = lowEndGPUs.some((gpu) =>
        renderer.toLowerCase().includes(gpu),
      );
    }

    capabilities.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    capabilities.maxVertexTextures = gl.getParameter(
      gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS,
    );
    capabilities.hasHardwareAntialias =
      gl.getContextAttributes()?.antialias || false;
  }

  // Memory info (Chrome only)
  if ("memory" in performance) {
    const memory = performance.memory!;
    capabilities.memoryInfo = {
      totalJSHeapSize: memory.totalJSHeapSize,
      usedJSHeapSize: memory.usedJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
    };

    // Low-end detection based on memory
    if (memory.jsHeapSizeLimit < 1073741824) {
      // < 1GB
      capabilities.isLowEndDevice = true;
    }
  }

  // Hardware concurrency as device performance indicator
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) {
    capabilities.isLowEndDevice = true;
  }

  return capabilities;
}

// Thermal management for mobile devices
class MobileThermalManager {
  private thermalState: MobileCapabilities["thermalState"] = "nominal";
  private performanceObserver?: PerformanceObserver;
  private frameTimings: number[] = [];
  private throttleLevel = 0;

  constructor(
    private onThermalChange: (
      state: MobileCapabilities["thermalState"],
    ) => void,
  ) {
    this.initThermalMonitoring();
  }

  private initThermalMonitoring() {
    // Monitor frame timing for thermal throttling detection
    if ("PerformanceObserver" in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.entryType === "measure") {
            this.frameTimings.push(entry.duration);
            if (this.frameTimings.length > 60) {
              this.frameTimings.shift();
            }
          }
        }
        this.checkThermalState();
      });

      this.performanceObserver.observe({ entryTypes: ["measure"] });
    }
  }

  private checkThermalState() {
    if (this.frameTimings.length < 30) return;

    const avgFrameTime =
      this.frameTimings.reduce((a, b) => a + b, 0) / this.frameTimings.length;
    const recentFrameTime =
      this.frameTimings.slice(-10).reduce((a, b) => a + b, 0) / 10;

    let newState: MobileCapabilities["thermalState"] = "nominal";

    if (recentFrameTime > avgFrameTime * 2) {
      newState = "critical";
    } else if (recentFrameTime > avgFrameTime * 1.5) {
      newState = "serious";
    } else if (recentFrameTime > avgFrameTime * 1.2) {
      newState = "fair";
    }

    if (newState !== this.thermalState) {
      this.thermalState = newState;
      this.onThermalChange(newState);
    }
  }

  getThrottleLevel(): number {
    switch (this.thermalState) {
      case "critical":
        return 0.5;
      case "serious":
        return 0.7;
      case "fair":
        return 0.85;
      default:
        return 1.0;
    }
  }

  dispose() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }
}

// Adaptive quality manager for mobile
class MobileAdaptiveQuality {
  private targetFPS: number;
  private currentQuality = 1.0;
  private frameTimings: number[] = [];
  private adjustmentCooldown = 0;

  constructor(targetFPS: number = 30) {
    this.targetFPS = targetFPS;
  }

  updateFrameTiming(deltaTime: number) {
    const frameTime = deltaTime * 1000; // Convert to ms
    this.frameTimings.push(frameTime);

    if (this.frameTimings.length > 30) {
      this.frameTimings.shift();
    }

    if (this.adjustmentCooldown > 0) {
      this.adjustmentCooldown--;
      return this.currentQuality;
    }

    if (this.frameTimings.length >= 10) {
      const avgFrameTime =
        this.frameTimings.slice(-10).reduce((a, b) => a + b, 0) / 10;
      const targetFrameTime = 1000 / this.targetFPS;

      if (avgFrameTime > targetFrameTime * 1.2) {
        // Performance too low, reduce quality
        this.currentQuality = Math.max(0.3, this.currentQuality - 0.1);
        this.adjustmentCooldown = 60; // Wait 60 frames before next adjustment
      } else if (
        avgFrameTime < targetFrameTime * 0.8 &&
        this.currentQuality < 1.0
      ) {
        // Performance good, can increase quality
        this.currentQuality = Math.min(1.0, this.currentQuality + 0.05);
        this.adjustmentCooldown = 60;
      }
    }

    return this.currentQuality;
  }

  getCurrentQuality(): number {
    return this.currentQuality;
  }
}

interface MobileOptimizedRendererProps {
  children: React.ReactNode;
  forceConfig?: keyof typeof MOBILE_CONFIG;
  enableAdaptiveQuality?: boolean;
  enableThermalManagement?: boolean;
  onPerformanceChange?: (metrics: MobilePerformanceMetrics) => void;
}

interface MobilePerformanceMetrics {
  fps: number;
  frameTime: number;
  quality: number;
  thermalState: MobileCapabilities["thermalState"];
  memoryUsage: number;
  drawCalls: number;
  instanceCount: number;
}

export function MobileOptimizedRenderer({
  children,
  forceConfig,
  enableAdaptiveQuality = true,
  enableThermalManagement = true,
  onPerformanceChange,
}: MobileOptimizedRendererProps) {
  const { gl, scene, camera } = useThree();

  // Device capabilities and configuration
  const [capabilities] = useState<MobileCapabilities>(() =>
    detectMobileCapabilities(),
  );
  const [config] = useState(() => {
    if (forceConfig) return MOBILE_CONFIG[forceConfig];

    if (capabilities.isLowEndDevice) return MOBILE_CONFIG.LOW_END;
    if (capabilities.isMobile) return MOBILE_CONFIG.MID_RANGE;
    return MOBILE_CONFIG.HIGH_END;
  });

  // Performance management
  const thermalManagerRef = useRef<MobileThermalManager | undefined>(undefined);
  const adaptiveQualityRef = useRef<MobileAdaptiveQuality | undefined>(
    undefined,
  );
  const [thermalState, setThermalState] =
    useState<MobileCapabilities["thermalState"]>("nominal");

  // Performance metrics
  const frameTimesRef = useRef<number[]>([]);
  const lastPerformanceUpdate = useRef<number>(0);

  // Initialize mobile-specific managers
  useEffect(() => {
    if (enableThermalManagement && capabilities.isMobile) {
      thermalManagerRef.current = new MobileThermalManager(setThermalState);
    }

    if (enableAdaptiveQuality) {
      adaptiveQualityRef.current = new MobileAdaptiveQuality(config.targetFPS);
    }

    return () => {
      thermalManagerRef.current?.dispose();
    };
  }, [
    config.targetFPS,
    enableThermalManagement,
    enableAdaptiveQuality,
    capabilities.isMobile,
  ]);

  // Configure WebGL renderer for mobile
  useEffect(() => {
    if (!gl) return;

    // Mobile-specific WebGL settings
    gl.setPixelRatio(
      Math.min(capabilities.devicePixelRatio, config.targetFPS >= 60 ? 2 : 1.5),
    );

    // Optimize for mobile GPUs
    gl.sortObjects = false; // Disable sorting for performance
    gl.shadowMap.enabled = config.shadowMapSize > 0;
    gl.shadowMap.type = 2; // PCFShadowMap for mobile compatibility
    gl.shadowMap.setSize(config.shadowMapSize);

    // Mobile-specific optimizations
    if (capabilities.isMobile) {
      gl.powerPreference = "high-performance";
      gl.antialias =
        capabilities.hasHardwareAntialias && config.targetFPS >= 45;
      gl.depth = true;
      gl.stencil = false; // Disable stencil buffer to save memory

      // Enable mobile-specific extensions
      const extensions = [
        "OES_vertex_array_object",
        "ANGLE_instanced_arrays",
        "EXT_disjoint_timer_query_webgl2",
        "WEBGL_lose_context",
      ];

      extensions.forEach((ext) => {
        try {
          gl.getExtension(ext);
        } catch (e) {
          console.warn(`Failed to enable extension ${ext}:`, e);
        }
      });
    }
  }, [gl, capabilities, config]);

  // Adaptive quality and thermal management frame loop
  useFrame((state, deltaTime) => {
    if (!gl) return;

    const now = performance.now();
    const frameTime = deltaTime * 1000;

    // Update frame timing
    frameTimesRef.current.push(frameTime);
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift();
    }

    // Update adaptive quality
    let currentQuality = 1.0;
    if (adaptiveQualityRef.current && enableAdaptiveQuality) {
      currentQuality = adaptiveQualityRef.current.updateFrameTiming(deltaTime);
    }

    // Apply thermal throttling
    let thermalMultiplier = 1.0;
    if (thermalManagerRef.current && enableThermalManagement) {
      thermalMultiplier = thermalManagerRef.current.getThrottleLevel();
    }

    // Apply quality adjustments
    const finalQuality = currentQuality * thermalMultiplier;
    if (finalQuality < 1.0) {
      // Reduce render resolution
      const targetSize = Math.max(0.5, finalQuality);
      gl.setPixelRatio(capabilities.devicePixelRatio * targetSize);

      // Adjust LOD distances
      const lodMultiplier = Math.max(0.7, finalQuality);
      // This would be applied to your LOD system
    }

    // Report performance metrics
    if (onPerformanceChange && now - lastPerformanceUpdate.current > 1000) {
      const avgFrameTime =
        frameTimesRef.current.reduce((a, b) => a + b, 0) /
        frameTimesRef.current.length;
      const fps = 1000 / avgFrameTime;

      const metrics: MobilePerformanceMetrics = {
        fps,
        frameTime: avgFrameTime,
        quality: finalQuality,
        thermalState,
        memoryUsage: capabilities.memoryInfo.usedJSHeapSize || 0,
        drawCalls: gl.info.render.calls,
        instanceCount: 0, // This would come from your instance manager
      };

      onPerformanceChange(metrics);
      lastPerformanceUpdate.current = now;
    }
  });

  // WebGPU fallback preparation (future-proofing)
  const webgpuRenderer = useMemo(() => {
    if (capabilities.supportsWebGPU && !capabilities.isLowEndDevice) {
      // WebGPU implementation would go here
      // This is preparation for future WebGPU adoption
      if (process.env.NODE_ENV === "development") {
        console.log(
          "WebGPU capable device detected - preparing for future implementation",
        );
      }
    }
    return null;
  }, [capabilities]);

  return <>{children}</>;
}

// Mobile performance monitoring hook
export function useMobilePerformance() {
  const [metrics, setMetrics] = useState<MobilePerformanceMetrics | null>(null);
  const [capabilities] = useState<MobileCapabilities>(() =>
    detectMobileCapabilities(),
  );

  const handlePerformanceChange = useCallback(
    (newMetrics: MobilePerformanceMetrics) => {
      setMetrics(newMetrics);
    },
    [],
  );

  return {
    metrics,
    capabilities,
    handlePerformanceChange,
    isMobile: capabilities.isMobile,
    isLowEndDevice: capabilities.isLowEndDevice,
    supportsWebGPU: capabilities.supportsWebGPU,
  };
}

export default MobileOptimizedRenderer;
