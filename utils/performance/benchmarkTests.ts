import * as THREE from 'three';
import { BenchmarkScenario } from '../../types/benchmark';

export const setupBasicRenderingTest = (scene: THREE.Scene): BenchmarkScenario => {
  // Create basic test scene
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  return {
    update: (time: number) => {
      cube.rotation.x = time;
      cube.rotation.y = time * 0.5;
    },
    cleanup: () => {
      scene.remove(cube);
      geometry.dispose();
      material.dispose();
    }
  };
};

export const setupComplexSceneTest = (scene: THREE.Scene): BenchmarkScenario => {
  const objects: THREE.Mesh[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // Create complex scene with instancing for better performance
  const instancedGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  const instancedMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
  
  const count = 1000;
  const range = 5;

  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(instancedGeometry, instancedMaterial);
    mesh.position.set(
      (Math.random() - 0.5) * range,
      (Math.random() - 0.5) * range,
      (Math.random() - 0.5) * range
    );
    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    scene.add(mesh);
    objects.push(mesh);
  }

  // Add lights
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(1, 1, 1);
  scene.add(light);

  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  return {
    update: (time: number) => {
      objects.forEach((obj, i) => {
        obj.rotation.x = time * (1 + i * 0.001);
        obj.rotation.y = time * (1 + i * 0.002);
      });
    },
    cleanup: () => {
      objects.forEach(obj => scene.remove(obj));
      geometries.forEach(geo => geo.dispose());
      materials.forEach(mat => mat.dispose());
      scene.remove(light);
      scene.remove(ambientLight);
      instancedGeometry.dispose();
      instancedMaterial.dispose();
    }
  };
};
