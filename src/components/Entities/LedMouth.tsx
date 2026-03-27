import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

// Use tiny spheres for a "holographic particle swarm" look
const particleGeo = new THREE.SphereGeometry(0.001, 8, 8);

// White emissive material—we will colorize each particle individually via instance colors
const particleMat = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  emissive: '#ffffff',
  emissiveIntensity: 2.5,
  toneMapped: false,
  transparent: true,
  opacity: 0.9,
});

// Sleek, dark glass backing
const bgMat = new THREE.MeshPhysicalMaterial({
  color: '#000000',
  metalness: 0.9,
  roughness: 0.2,
  clearcoat: 1.0,
  clearcoatRoughness: 0.1,
});

interface LedMouthProps {
  position?: [number, number, number];
  analyser?: AnalyserNode | null;
}

export default function LedMouth({ 
  position = [0, -0.035, 0.076],
  analyser 
}: LedMouthProps) {
  const count = 128; // 64 upper, 64 lower for an ultra-smooth, high-res contour
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorObj = useMemo(() => new THREE.Color(), []);
  
  // Advanced AI color palette
  const colorIdle = useMemo(() => new THREE.Color('#0ea5e9'), []); // Cyan
  const colorActive = useMemo(() => new THREE.Color('#a855f7'), []); // Purple
  const colorPeak = useMemo(() => new THREE.Color('#f43f5e'), []); // Rose/Pink

  const state = useRef({
    openness: 0,
    width: 1,
    smile: 0,
  });

  // Pre-calculate all static math for the 128 particles to save thousands of operations per frame
  const particleData = useMemo(() => {
    const data = [];
    const half = count / 2;
    for (let i = 0; i < count; i++) {
      const isUpper = i < half;
      const idx = isUpper ? i : i - half;
      const nx = (idx / (half - 1)) * 2 - 1; // Normalized X from -1 to 1

      // Base lip curve (Parabola)
      const envelope = 1 - (nx * nx);
      // Cupid's bow creates the natural dip in the center of the upper lip
      const cupidsBow = isUpper ? (1 - 0.5 * Math.exp(-40 * nx * nx)) : 1;
      // Taper particles at the edges
      const baseScale = 1 - Math.abs(nx) * 0.5;
      // Map X position to frequency bin
      const bin = Math.floor(Math.abs(nx) * 20);
      // Wrap around the curved visor (Z-curve)
      const z = 0.002 - (nx * nx) * 0.008;

      data.push({ isUpper, nx, envelope, cupidsBow, baseScale, bin, z });
    }
    return data;
  }, [count]);

  useFrame((_, delta) => {
    let vol = 0, bass = 0, mid = 0, treble = 0;

    if (analyser) {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      
      for (let i = 0; i < data.length; i++) {
        const val = data[i] / 255.0;
        vol += val;
        if (i < 4) bass += val;
        else if (i < 12) mid += val;
        else treble += val;
      }
      vol /= data.length;
      bass /= 4;
      mid /= 8;
      treble /= (data.length - 12);

      // Idle state: flat line, slight breathing
      const t = _.clock.getElapsedTime();
      let tOpen = 0.01 + Math.sin(t * 2) * 0.005;
      let tWidth = 0.8 + Math.sin(t * 1.5) * 0.02;
      let tSmile = 0.1;

      if (vol > 0.01) {
        // Advanced Viseme mapping (Formant approximation)
        tOpen = 0.02 + (bass * 0.35) + (mid * 0.45) - (treble * 0.1);
        tWidth = 0.6 + (mid * 0.5) + (treble * 0.6) - (bass * 0.4);
        tSmile = 0.1 + (treble * 0.8) - (bass * 0.2);
      }

      // Clamp maximum openness
      tOpen = Math.min(0.8, tOpen);

      // Fluid transitions
      const dt = 1 - Math.exp(-18 * delta);
      state.current.openness += (Math.max(0, tOpen) - state.current.openness) * dt;
      state.current.width += (Math.max(0.4, Math.min(1.5, tWidth)) - state.current.width) * dt;
      state.current.smile += (tSmile - state.current.smile) * dt;

      if (meshRef.current) {
        const mouthW = 0.045 * state.current.width;
        const mouthH = 0.010 * state.current.openness;

        for (let i = 0; i < count; i++) {
          const p = particleData[i];
          let x = p.nx * mouthW;
          let y = 0;

          if (p.isUpper) {
            y = (mouthH * p.envelope * p.cupidsBow) + (state.current.smile * p.nx * p.nx * 0.015);
          } else {
            y = -(mouthH * p.envelope) + (state.current.smile * p.nx * p.nx * 0.015);
          }

          let freq = 0;
          if (vol > 0.01) {
            freq = (data[p.bin] || 0) / 255.0;
            y += freq * 0.0015 * (p.isUpper ? 1 : -1);
          }

          dummy.position.set(x, y, p.z);
          const pulse = freq * 1.5;
          dummy.scale.setScalar(p.baseScale + pulse);
          dummy.updateMatrix();
          meshRef.current.setMatrixAt(i, dummy.matrix);

          if (freq > 0.6) {
            colorObj.lerpColors(colorActive, colorPeak, (freq - 0.6) * 2.5);
          } else {
            colorObj.lerpColors(colorIdle, colorActive, freq * 1.6);
          }
          meshRef.current.setColorAt(i, colorObj);
        }
        
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) {
          meshRef.current.instanceColor.needsUpdate = true;
        }
      }
    } else {
      // Resting state when no analyser is present
      const t = _.clock.getElapsedTime();
      const tOpen = 0.01 + Math.sin(t * 2) * 0.005;
      const tWidth = 0.8 + Math.sin(t * 1.5) * 0.02;
      const tSmile = 0.1;
      
      const dt = 1 - Math.exp(-18 * delta);
      state.current.openness += (tOpen - state.current.openness) * dt;
      state.current.width += (tWidth - state.current.width) * dt;
      state.current.smile += (tSmile - state.current.smile) * dt;

      if (meshRef.current) {
        const mouthW = 0.045 * state.current.width;
        const mouthH = 0.010 * state.current.openness;

        for (let i = 0; i < count; i++) {
          const p = particleData[i];
          let x = p.nx * mouthW;
          let y = p.isUpper 
            ? (mouthH * p.envelope * p.cupidsBow) + (state.current.smile * p.nx * p.nx * 0.015)
            : -(mouthH * p.envelope) + (state.current.smile * p.nx * p.nx * 0.015);

          dummy.position.set(x, y, p.z);
          dummy.scale.setScalar(p.baseScale);
          dummy.updateMatrix();
          meshRef.current.setMatrixAt(i, dummy.matrix);
          meshRef.current.setColorAt(i, colorIdle);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
      }
    }
  });

  return (
    <group position={position}>
      <RoundedBox 
        args={[0.13, 0.045, 0.005]} 
        radius={0.01} 
        smoothness={4} 
        material={bgMat} 
        position={[0, 0, -0.002]} 
      />
      <instancedMesh 
        ref={meshRef} 
        args={[particleGeo, particleMat, count]} 
        castShadow={false}
        receiveShadow={false}
      />
    </group>
  );
}
