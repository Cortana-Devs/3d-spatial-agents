"use client";

import React, { useRef, useEffect, useMemo, useCallback } from "react";
import { useThree } from "@react-three/fiber";
import {
  ShaderMaterial,
  UniformsUtils,
  Vector3,
  Color,
  Texture,
  WebGLRenderer,
  ShaderLib,
  UniformsLib,
} from "three";

// Mobile shader variants with different complexity levels
export const MOBILE_SHADER_VARIANTS = {
  ULTRA_LOW: "ultra_low",
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;

type ShaderVariant =
  (typeof MOBILE_SHADER_VARIANTS)[keyof typeof MOBILE_SHADER_VARIANTS];

// WebGL2 optimized vertex shader with mobile variants
const mobileVertexShaders = {
  [MOBILE_SHADER_VARIANTS.ULTRA_LOW]: `#version 300 es
    precision lowp float;

    in vec3 position;
    in vec3 instancePosition;
    in vec4 instanceColor;

    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;

    out vec4 vColor;

    void main() {
      vec3 pos = position + instancePosition;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      vColor = instanceColor;
    }
  `,

  [MOBILE_SHADER_VARIANTS.LOW]: `#version 300 es
    precision mediump float;

    in vec3 position;
    in vec3 normal;
    in vec3 instancePosition;
    in vec4 instanceColor;
    in float instanceScale;

    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    uniform mat3 normalMatrix;
    uniform vec3 cameraPosition;

    out vec3 vNormal;
    out vec4 vColor;
    out float vDistance;

    void main() {
      vec3 pos = position * instanceScale + instancePosition;
      vDistance = distance(cameraPosition, pos);

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      vNormal = normalMatrix * normal;
      vColor = instanceColor;
    }
  `,

  [MOBILE_SHADER_VARIANTS.MEDIUM]: `#version 300 es
    precision mediump float;
    precision mediump int;

    in vec3 position;
    in vec3 normal;
    in vec2 uv;
    in vec3 instancePosition;
    in vec4 instanceColor;
    in float instanceScale;
    in float instanceRotation;

    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    uniform mat3 normalMatrix;
    uniform vec3 cameraPosition;
    uniform float time;
    uniform float lodLevel;

    out vec3 vNormal;
    out vec2 vUv;
    out vec4 vColor;
    out vec3 vWorldPosition;
    out float vDistance;
    out float vLodFactor;

    mat3 rotateY(float angle) {
      float c = cos(angle);
      float s = sin(angle);
      return mat3(
        c, 0.0, s,
        0.0, 1.0, 0.0,
        -s, 0.0, c
      );
    }

    void main() {
      vec3 rotated = rotateY(instanceRotation) * (position * instanceScale);
      vec3 worldPos = rotated + instancePosition;

      vDistance = distance(cameraPosition, worldPos);
      vLodFactor = clamp(1.0 - (vDistance / 100.0), 0.0, 1.0);
      vWorldPosition = worldPos;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);

      vNormal = normalMatrix * rotateY(instanceRotation) * normal;
      vUv = uv;
      vColor = instanceColor;
    }
  `,

  [MOBILE_SHADER_VARIANTS.HIGH]: `#version 300 es
    precision highp float;
    precision highp int;

    in vec3 position;
    in vec3 normal;
    in vec2 uv;
    in vec3 instancePosition;
    in vec4 instanceColor;
    in float instanceScale;
    in float instanceRotation;
    in float instanceMetallic;
    in float instanceRoughness;

    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    uniform mat3 normalMatrix;
    uniform mat4 viewMatrix;
    uniform vec3 cameraPosition;
    uniform float time;
    uniform float lodLevel;
    uniform vec3 fogColor;
    uniform float fogNear;
    uniform float fogFar;

    out vec3 vNormal;
    out vec2 vUv;
    out vec4 vColor;
    out vec3 vWorldPosition;
    out vec3 vViewPosition;
    out float vDistance;
    out float vLodFactor;
    out float vMetallic;
    out float vRoughness;
    out float vFogDepth;

    mat3 rotateY(float angle) {
      float c = cos(angle);
      float s = sin(angle);
      return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
    }

    void main() {
      vec3 rotated = rotateY(instanceRotation) * (position * instanceScale);
      vec3 worldPos = rotated + instancePosition;

      vDistance = distance(cameraPosition, worldPos);
      vLodFactor = clamp(1.0 - (vDistance / 150.0), 0.0, 1.0);
      vWorldPosition = worldPos;

      vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
      vViewPosition = mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;

      vNormal = normalize(normalMatrix * rotateY(instanceRotation) * normal);
      vUv = uv;
      vColor = instanceColor;
      vMetallic = instanceMetallic;
      vRoughness = instanceRoughness;
      vFogDepth = -mvPosition.z;
    }
  `,
};

// Mobile fragment shaders with adaptive complexity
const mobileFragmentShaders = {
  [MOBILE_SHADER_VARIANTS.ULTRA_LOW]: `#version 300 es
    precision lowp float;

    in vec4 vColor;
    out vec4 fragColor;

    void main() {
      fragColor = vColor;
    }
  `,

  [MOBILE_SHADER_VARIANTS.LOW]: `#version 300 es
    precision mediump float;

    in vec3 vNormal;
    in vec4 vColor;
    in float vDistance;

    uniform vec3 lightDirection;
    uniform vec3 lightColor;
    uniform float ambientIntensity;
    uniform float maxDistance;

    out vec4 fragColor;

    void main() {
      // Simple Lambert lighting
      float NdotL = max(dot(normalize(vNormal), -lightDirection), 0.0);
      vec3 lighting = lightColor * NdotL + lightColor * ambientIntensity;

      vec3 color = vColor.rgb * lighting;

      // Distance fade
      float alpha = vColor.a * smoothstep(maxDistance, maxDistance * 0.8, vDistance);

      // Early discard for performance
      if (alpha < 0.05) discard;

      fragColor = vec4(color, alpha);
    }
  `,

  [MOBILE_SHADER_VARIANTS.MEDIUM]: `#version 300 es
    precision mediump float;
    precision mediump sampler2D;

    in vec3 vNormal;
    in vec2 vUv;
    in vec4 vColor;
    in vec3 vWorldPosition;
    in float vDistance;
    in float vLodFactor;

    uniform vec3 lightDirection;
    uniform vec3 lightColor;
    uniform float ambientIntensity;
    uniform float maxDistance;
    uniform bool enableTextures;
    uniform sampler2D diffuseTexture;
    uniform vec3 fogColor;
    uniform float fogNear;
    uniform float fogFar;
    uniform float time;

    out vec4 fragColor;

    vec3 computeLighting(vec3 normal, vec3 baseColor) {
      float NdotL = max(dot(normal, -lightDirection), 0.0);
      vec3 diffuse = lightColor * NdotL;
      vec3 ambient = lightColor * ambientIntensity;
      return baseColor * (diffuse + ambient);
    }

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 baseColor = vColor.rgb;

      // LOD-based texture sampling
      if (enableTextures && vLodFactor > 0.3) {
        vec4 texColor = texture(diffuseTexture, vUv);
        baseColor = mix(baseColor, texColor.rgb, texColor.a * vLodFactor);
      }

      vec3 litColor = computeLighting(normal, baseColor);

      // Fog calculation
      float fogFactor = smoothstep(fogNear, fogFar, vDistance);
      litColor = mix(litColor, fogColor, fogFactor);

      float alpha = vColor.a * smoothstep(maxDistance, maxDistance * 0.7, vDistance);
      if (alpha < 0.02) discard;

      fragColor = vec4(litColor, alpha);
    }
  `,

  [MOBILE_SHADER_VARIANTS.HIGH]: `#version 300 es
    precision mediump float;
    precision mediump sampler2D;
    precision mediump samplerCube;

    in vec3 vNormal;
    in vec2 vUv;
    in vec4 vColor;
    in vec3 vWorldPosition;
    in vec3 vViewPosition;
    in float vDistance;
    in float vLodFactor;
    in float vMetallic;
    in float vRoughness;
    in float vFogDepth;

    uniform vec3 cameraPosition;
    uniform vec3 lightDirection;
    uniform vec3 lightColor;
    uniform float ambientIntensity;
    uniform float maxDistance;
    uniform bool enableTextures;
    uniform bool enableReflections;
    uniform sampler2D diffuseTexture;
    uniform sampler2D normalTexture;
    uniform samplerCube environmentMap;
    uniform vec3 fogColor;
    uniform float fogNear;
    uniform float fogFar;
    uniform float time;

    out vec4 fragColor;

    vec3 getNormal() {
      vec3 normal = normalize(vNormal);

      if (enableTextures && vLodFactor > 0.5) {
        vec3 normalMap = texture(normalTexture, vUv).rgb * 2.0 - 1.0;

        // Simple tangent space approximation for mobile
        vec3 q1 = dFdx(vWorldPosition);
        vec3 q2 = dFdy(vWorldPosition);
        vec2 st1 = dFdx(vUv);
        vec2 st2 = dFdy(vUv);

        vec3 T = normalize(q1 * st2.t - q2 * st1.t);
        vec3 B = normalize(cross(normal, T));
        mat3 TBN = mat3(T, B, normal);

        return normalize(TBN * normalMap);
      }

      return normal;
    }

    vec3 computePBRLighting(vec3 normal, vec3 viewDir, vec3 baseColor, float metallic, float roughness) {
      vec3 lightDir = -lightDirection;
      vec3 halfwayDir = normalize(lightDir + viewDir);

      float NdotL = max(dot(normal, lightDir), 0.0);
      float NdotV = max(dot(normal, viewDir), 0.0);
      float NdotH = max(dot(normal, halfwayDir), 0.0);
      float VdotH = max(dot(viewDir, halfwayDir), 0.0);

      // Simplified PBR for mobile
      vec3 F0 = mix(vec3(0.04), baseColor, metallic);

      // Fresnel approximation
      vec3 F = F0 + (1.0 - F0) * pow(1.0 - VdotH, 5.0);

      // Simplified geometry function
      float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
      float G1L = NdotL / (NdotL * (1.0 - k) + k);
      float G1V = NdotV / (NdotV * (1.0 - k) + k);
      float G = G1L * G1V;

      // Simplified distribution function
      float a2 = roughness * roughness * roughness * roughness;
      float denom = NdotH * NdotH * (a2 - 1.0) + 1.0;
      float D = a2 / (3.14159 * denom * denom);

      vec3 numerator = D * G * F;
      float denominator = 4.0 * NdotV * NdotL + 0.001;
      vec3 specular = numerator / denominator;

      vec3 kS = F;
      vec3 kD = vec3(1.0) - kS;
      kD *= 1.0 - metallic;

      vec3 diffuse = kD * baseColor / 3.14159;
      vec3 color = (diffuse + specular) * lightColor * NdotL;

      vec3 ambient = baseColor * ambientIntensity;
      return color + ambient;
    }

    void main() {
      vec3 normal = getNormal();
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      vec3 baseColor = vColor.rgb;

      // Texture sampling with LOD
      if (enableTextures && vLodFactor > 0.2) {
        vec4 texColor = texture(diffuseTexture, vUv);
        baseColor = mix(baseColor, texColor.rgb, texColor.a * vLodFactor);
      }

      // PBR lighting calculation
      vec3 litColor = computePBRLighting(normal, viewDir, baseColor, vMetallic, vRoughness);

      // Environmental reflections
      if (enableReflections && vLodFactor > 0.7) {
        vec3 reflectDir = reflect(-viewDir, normal);
        vec3 envColor = texture(environmentMap, reflectDir).rgb;
        float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 5.0);
        litColor = mix(litColor, envColor, fresnel * vMetallic * 0.5);
      }

      // Fog
      float fogFactor = 1.0 - exp(-fogFar * vFogDepth * vFogDepth);
      litColor = mix(litColor, fogColor, fogFactor);

      float alpha = vColor.a * smoothstep(maxDistance, maxDistance * 0.6, vDistance);
      if (alpha < 0.01) discard;

      fragColor = vec4(litColor, alpha);
    }
  `,
};

// Mobile-optimized glass shaders for transparent blocks
const mobileGlassShaders = {
  vertex: `#version 300 es
    precision mediump float;

    in vec3 position;
    in vec3 normal;
    in vec3 instancePosition;
    in vec4 instanceColor;
    in float instanceScale;

    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    uniform mat3 normalMatrix;
    uniform vec3 cameraPosition;

    out vec3 vNormal;
    out vec4 vColor;
    out vec3 vWorldPosition;
    out vec3 vViewDir;
    out float vDistance;

    void main() {
      vec3 worldPos = position * instanceScale + instancePosition;
      vWorldPosition = worldPos;
      vDistance = distance(cameraPosition, worldPos);

      gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);

      vNormal = normalize(normalMatrix * normal);
      vColor = instanceColor;
      vViewDir = normalize(cameraPosition - worldPos);
    }
  `,

  fragment: `#version 300 es
    precision mediump float;
    precision mediump samplerCube;

    in vec3 vNormal;
    in vec4 vColor;
    in vec3 vWorldPosition;
    in vec3 vViewDir;
    in float vDistance;

    uniform float time;
    uniform samplerCube environmentMap;
    uniform bool enableReflections;
    uniform float opacity;
    uniform float refractionRatio;
    uniform float maxDistance;

    out vec4 fragColor;

    void main() {
      vec3 normal = normalize(vNormal);

      // Fresnel effect for realistic glass
      float fresnel = pow(1.0 - max(dot(normal, vViewDir), 0.0), 2.0);

      vec3 color = vColor.rgb;

      // Environmental reflections (simplified for mobile)
      if (enableReflections) {
        vec3 reflectDir = reflect(-vViewDir, normal);
        vec3 envReflect = texture(environmentMap, reflectDir).rgb;
        color = mix(color, envReflect, fresnel * 0.6);
      }

      // Shimmer effect
      float shimmer = 1.0 + sin(time * 2.0 + vWorldPosition.y * 0.5) * 0.1;
      color *= shimmer;

      // Distance-based opacity
      float alpha = opacity * smoothstep(maxDistance, maxDistance * 0.5, vDistance);
      alpha *= (0.7 + fresnel * 0.3); // Fresnel affects opacity

      if (alpha < 0.05) discard;

      fragColor = vec4(color, alpha);
    }
  `,
};

interface MobileShaderConfig {
  variant: ShaderVariant;
  enableTextures: boolean;
  enableLighting: boolean;
  enableReflections: boolean;
  enableFog: boolean;
  maxDistance: number;
  lodLevel: number;
}

interface MobileShaderManagerProps {
  onShaderChange?: (variant: ShaderVariant) => void;
  performanceTarget?: "battery" | "balanced" | "performance";
}

export class MobileShaderManager {
  private gl: WebGLRenderer;
  private currentVariant: ShaderVariant = MOBILE_SHADER_VARIANTS.MEDIUM;
  private shaderCache = new Map<string, ShaderMaterial>();
  private config: MobileShaderConfig;

  constructor(gl: WebGLRenderer, initialConfig?: Partial<MobileShaderConfig>) {
    this.gl = gl;
    this.config = {
      variant: MOBILE_SHADER_VARIANTS.MEDIUM,
      enableTextures: true,
      enableLighting: true,
      enableReflections: false,
      enableFog: true,
      maxDistance: 150,
      lodLevel: 1,
      ...initialConfig,
    };
  }

  // Detect optimal shader variant based on device capabilities
  detectOptimalVariant(): ShaderVariant {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");

    if (!gl) return MOBILE_SHADER_VARIANTS.ULTRA_LOW;

    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxVertexTextures = gl.getParameter(
      gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS,
    );

    // Memory-based detection
    let memoryTier = "high";
    if ("memory" in performance) {
      const memory = performance.memory!;
      if (memory.jsHeapSizeLimit < 1073741824) {
        // < 1GB
        memoryTier = "low";
      } else if (memory.jsHeapSizeLimit < 2147483648) {
        // < 2GB
        memoryTier = "medium";
      }
    }

    // GPU detection
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    let gpuTier = "medium";
    if (debugInfo) {
      const renderer = gl
        .getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        .toLowerCase();
      if (
        renderer.includes("adreno 4") ||
        renderer.includes("mali-t") ||
        renderer.includes("powervr")
      ) {
        gpuTier = "low";
      } else if (
        renderer.includes("adreno 6") ||
        renderer.includes("mali-g7") ||
        renderer.includes("apple")
      ) {
        gpuTier = "high";
      }
    }

    // Determine variant based on capabilities
    if (!isMobile && maxTextureSize >= 4096 && gpuTier === "high") {
      return MOBILE_SHADER_VARIANTS.HIGH;
    } else if (
      maxTextureSize >= 2048 &&
      gpuTier !== "low" &&
      memoryTier !== "low"
    ) {
      return MOBILE_SHADER_VARIANTS.MEDIUM;
    } else if (maxTextureSize >= 1024) {
      return MOBILE_SHADER_VARIANTS.LOW;
    } else {
      return MOBILE_SHADER_VARIANTS.ULTRA_LOW;
    }
  }

  // Create optimized shader material
  createMaterial(type: "standard" | "glass" = "standard"): ShaderMaterial {
    const cacheKey = `${type}_${this.config.variant}_${JSON.stringify(this.config)}`;

    if (this.shaderCache.has(cacheKey)) {
      return this.shaderCache.get(cacheKey)!.clone();
    }

    let vertexShader: string;
    let fragmentShader: string;

    if (type === "glass") {
      vertexShader = mobileGlassShaders.vertex;
      fragmentShader = mobileGlassShaders.fragment;
    } else {
      vertexShader = mobileVertexShaders[this.config.variant];
      fragmentShader = mobileFragmentShaders[this.config.variant];
    }

    const uniforms = {
      // Basic uniforms
      time: { value: 0 },
      cameraPosition: { value: new Vector3() },

      // Lighting uniforms
      lightDirection: { value: new Vector3(0.5, 1, 0.5).normalize() },
      lightColor: { value: new Color(0xffffff) },
      ambientIntensity: { value: 0.3 },

      // Distance and LOD uniforms
      maxDistance: { value: this.config.maxDistance },
      lodLevel: { value: this.config.lodLevel },

      // Feature toggles
      enableTextures: { value: this.config.enableTextures },
      enableLighting: { value: this.config.enableLighting },
      enableReflections: { value: this.config.enableReflections },

      // Fog uniforms
      fogColor: { value: new Color(0x000000) },
      fogNear: { value: 50 },
      fogFar: { value: 200 },

      // Glass-specific uniforms
      opacity: { value: 0.8 },
      refractionRatio: { value: 0.98 },

      // Texture uniforms (will be set externally)
      diffuseTexture: { value: null },
      normalTexture: { value: null },
      environmentMap: { value: null },
    };

    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: type === "glass",
      alphaTest: type === "standard" ? 0.01 : 0,
      side: 2, // DoubleSide for better mobile compatibility
    });

    this.shaderCache.set(cacheKey, material);
    return material.clone();
  }

  // Update shader configuration
  updateConfig(newConfig: Partial<MobileShaderConfig>) {
    this.config = { ...this.config, ...newConfig };

    // Clear cache if variant changes
    if (newConfig.variant && newConfig.variant !== this.currentVariant) {
      this.shaderCache.clear();
      this.currentVariant = newConfig.variant;
    }
  }

  // Get current configuration
  getConfig(): MobileShaderConfig {
    return { ...this.config };
  }

  // Adaptive quality adjustment based on performance
  adjustQualityForPerformance(
    avgFrameTime: number,
    targetFrameTime: number = 16.67,
  ) {
    if (avgFrameTime > targetFrameTime * 1.5) {
      // Performance is poor, reduce quality
      if (this.config.variant === MOBILE_SHADER_VARIANTS.HIGH) {
        this.updateConfig({ variant: MOBILE_SHADER_VARIANTS.MEDIUM });
      } else if (this.config.variant === MOBILE_SHADER_VARIANTS.MEDIUM) {
        this.updateConfig({ variant: MOBILE_SHADER_VARIANTS.LOW });
      } else if (this.config.variant === MOBILE_SHADER_VARIANTS.LOW) {
        this.updateConfig({ variant: MOBILE_SHADER_VARIANTS.ULTRA_LOW });
      }

      // Disable expensive features
      this.updateConfig({
        enableReflections: false,
        enableTextures: avgFrameTime < targetFrameTime * 2,
      });
    } else if (avgFrameTime < targetFrameTime * 0.8) {
      // Performance is good, can increase quality
      if (this.config.variant === MOBILE_SHADER_VARIANTS.ULTRA_LOW) {
        this.updateConfig({ variant: MOBILE_SHADER_VARIANTS.LOW });
      } else if (this.config.variant === MOBILE_SHADER_VARIANTS.LOW) {
        this.updateConfig({ variant: MOBILE_SHADER_VARIANTS.MEDIUM });
      }

      // Re-enable features gradually
      this.updateConfig({
        enableTextures: true,
        enableReflections: avgFrameTime < targetFrameTime * 0.6,
      });
    }
  }

  // Clean up resources
  dispose() {
    this.shaderCache.forEach((material) => material.dispose());
    this.shaderCache.clear();
  }
}

// React component wrapper
export function MobileShaderProvider({
  children,
  onShaderChange,
  performanceTarget = "balanced",
}: MobileShaderManagerProps & { children: React.ReactNode }) {
  const { gl } = useThree();
  const shaderManagerRef = useRef<MobileShaderManager>();
  const frameTimesRef = useRef<number[]>([]);
  const lastAdjustmentRef = useRef<number>(0);

  // Initialize shader manager
  useEffect(() => {
    if (!gl) return;

    const initialVariant = new MobileShaderManager(gl).detectOptimalVariant();
    const config: Partial<MobileShaderConfig> = {
      variant: initialVariant,
      enableReflections: performanceTarget === "performance",
      enableTextures: performanceTarget !== "battery",
      maxDistance: performanceTarget === "battery" ? 100 : 150,
    };

    shaderManagerRef.current = new MobileShaderManager(gl, config);
    onShaderChange?.(initialVariant);

    return () => {
      shaderManagerRef.current?.dispose();
    };
  }, [gl, performanceTarget, onShaderChange]);

  // Performance monitoring and adaptive quality
  const handlePerformanceUpdate = useCallback(
    (frameTime: number) => {
      if (!shaderManagerRef.current) return;

      frameTimesRef.current.push(frameTime);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      const now = performance.now();
      if (
        now - lastAdjustmentRef.current > 2000 &&
        frameTimesRef.current.length >= 30
      ) {
        const avgFrameTime =
          frameTimesRef.current.reduce((a, b) => a + b, 0) /
          frameTimesRef.current.length;

        const targetFPS =
          performanceTarget === "battery"
            ? 30
            : performanceTarget === "balanced"
              ? 45
              : 60;
        const targetFrameTime = 1000 / targetFPS;

        shaderManagerRef.current.adjustQualityForPerformance(
          avgFrameTime,
          targetFrameTime,
        );
        lastAdjustmentRef.current = now;
      }
    },
    [performanceTarget],
  );

  // Provide performance update function to children
  const contextValue = useMemo(
    () => ({
      shaderManager: shaderManagerRef.current,
      handlePerformanceUpdate,
    }),
    [handlePerformanceUpdate],
  );

  return (
    <MobileShaderContext.Provider value={contextValue}>
      {children}
    </MobileShaderContext.Provider>
  );
}

// Context for accessing shader manager
const MobileShaderContext = React.createContext<{
  shaderManager?: MobileShaderManager;
  handlePerformanceUpdate: (frameTime: number) => void;
} | null>(null);

// Hook for using mobile shader manager
export function useMobileShaders() {
  const context = React.useContext(MobileShaderContext);
  if (!context) {
    throw new Error(
      "useMobileShaders must be used within MobileShaderProvider",
    );
  }
  return context;
}

export default MobileShaderManager;
