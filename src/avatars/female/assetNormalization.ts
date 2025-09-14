/**
 * Female Avatar Asset Normalization Module
 * Feature: F01-FEMALE-AVATAR
 *
 * Responsibility:
 *  - Lazy load female GLB model
 *  - Validate skeleton integrity & required bone names
 *  - Apply canonical transforms (scale/orientation) if needed
 *  - Produce NormalizedAvatarAsset metadata for runtime adapter
 *  - Provide debug accessor
 *
 * Constraints:
 *  - Strong TypeScript typing (no `any`)
 *  - Abortable load
 *  - No global mutable state leakage (only internal module cache)
 *  - Avoid large upfront work: minimal synchronous processing
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

export interface NormalizedAvatarAsset {
  scene: THREE.Group;
  skeleton: THREE.Skeleton;
  boneNameHash: string[];
  sourcePath: string;
  meshCount: number;
  materialCount: number;
  estimatedVRAMMB: number;
}

export class SkeletonMismatchError extends Error {
  public readonly missingBones: string[];
  constructor(message: string, missingBones: string[]) {
    super(message);
    this.name = 'SkeletonMismatchError';
    this.missingBones = missingBones;
  }
}

const FEMALE_MODEL_PATH = '/models/c-girl.glb';

/**
 * Internal state for last successful normalization (for debug)
 */
let lastNormalized: NormalizedAvatarAsset | null = null;

/**
 * Required bone names for compatibility check.
 * Keep list minimal & semantically stable.
 */
const REQUIRED_BONE_NAMES: readonly string[] = [
  'Hips',
  'Spine',
  'Spine1',
  'Spine2',
  'Neck',
  'Head',
  'LeftUpLeg',
  'LeftLeg',
  'LeftFoot',
  'RightUpLeg',
  'RightLeg',
  'RightFoot',
  'LeftShoulder',
  'LeftArm',
  'LeftForeArm',
  'RightShoulder',
  'RightArm',
  'RightForeArm',
] as const;

/**
 * Public debug accessor returning the last successfully normalized asset metadata.
 */
export function debugFemaleAssetMetadata(): NormalizedAvatarAsset | null {
  return lastNormalized;
}

/**
 * Estimate GPU memory footprint (rough heuristic).
 * We sum attribute array byte lengths & index buffers.
 * Convert to MB (base 1024^2).
 */
function estimateVRAMMB(root: THREE.Object3D): number {
  let bytes = 0;
  root.traverse(obj => {
    if ((obj as unknown as { isMesh?: boolean }).isMesh) {
      const mesh = obj as THREE.Mesh;
      const geometry = mesh.geometry as THREE.BufferGeometry;
      const attributes = geometry.attributes;
      for (const key in attributes) {
        const attr = attributes[key] as THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
        if ('array' in attr && attr.array) {
          bytes += attr.array.byteLength;
        }
      }
      if (geometry.index && geometry.index.array) {
        bytes += geometry.index.array.byteLength;
      }
    }
  });
  // Add a heuristic multiplier for materials & textures if any (very coarse).
  const materialCount = countMaterials(root);
  bytes += materialCount * 128 * 1024; // assume ~128KB per material
  return +(bytes / (1024 * 1024)).toFixed(2);
}

/**
 * Count distinct materials under the scene graph.
 */
function countMaterials(root: THREE.Object3D): number {
  const set = new Set<THREE.Material>();
  root.traverse(obj => {
    if ((obj as unknown as { isMesh?: boolean }).isMesh) {
      const mesh = obj as THREE.Mesh;
      const material = mesh.material;
      if (Array.isArray(material)) {
        material.forEach(m => set.add(m));
      } else if (material) {
        set.add(material);
      }
    }
  });
  return set.size;
}

/**
 * Collect first found skeleton (assumes a SkinnedMesh exists).
 * If multiple, we pick the one with greatest bone count.
 */
function extractPrimarySkeleton(root: THREE.Object3D): THREE.Skeleton {
  const skeletons: THREE.Skeleton[] = [];
  root.traverse(obj => {
    const maybeSkinned = obj as unknown as { isSkinnedMesh?: boolean; skeleton?: THREE.Skeleton };
    if (maybeSkinned.isSkinnedMesh && maybeSkinned.skeleton) {
      skeletons.push(maybeSkinned.skeleton);
    }
  });
  if (skeletons.length === 0) {
    // Create empty skeleton to fail validation
    return new THREE.Skeleton([]);
  }
  skeletons.sort((a, b) => b.bones.length - a.bones.length);
  return skeletons[0];
}

/**
 * Validate skeleton bone coverage.
 */
function validateSkeleton(skeleton: THREE.Skeleton): void {
  const boneNames = new Set<string>(skeleton.bones.map(b => b.name));
  const missing: string[] = [];
  for (const required of REQUIRED_BONE_NAMES) {
    if (!boneNames.has(required)) {
      missing.push(required);
    }
  }
  if (missing.length > 0) {
    throw new SkeletonMismatchError(
      `Female avatar skeleton missing required bones: ${missing.join(', ')}`,
      missing
    );
  }
}

/**
 * Apply canonical transforms if the asset uses different coordinate system or scale.
 * For now we assume model is already Y-up & correct scale; hook left for future adjustments.
 */
function applyCanonicalTransforms(scene: THREE.Group): void {
  // Placeholder for future adjustments:
  // e.g. scene.rotation.x = -Math.PI / 2; scene.scale.setScalar(0.01);
  // Keep operations minimal to avoid layout thrash.
}

/**
 * Abort-aware GLB load Promise wrapper.
 */
function loadGLB(path: string, signal?: AbortSignal): Promise<THREE.Group> {
  return new Promise<THREE.Group>((resolve, reject) => {
    const loader = new GLTFLoader();
    let aborted = false;

    const onAbort = () => {
      aborted = true;
      reject(new DOMException('Aborted', 'AbortError'));
    };
    if (signal) {
      if (signal.aborted) {
        return onAbort();
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }

    loader.load(
      path,
      gltf => {
        if (aborted) return;
        const group = gltf.scene || gltf.scenes[0];
        if (!group) {
            reject(new Error('GLTF file has no scene root.'));
            return;
        }
        resolve(group);
      },
      undefined,
      err => {
        if (aborted) return;
        reject(err instanceof Error ? err : new Error('Unknown GLTF load error'));
      }
    );
  });
}

/**
 * Create a shallow stats snapshot for logs.
 */
function buildStats(scene: THREE.Group, skeleton: THREE.Skeleton, vram: number): Record<string, string | number> {
  return {
    bones: skeleton.bones.length,
    meshCount: countMeshes(scene),
    materialCount: countMaterials(scene),
    vramMB: vram
  };
}

function countMeshes(root: THREE.Object3D): number {
  let total = 0;
  root.traverse(obj => {
    if ((obj as unknown as { isMesh?: boolean }).isMesh) {
      total += 1;
    }
  });
  return total;
}

function logDebug(message: string, data?: Record<string, unknown>): void {
  // Lightweight logging (integration with avatarLogger can be added later).
  // Gate by environment variable if desired.
  // eslint-disable-next-line no-console
  console.debug('[AVATAR][LOAD][FEMALE]', message, data ?? '');
}

/**
 * Main public function: load + normalize the female avatar asset.
 * Returns a fresh clone each invocation (scene + skeleton not shared).
 *
 * @param signal optional AbortSignal to cancel load before completion
 */
export async function loadAndNormalizeFemaleAvatar(signal?: AbortSignal): Promise<NormalizedAvatarAsset> {
  const start = performance.now();

  logDebug('Begin load', { path: FEMALE_MODEL_PATH });

  const rawScene = await loadGLB(FEMALE_MODEL_PATH, signal);

  // Apply canonical transforms to root scene
  applyCanonicalTransforms(rawScene);

  // We clone so caller modifications won't mutate cached base (if future caching added).
  const scene = clone(rawScene) as THREE.Group;

  // Extract skeleton
  const skeleton = extractPrimarySkeleton(scene);
  validateSkeleton(skeleton);

  // Freeze transforms where possible (avoid dynamic matrix recalcs).
  scene.updateMatrixWorld(true);

  // Collect metadata
  const boneNameHash = skeleton.bones.map(b => b.name).sort((a, b) => (a < b ? -1 : 1));
  const meshCount = countMeshes(scene);
  const materialCount = countMaterials(scene);
  const estimatedVRAMMB = estimateVRAMMB(scene);

  const asset: NormalizedAvatarAsset = {
    scene,
    skeleton,
    boneNameHash,
    sourcePath: FEMALE_MODEL_PATH,
    meshCount,
    materialCount,
    estimatedVRAMMB
  };

  lastNormalized = asset;

  const end = performance.now();
  logDebug('Load success', {
    durationMs: +(end - start).toFixed(2),
    ...buildStats(scene, skeleton, estimatedVRAMMB)
  });

  return asset;
}

/**
 * Utility to check if previously normalized asset exists (simple boolean).
 */
export function hasLoadedFemaleAvatar(): boolean {
  return lastNormalized !== null;
}

/**
 * Deep dispose helper (optional use by runtime adapter if needed).
 * This does not modify caches; provided for completeness.
 */
export function disposeNormalizedAsset(asset: NormalizedAvatarAsset): void {
  asset.scene.traverse(obj => {
    if ((obj as unknown as { isMesh?: boolean }).isMesh) {
      const mesh = obj as THREE.Mesh;
      mesh.geometry.dispose();
      // Materials
      const mat = mesh.material;
      if (Array.isArray(mat)) {
        mat.forEach(m => disposeMaterial(m));
      } else if (mat) {
        disposeMaterial(mat);
      }
    }
  });
}

function disposeMaterial(material: THREE.Material): void {
  // Attempt to dispose known texture slots to aid GC.
  const record = material as unknown as Record<string, unknown>;
  Object.keys(record).forEach(key => {
    const value = record[key];
    if (value && typeof value === 'object') {
      const maybeTex = value as { isTexture?: boolean; dispose?: () => void };
      if (maybeTex.isTexture && typeof maybeTex.dispose === 'function') {
        maybeTex.dispose();
      }
    }
  });
  material.dispose();
}

/**
 * Debug summary string builder (for quick logs / dev overlay).
 */
export function summarizeFemaleAsset(): string {
  if (!lastNormalized) return 'Female avatar not loaded';
  return [
    'FemaleAvatar',
    `Meshes=${lastNormalized.meshCount}`,
    `Materials=${lastNormalized.materialCount}`,
    `Bones=${lastNormalized.skeleton.bones.length}`,
    `VRAM~${lastNormalized.estimatedVRAMMB}MB`
  ].join(' | ');
}
