"use client";

// Advanced GPU-Optimized Shaders for Maximum Performance
// Engineered for WebGL2 with fallback to WebGL1

export const GPU_OPTIMIZED_SHADERS = {
  // Ultra-optimized vertex shader with instancing
  instancedVertex: `
    #version 300 es
    #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
    #else
      precision mediump float;
    #endif

    // Attributes
    in vec3 position;
    in vec3 normal;
    in vec2 uv;
    in vec3 color;

    // Instance attributes
    in mat4 instanceMatrix;
    in vec3 instanceColor;
    in float instanceOpacity;

    // Uniforms
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    uniform mat4 normalMatrix;
    uniform vec3 cameraPosition;
    uniform float time;

    // Varyings
    out vec3 vPosition;
    out vec3 vNormal;
    out vec2 vUv;
    out vec3 vColor;
    out float vOpacity;
    out vec3 vViewPosition;
    out float vDistance;

    // Optimized matrix multiplication
    vec4 transformPosition(vec3 pos) {
      vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
      vec4 viewPos = modelViewMatrix * worldPos;
      return projectionMatrix * viewPos;
    }

    void main() {
      vUv = uv;
      vColor = instanceColor * color;
      vOpacity = instanceOpacity;

      // Transform position
      vec4 worldPosition = instanceMatrix * vec4(position, 1.0);
      vPosition = worldPosition.xyz;

      // Transform normal (optimized)
      vNormal = normalize((instanceMatrix * vec4(normal, 0.0)).xyz);

      // Calculate view position
      vec4 mvPosition = modelViewMatrix * worldPosition;
      vViewPosition = mvPosition.xyz;

      // Calculate distance for LOD
      vDistance = length(vPosition - cameraPosition);

      gl_Position = projectionMatrix * mvPosition;
    }
  `,

  // Ultra-optimized fragment shader with advanced lighting
  instancedFragment: `
    #version 300 es
    #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
    #else
      precision mediump float;
    #endif

    // Varyings
    in vec3 vPosition;
    in vec3 vNormal;
    in vec2 vUv;
    in vec3 vColor;
    in float vOpacity;
    in vec3 vViewPosition;
    in float vDistance;

    // Uniforms
    uniform vec3 ambientColor;
    uniform vec3 directionalLightColor;
    uniform vec3 directionalLightDirection;
    uniform float roughness;
    uniform float metalness;
    uniform vec3 emissive;
    uniform float emissiveIntensity;
    uniform samplerCube envMap;
    uniform float envMapIntensity;
    uniform float time;

    // LOD uniforms
    uniform float lodDistance1;
    uniform float lodDistance2;
    uniform float lodDistance3;

    out vec4 fragColor;

    // Fast approximation of pow(x, y)
    float fastPow(float x, float y) {
      return exp2(log2(x) * y);
    }

    // Optimized Fresnel calculation
    float fresnel(vec3 viewDir, vec3 normal, float f0) {
      float cosTheta = dot(viewDir, normal);
      return f0 + (1.0 - f0) * fastPow(1.0 - cosTheta, 5.0);
    }

    // Fast Lambert lighting
    float lambertLighting(vec3 normal, vec3 lightDir) {
      return max(dot(normal, lightDir), 0.0);
    }

    // Optimized Blinn-Phong specular
    float blinnPhong(vec3 normal, vec3 lightDir, vec3 viewDir, float shininess) {
      vec3 halfDir = normalize(lightDir + viewDir);
      return fastPow(max(dot(normal, halfDir), 0.0), shininess);
    }

    // Level-of-Detail rendering
    vec3 calculateLOD() {
      if (vDistance < lodDistance1) {
        // High detail - full PBR lighting
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(-vViewPosition);
        vec3 lightDir = normalize(-directionalLightDirection);

        // Diffuse
        float lambert = lambertLighting(normal, lightDir);
        vec3 diffuse = vColor * directionalLightColor * lambert;

        // Specular
        float shininess = mix(16.0, 128.0, 1.0 - roughness);
        float spec = blinnPhong(normal, lightDir, viewDir, shininess);
        vec3 specular = mix(vec3(0.04), vColor, metalness) * spec * directionalLightColor;

        // Environment reflection
        vec3 reflection = reflect(-viewDir, normal);
        vec3 envColor = textureLod(envMap, reflection, roughness * 8.0).rgb;
        float fresnel = fresnel(viewDir, normal, mix(0.04, 1.0, metalness));

        return diffuse + specular + envColor * fresnel * envMapIntensity + ambientColor * vColor;

      } else if (vDistance < lodDistance2) {
        // Medium detail - simplified lighting
        vec3 normal = normalize(vNormal);
        vec3 lightDir = normalize(-directionalLightDirection);

        float lambert = lambertLighting(normal, lightDir);
        vec3 diffuse = vColor * directionalLightColor * lambert;

        return diffuse + ambientColor * vColor;

      } else if (vDistance < lodDistance3) {
        // Low detail - ambient only with distance fade
        float fade = 1.0 - smoothstep(lodDistance2, lodDistance3, vDistance);
        return (ambientColor * vColor + emissive * emissiveIntensity) * fade;

      } else {
        // Ultra low detail - single color
        return vColor * 0.5;
      }
    }

    void main() {
      vec3 finalColor = calculateLOD();

      // Add emissive
      finalColor += emissive * emissiveIntensity;

      // Alpha testing for early fragment rejection
      if (vOpacity < 0.01) discard;

      fragColor = vec4(finalColor, vOpacity);
    }
  `,

  // Perfect glass shader for NUMBER_7 blocks
  perfectGlassVertex: `
    #version 300 es
    precision highp float;

    in vec3 position;
    in vec3 normal;
    in vec2 uv;
    in mat4 instanceMatrix;
    in vec3 instanceColor;

    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    uniform vec3 cameraPosition;
    uniform float time;

    out vec3 vWorldPosition;
    out vec3 vWorldNormal;
    out vec3 vViewDirection;
    out vec3 vReflect;
    out vec3 vRefract;
    out vec2 vUv;
    out vec3 vColor;
    out float vFresnelFactor;

    void main() {
      vUv = uv;
      vColor = instanceColor;

      // Transform to world space
      vec4 worldPosition = instanceMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;

      vec3 worldNormal = normalize((instanceMatrix * vec4(normal, 0.0)).xyz);
      vWorldNormal = worldNormal;

      // Calculate view direction
      vViewDirection = normalize(cameraPosition - vWorldPosition);

      // Calculate reflection and refraction vectors
      vReflect = reflect(-vViewDirection, worldNormal);
      vRefract = refract(-vViewDirection, worldNormal, 0.66); // Glass IOR

      // Pre-calculate Fresnel factor
      vFresnelFactor = pow(1.0 - max(dot(vViewDirection, worldNormal), 0.0), 3.0);

      gl_Position = projectionMatrix * modelViewMatrix * worldPosition;
    }
  `,

  perfectGlassFragment: `
    #version 300 es
    #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
    #else
      precision mediump float;
    #endif

    in vec3 vWorldPosition;
    in vec3 vWorldNormal;
    in vec3 vViewDirection;
    in vec3 vReflect;
    in vec3 vRefract;
    in vec2 vUv;
    in vec3 vColor;
    in float vFresnelFactor;

    uniform samplerCube envMap;
    uniform float time;
    uniform float opacity;
    uniform float transmission;
    uniform vec3 emissive;
    uniform float emissiveIntensity;

    out vec4 fragColor;

    // Optimized chromatic aberration for clear glass
    vec3 chromaticAberration(samplerCube envMap, vec3 direction, float strength) {
      vec3 color;
      color.r = textureLod(envMap, direction + vec3(strength, 0.0, 0.0), 0.0).r;
      color.g = textureLod(envMap, direction, 0.0).g;
      color.b = textureLod(envMap, direction - vec3(strength, 0.0, 0.0), 0.0).b;
      return color;
    }

    void main() {
      // Sample environment map for reflection (minimal for full transparency)
      vec4 reflectedColor = textureLod(envMap, vReflect, 0.0);

      // Sample environment map for refraction with minimal chromatic aberration
      vec3 refractedColor = chromaticAberration(envMap, vRefract, 0.001);

      // Heavily favor refraction for clear glass appearance
      vec3 finalColor = mix(refractedColor, reflectedColor.rgb, vFresnelFactor * 0.1);

      // No tint for perfectly clear glass
      finalColor = mix(finalColor, vec3(1.0), 0.0);

      // No shimmer for pure clarity
      float shimmer = 1.0;
      finalColor *= shimmer;

      // No emissive for clear glass
      finalColor += vec3(0.0);

      // Ultra-low opacity for full transparency
      float finalOpacity = opacity * (1.0 - transmission * 0.95);

      // Early discard for nearly invisible fragments
      if (finalOpacity < 0.01) discard;

      fragColor = vec4(finalColor, finalOpacity);
    }
  `,

  // Compute shader for particle systems (WebGL2 only)
  particleCompute: `
    #version 310 es
    precision highp float;

    layout(local_size_x = 64, local_size_y = 1, local_size_z = 1) in;

    layout(std430, binding = 0) restrict buffer PositionBuffer {
      vec4 positions[];
    };

    layout(std430, binding = 1) restrict buffer VelocityBuffer {
      vec4 velocities[];
    };

    uniform float deltaTime;
    uniform float time;
    uniform vec3 gravity;
    uniform float damping;

    void main() {
      uint index = gl_GlobalInvocationID.x;
      if (index >= positions.length()) return;

      vec3 pos = positions[index].xyz;
      vec3 vel = velocities[index].xyz;
      float life = positions[index].w;

      // Update physics
      vel += gravity * deltaTime;
      vel *= damping;
      pos += vel * deltaTime;
      life -= deltaTime;

      // Reset particle if dead
      if (life <= 0.0) {
        pos = vec3(0.0);
        vel = vec3(0.0);
        life = 1.0;
      }

      positions[index] = vec4(pos, life);
      velocities[index] = vec4(vel, 0.0);
    }
  `,

  // Depth pre-pass shader for early Z rejection
  depthPrepassVertex: `
    #version 300 es
    precision highp float;

    in vec3 position;
    in mat4 instanceMatrix;

    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;

    void main() {
      vec4 worldPosition = instanceMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * modelViewMatrix * worldPosition;
    }
  `,

  depthPrepassFragment: `
    #version 300 es
    precision highp float;

    void main() {
      // Output nothing, just write depth
    }
  `,

  // Screen-space ambient occlusion
  ssaoVertex: `
    #version 300 es
    precision highp float;

    in vec2 position;
    in vec2 uv;

    out vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `,

  ssaoFragment: `
    #version 300 es
    precision highp float;

    in vec2 vUv;

    uniform sampler2D tDepth;
    uniform sampler2D tNormal;
    uniform sampler2D tNoise;
    uniform vec3 samples[64];
    uniform mat4 projectionMatrix;
    uniform mat4 viewMatrix;
    uniform vec2 noiseScale;
    uniform float radius;
    uniform float bias;

    out vec4 fragColor;

    vec3 reconstructPosition(vec2 uv, float depth) {
      vec4 clipPos = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
      vec4 viewPos = inverse(projectionMatrix) * clipPos;
      return viewPos.xyz / viewPos.w;
    }

    void main() {
      float depth = texture(tDepth, vUv).r;
      vec3 fragPos = reconstructPosition(vUv, depth);
      vec3 normal = normalize(texture(tNormal, vUv).xyz * 2.0 - 1.0);
      vec3 randomVec = normalize(texture(tNoise, vUv * noiseScale).xyz);

      vec3 tangent = normalize(randomVec - normal * dot(randomVec, normal));
      vec3 bitangent = cross(normal, tangent);
      mat3 TBN = mat3(tangent, bitangent, normal);

      float occlusion = 0.0;
      for(int i = 0; i < 64; ++i) {
        vec3 sample = TBN * samples[i];
        sample = fragPos + sample * radius;

        vec4 offset = projectionMatrix * vec4(sample, 1.0);
        offset.xyz /= offset.w;
        offset.xyz = offset.xyz * 0.5 + 0.5;

        float sampleDepth = texture(tDepth, offset.xy).r;
        vec3 samplePos = reconstructPosition(offset.xy, sampleDepth);

        float rangeCheck = smoothstep(0.0, 1.0, radius / abs(fragPos.z - samplePos.z));
        occlusion += (samplePos.z >= sample.z + bias ? 1.0 : 0.0) * rangeCheck;
      }

      occlusion = 1.0 - (occlusion / 64.0);
      fragColor = vec4(vec3(occlusion), 1.0);
    }
  `,
};

// WebGL1 fallback shaders
export const WEBGL1_FALLBACK_SHADERS = {
  instancedVertex: `
    precision highp float;

    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;
    attribute vec3 color;
    attribute vec4 instanceMatrix0;
    attribute vec4 instanceMatrix1;
    attribute vec4 instanceMatrix2;
    attribute vec4 instanceMatrix3;
    attribute vec3 instanceColor;

    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    uniform vec3 cameraPosition;

    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying vec3 vColor;
    varying float vDistance;

    void main() {
      mat4 instanceMatrix = mat4(
        instanceMatrix0,
        instanceMatrix1,
        instanceMatrix2,
        instanceMatrix3
      );

      vUv = uv;
      vColor = instanceColor * color;

      vec4 worldPosition = instanceMatrix * vec4(position, 1.0);
      vPosition = worldPosition.xyz;
      vNormal = normalize((instanceMatrix * vec4(normal, 0.0)).xyz);
      vDistance = length(vPosition - cameraPosition);

      gl_Position = projectionMatrix * modelViewMatrix * worldPosition;
    }
  `,

  instancedFragment: `
    precision mediump float;

    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying vec3 vColor;
    varying float vDistance;

    uniform vec3 ambientColor;
    uniform vec3 directionalLightColor;
    uniform vec3 directionalLightDirection;
    uniform float lodDistance1;
    uniform float lodDistance2;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 lightDir = normalize(-directionalLightDirection);

      float lambert = max(dot(normal, lightDir), 0.0);
      vec3 finalColor;

      if (vDistance < lodDistance1) {
        finalColor = vColor * (ambientColor + directionalLightColor * lambert);
      } else if (vDistance < lodDistance2) {
        finalColor = vColor * ambientColor;
      } else {
        float fade = 1.0 - smoothstep(lodDistance1, lodDistance2, vDistance);
        finalColor = vColor * ambientColor * fade;
      }

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};

// Shader utility functions
export class ShaderUtils {
  static createShader(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    type: number,
    source: string,
  ): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  static createProgram(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader,
  ): WebGLProgram | null {
    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking error:", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    return program;
  }

  static isWebGL2(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
  ): gl is WebGL2RenderingContext {
    return "texStorage2D" in gl;
  }

  static getOptimizedShaders(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
  ) {
    return this.isWebGL2(gl) ? GPU_OPTIMIZED_SHADERS : WEBGL1_FALLBACK_SHADERS;
  }

  // Generate LOD-optimized geometry based on distance
  static generateLODGeometry(distance: number, baseVertices: number): number {
    if (distance < 50) return baseVertices; // Full detail
    if (distance < 100) return Math.floor(baseVertices * 0.6); // 60% detail
    if (distance < 200) return Math.floor(baseVertices * 0.3); // 30% detail
    return Math.floor(baseVertices * 0.1); // 10% detail
  }

  // Optimize shader uniforms for batch updates
  static batchUniformUpdates(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    program: WebGLProgram,
    uniforms: Record<string, any>,
  ) {
    gl.useProgram(program);

    Object.entries(uniforms).forEach(([name, value]) => {
      const location = gl.getUniformLocation(program, name);
      if (location === null) return;

      if (typeof value === "number") {
        gl.uniform1f(location, value);
      } else if (Array.isArray(value)) {
        switch (value.length) {
          case 2:
            gl.uniform2fv(location, value);
            break;
          case 3:
            gl.uniform3fv(location, value);
            break;
          case 4:
            gl.uniform4fv(location, value);
            break;
          case 16:
            gl.uniformMatrix4fv(location, false, value);
            break;
        }
      }
    });
  }
}

// Performance profiler for shaders
export class ShaderProfiler {
  private static queries = new Map<string, WebGLQuery>();

  static startTiming(gl: WebGL2RenderingContext, name: string) {
    if (!this.isWebGL2(gl)) return;

    const query = gl.createQuery();
    if (!query) return;

    this.queries.set(name, query);
    gl.beginQuery(0x88bf, query); // gl.TIME_ELAPSED_EXT
  }

  static endTiming(gl: WebGL2RenderingContext, name: string): Promise<number> {
    return new Promise((resolve) => {
      if (!this.isWebGL2(gl)) {
        resolve(0);
        return;
      }

      const query = this.queries.get(name);
      if (!query) {
        resolve(0);
        return;
      }

      gl.endQuery(0x88bf); // gl.TIME_ELAPSED_EXT

      const checkResult = () => {
        const available = gl.getQueryParameter(
          query,
          gl.QUERY_RESULT_AVAILABLE,
        );
        if (available) {
          const result = gl.getQueryParameter(query, gl.QUERY_RESULT);
          gl.deleteQuery(query);
          this.queries.delete(name);
          resolve(result / 1000000); // Convert to milliseconds
        } else {
          setTimeout(checkResult, 1);
        }
      };

      checkResult();
    });
  }

  private static isWebGL2(gl: any): gl is WebGL2RenderingContext {
    return "createQuery" in gl;
  }
}

export default GPU_OPTIMIZED_SHADERS;
