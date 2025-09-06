import * as THREE from 'three'

// Mock Three.js classes and objects
const mockThree = {
  Scene: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    remove: jest.fn(),
    children: [],
    traverse: jest.fn()
  })),
  
  PerspectiveCamera: jest.fn().mockImplementation((fov, aspect, near, far) => ({
    fov,
    aspect,
    near,
    far,
    position: new THREE.Vector3(),
    rotation: new THREE.Euler(),
    lookAt: jest.fn(),
    updateProjectionMatrix: jest.fn()
  })),

  WebGLRenderer: jest.fn().mockImplementation(() => ({
    setSize: jest.fn(),
    setPixelRatio: jest.fn(),
    render: jest.fn(),
    domElement: document.createElement('canvas'),
    info: {
      render: { calls: 0, triangles: 0 },
      memory: { geometries: 0, textures: 0 }
    }
  })),

  Mesh: jest.fn().mockImplementation((geometry, material) => ({
    geometry,
    material,
    position: new THREE.Vector3(),
    rotation: new THREE.Euler(),
    scale: new THREE.Vector3(1, 1, 1),
    visible: true
  })),

  MeshPhysicalMaterial: jest.fn().mockImplementation((params) => ({
    ...params,
    type: 'MeshPhysicalMaterial',
    needsUpdate: false,
    dispose: jest.fn()
  })),

  // Add other necessary Three.js mock implementations here
}

export default mockThree
