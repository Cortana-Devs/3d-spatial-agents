import * as THREE from 'three';

class ResourcePool<T> {
  private pool: T[] = [];
  private inUse = new Set<T>();
  private factory: () => T;
  private reset: (item: T) => void;
  private maxSize: number;

  constructor(factory: () => T, reset: (item: T) => void, maxSize = 1000) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
  }

  acquire(): T {
    let item: T;
    if (this.pool.length > 0) {
      item = this.pool.pop()!;
    } else if (this.inUse.size < this.maxSize) {
      item = this.factory();
    } else {
      throw new Error('Resource pool exhausted');
    }
    this.inUse.add(item);
    return item;
  }

  release(item: T): void {
    if (!this.inUse.has(item)) {
      console.warn('Attempting to release an item not in use');
      return;
    }
    this.inUse.delete(item);
    this.reset(item);
    if (this.pool.length < this.maxSize) {
      this.pool.push(item);
    }
  }

  clear(): void {
    this.pool = [];
    this.inUse.clear();
  }
}

export class BenchmarkResourceManager {
  private static instance: BenchmarkResourceManager;
  private geometryPool: ResourcePool<THREE.BoxGeometry>;
  private materialPool: ResourcePool<THREE.MeshBasicMaterial>;
  private meshPool: ResourcePool<THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>>;

  private constructor() {
    this.geometryPool = new ResourcePool(
      () => new THREE.BoxGeometry(1, 1, 1),
      (geo: THREE.BoxGeometry) => {
        geo.dispose();
        return geo;
      },
      1000
    );

    this.materialPool = new ResourcePool(
      () => new THREE.MeshBasicMaterial({ color: 0xffffff }),
      (mat: THREE.MeshBasicMaterial) => {
        mat.dispose();
        return mat;
      },
      1000
    );

    this.meshPool = new ResourcePool(
      () => {
        const geometry = this.geometryPool.acquire();
        const material = this.materialPool.acquire();
        return new THREE.Mesh(geometry, material);
      },
      (mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>) => {
        if (mesh.geometry) {
          this.releaseGeometry(mesh.geometry);
          mesh.geometry = this.geometryPool.acquire();
        }
        if (mesh.material) {
          this.releaseMaterial(mesh.material);
          mesh.material = this.materialPool.acquire();
        }
        return mesh;
      },
      1000
    );
  }

  static getInstance(): BenchmarkResourceManager {
    if (!BenchmarkResourceManager.instance) {
      BenchmarkResourceManager.instance = new BenchmarkResourceManager();
    }
    return BenchmarkResourceManager.instance;
  }

  acquireGeometry(): THREE.BoxGeometry {
    return this.geometryPool.acquire();
  }

  acquireMaterial(): THREE.MeshBasicMaterial {
    return this.materialPool.acquire();
  }

  acquireMesh(): THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial> {
    return this.meshPool.acquire();
  }

  releaseGeometry(geometry: THREE.BoxGeometry): void {
    if (geometry instanceof THREE.BoxGeometry) {
      this.geometryPool.release(geometry);
    }
  }

  releaseMaterial(material: THREE.Material | THREE.Material[]): void {
    if (material instanceof THREE.MeshBasicMaterial) {
      this.materialPool.release(material);
    }
  }

  releaseMesh(mesh: THREE.Mesh): void {
    if (mesh.geometry instanceof THREE.BoxGeometry && 
        mesh.material instanceof THREE.MeshBasicMaterial) {
      this.meshPool.release(mesh as THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>);
    }
  }

  clearAll(): void {
    this.geometryPool.clear();
    this.materialPool.clear();
    this.meshPool.clear();
  }
}
