import * as THREE from "three";
import { BenchmarkScenario } from "./types";
import { FloorFactory } from "../utils/floorFactory";

/**
 * Utility to push an Object3D to both the scene and tracking array
 */
function addObject(
  scene: THREE.Scene,
  objects: THREE.Object3D[],
  obj: THREE.Object3D,
) {
  scene.add(obj);
  objects.push(obj);
}

/**
 * Utility to push a Light to both the scene and tracking array
 */
function addLight(
  scene: THREE.Scene,
  lights: THREE.Light[],
  light: THREE.Light,
) {
  scene.add(light);
  lights.push(light);
}

/**
 * Creates a basic rendering test scene:
 * - A grid of ground planes
 * - A few instanced box meshes
 * - Ambient and directional light
 */
export function setupBasicRenderingTest(scene: THREE.Scene): BenchmarkScenario {
  const floors: any[] = [];
  const objects: THREE.Object3D[] = [];
  const lights: THREE.Light[] = [];

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  addLight(scene, lights, ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(5, 8, 5);
  dir.castShadow = true;
  addLight(scene, lights, dir);

  // Ground grid of planes
  const groundMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x556677),
    roughness: 0.9,
    metalness: 0.0,
  });
  const planeGeo = new THREE.PlaneGeometry(2, 2);
  for (let x = -5; x <= 5; x++) {
    for (let z = -5; z <= 5; z++) {
      const p = new THREE.Mesh(planeGeo, groundMat);
      p.rotation.x = -Math.PI / 2;
      p.position.set(x * 2, 0, z * 2);
      p.receiveShadow = true;
      addObject(scene, objects, p);

      // logical floor entry
      floors.push(
        FloorFactory.createFrostedGlassFloor(
          new THREE.Vector3(p.position.x, p.position.y, p.position.z),
          "medium_frosted",
        ),
      );
    }
  }

  // Some boxes above ground for variety
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const boxMat = new THREE.MeshStandardMaterial({
    color: 0x88aaff,
    roughness: 0.6,
    metalness: 0.1,
  });
  for (let i = 0; i < 20; i++) {
    const b = new THREE.Mesh(boxGeo, boxMat);
    b.position.set(
      (Math.random() - 0.5) * 12,
      Math.random() * 3 + 0.5,
      (Math.random() - 0.5) * 12,
    );
    b.castShadow = true;
    addObject(scene, objects, b);
  }

  return {
    floors,
    objects,
    lights,
    cleanup: () => {
      objects.forEach((o) => scene.remove(o));
      lights.forEach((l) => scene.remove(l));
    },
  };
}

/**
 * Creates a transparency stress test:
 * - Multiple layers of transparent overlapping planes
 * - Colored point lights for visual effect
 */
export function setupTransparencyStressTest(
  scene: THREE.Scene,
): BenchmarkScenario {
  const floors: any[] = [];
  const objects: THREE.Object3D[] = [];
  const lights: THREE.Light[] = [];

  // Transparent material planes layered
  const planeGeo = new THREE.PlaneGeometry(1.5, 1.5);
  const layers = 6;
  const extent = 6;
  for (let layer = 0; layer < layers; layer++) {
    const opacity = THREE.MathUtils.lerp(0.15, 0.5, layer / (layers - 1));
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(layer / layers, 0.4, 0.6),
      transparent: true,
      opacity,
      roughness: 0.2,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    for (let x = -extent; x <= extent; x += 2) {
      for (let z = -extent; z <= extent; z += 2) {
        const m = new THREE.Mesh(planeGeo, mat);
        m.rotation.x = -Math.PI / 2;
        m.position.set(x, layer * 0.4, z);
        addObject(scene, objects, m);

        floors.push(
          FloorFactory.createFrostedGlassFloor(
            new THREE.Vector3(x, layer * 0.4, z),
            "clear_frosted",
          ),
        );
      }
    }
  }

  // Ambient plus colored points
  const amb = new THREE.AmbientLight(0xffffff, 0.3);
  addLight(scene, lights, amb);

  const colors = [0xff6b6b, 0x4ecdc4, 0xffbe0b];
  colors.forEach((c, i) => {
    const p = new THREE.PointLight(c, 1.0, 25, 2);
    p.position.set(
      Math.cos((i * Math.PI * 2) / colors.length) * 8,
      5,
      Math.sin((i * Math.PI * 2) / colors.length) * 8,
    );
    addLight(scene, lights, p);
  });

  return {
    floors,
    objects,
    lights,
    cleanup: () => {
      objects.forEach((o) => scene.remove(o));
      lights.forEach((l) => scene.remove(l));
    },
  };
}

/**
 * LOD effectiveness test:
 * - Rings of planes at increasing distances
 * - Ring markers as distance guides
 */
export function setupLODEffectivenessTest(
  scene: THREE.Scene,
): BenchmarkScenario {
  const floors: any[] = [];
  const objects: THREE.Object3D[] = [];
  const lights: THREE.Light[] = [];

  // Lighting
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.9);
  addLight(scene, lights, hemi);

  // Planes distributed in circles
  const planeGeo = new THREE.PlaneGeometry(1.2, 1.2);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x9ecfff,
    roughness: 0.5,
    metalness: 0.05,
  });

  for (let distance = 5; distance <= 60; distance += 10) {
    for (let angle = 0; angle < 360; angle += 15) {
      const rad = (angle * Math.PI) / 180;
      const x = Math.cos(rad) * distance;
      const z = Math.sin(rad) * distance;

      const m = new THREE.Mesh(planeGeo, baseMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0, z);
      addObject(scene, objects, m);

      floors.push(
        FloorFactory.createFrostedGlassFloor(
          new THREE.Vector3(x, 0, z),
          "medium_frosted",
        ),
      );
    }

    // Distance marker ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(distance - 0.4, distance + 0.4, 64),
      new THREE.MeshBasicMaterial({
        color: 0x666666,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    addObject(scene, objects, ring);
  }

  return {
    floors,
    objects,
    lights,
    cleanup: () => {
      objects.forEach((o) => scene.remove(o));
      lights.forEach((l) => scene.remove(l));
    },
  };
}

/**
 * Batching optimization test:
 * - Many meshes sharing a small set of materials to allow batching
 * - A grid helper for spatial reference
 */
export function setupBatchingOptimizationTest(
  scene: THREE.Scene,
): BenchmarkScenario {
  const floors: any[] = [];
  const objects: THREE.Object3D[] = [];
  const lights: THREE.Light[] = [];

  const amb = new THREE.AmbientLight(0xffffff, 0.5);
  addLight(scene, lights, amb);

  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(-6, 10, -6);
  addLight(scene, lights, dir);

  const materialVariants = [
    new THREE.MeshStandardMaterial({
      color: 0xaad6ff,
      roughness: 0.6,
      metalness: 0.1,
    }),
    new THREE.MeshStandardMaterial({
      color: 0xffe0aa,
      roughness: 0.5,
      metalness: 0.05,
    }),
    new THREE.MeshStandardMaterial({
      color: 0xc8ffaa,
      roughness: 0.7,
      metalness: 0.0,
    }),
  ];

  const planeGeo = new THREE.PlaneGeometry(1, 1);
  for (let x = -20; x <= 20; x += 2) {
    for (let z = -20; z <= 20; z += 2) {
      const mat =
        materialVariants[Math.abs(x * 31 + z * 17) % materialVariants.length];
      const m = new THREE.Mesh(planeGeo, mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0, z);
      addObject(scene, objects, m);

      const glassType =
        Math.abs(x + z) % 3 === 0
          ? "clear_frosted"
          : Math.abs(x + z) % 3 === 1
            ? "medium_frosted"
            : "heavy_frosted";
      floors.push(
        FloorFactory.createFrostedGlassFloor(
          new THREE.Vector3(x, 0, z),
          glassType as "clear_frosted" | "medium_frosted" | "heavy_frosted",
        ),
      );
    }
  }

  // Grid reference
  const grid = new THREE.GridHelper(44, 44, 0x333333, 0x555555);
  addObject(scene, objects, grid);

  return {
    floors,
    objects,
    lights,
    cleanup: () => {
      objects.forEach((o) => scene.remove(o));
      lights.forEach((l) => scene.remove(l));
    },
  };
}

/**
 * Memory stress test:
 * - Many unique planes and some markers to increase object count
 * - Variety of materials to avoid over-aggressive batching
 */
export function setupMemoryStressTest(scene: THREE.Scene): BenchmarkScenario {
  const floors: any[] = [];
  const objects: THREE.Object3D[] = [];
  const lights: THREE.Light[] = [];

  const amb = new THREE.AmbientLight(0xffffff, 0.4);
  addLight(scene, lights, amb);

  const colors = [0xb3e5fc, 0xffccbc, 0xc8e6c9, 0xd1c4e9, 0xffecb3].map(
    (c) => new THREE.Color(c),
  );

  const materials = colors.map(
    (c, i) =>
      new THREE.MeshStandardMaterial({
        color: c,
        roughness: 0.4 + (i % 3) * 0.2,
        metalness: (i % 2) * 0.1,
      }),
  );

  const planeGeo = new THREE.PlaneGeometry(1, 1);
  for (let i = 0; i < 200; i++) {
    const x = (Math.random() - 0.5) * 80;
    const z = (Math.random() - 0.5) * 80;
    const mat = materials[i % materials.length];

    const m = new THREE.Mesh(planeGeo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0, z);
    addObject(scene, objects, m);

    const glassTypes = [
      "clear_frosted",
      "light_frosted",
      "medium_frosted",
      "heavy_frosted",
    ] as const;
    floors.push(
      FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(x, 0, z),
        glassTypes[i % glassTypes.length],
      ),
    );
  }

  // Boundary markers for visualization
  const boundaryPositions = [
    new THREE.Vector3(-40, 0, -40),
    new THREE.Vector3(40, 0, -40),
    new THREE.Vector3(-40, 0, 40),
    new THREE.Vector3(40, 0, 40),
  ];

  boundaryPositions.forEach((pos) => {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xff3333 }),
    );
    marker.position.copy(pos);
    addObject(scene, objects, marker);
  });

  return {
    floors,
    objects,
    lights,
    cleanup: () => {
      objects.forEach((o) => scene.remove(o));
      lights.forEach((l) => scene.remove(l));
    },
  };
}

/**
 * Aggregated helpers export for convenience
 */
export const benchmarkHelpers = {
  setupBasicRenderingTest,
  setupTransparencyStressTest,
  setupLODEffectivenessTest,
  setupBatchingOptimizationTest,
  setupMemoryStressTest,
};
