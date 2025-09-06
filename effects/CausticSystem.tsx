import React, { useRef, useMemo, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const causticVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  
  void main() {
    vUv = uv;
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const causticFragmentShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uColor;
  uniform float uScale;
  uniform vec3 uLightPosition;
  
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  
  float causticPattern(vec2 uv, float time) {
    vec2 p = uv * uScale;
    
    float c1 = sin(p.x * 4.0 + time * 2.0) * sin(p.y * 3.0 + time * 1.5);
    float c2 = sin((p.x + p.y) * 3.0 + time * 3.0) * sin((p.x - p.y) * 2.0 + time * 2.5);
    float c3 = sin(length(p - 0.5) * 8.0 + time * 4.0);
    
    return (c1 + c2 + c3) * 0.33;
  }
  
  void main() {
    float caustic = causticPattern(vUv, uTime);
    caustic = pow(max(0.0, caustic), 2.0);
    
    // Fade based on distance from light
    float lightDistance = length(vWorldPosition - uLightPosition);
    float attenuation = 1.0 / (1.0 + lightDistance * 0.1);
    
    vec3 color = uColor * caustic * uIntensity * attenuation;
    gl_FragColor = vec4(color, caustic * 0.5);
  }
`

interface CausticLightProps {
  position: THREE.Vector3
  intensity: number
  color: THREE.Color
  scale: number
  lightPosition: THREE.Vector3
}

export const CausticLight: React.FC<CausticLightProps> = ({
  position,
  intensity,
  color,
  scale,
  lightPosition
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: causticVertexShader,
      fragmentShader: causticFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: intensity },
        uColor: { value: color },
        uScale: { value: scale },
        uLightPosition: { value: lightPosition }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
  }, [intensity, color, scale, lightPosition])

  useFrame((state) => {
    if (material) {
      material.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  return (
    <mesh ref={meshRef} position={position} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}

export const useCausticSystem = () => {
  const generateCausticLights = useCallback((floors: any[], lightSources: THREE.Vector3[]) => {
    const causticLights: JSX.Element[] = []
    
    floors.forEach((floor, floorIndex) => {
      lightSources.forEach((lightPos, lightIndex) => {
        // Calculate caustic position (below the floor)
        const causticPos = floor.position.clone()
        causticPos.y -= 0.2
        
        causticLights.push(
          <CausticLight
            key={`caustic-${floorIndex}-${lightIndex}`}
            position={causticPos}
            intensity={0.5}
            color={new THREE.Color(0.8, 0.9, 1.0)}
            scale={4.0}
            lightPosition={lightPos}
          />
        )
      })
    })
    
    return causticLights
  }, [])

  return { generateCausticLights }
}
