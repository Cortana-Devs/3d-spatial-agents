const THREE = require('three');
const dummy = new THREE.Object3D();
dummy.position.set(0, 0, 0);
dummy.lookAt(new THREE.Vector3(1, 0, 0));
const zAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(dummy.quaternion);
console.log("If target is (1,0,0), Object3D +Z points to:", zAxis);
