import * as THREE from 'three';

// Adjusted for new Sofa Layout (Center at 0, -375)
// Sofas are large (radius ~20) at Center, Left (-45), Right (+45), Back (+30)
export const WAYPOINTS = [
    new THREE.Vector3(0, 5, -330),    // Spawn / Entrance (Safe)
    new THREE.Vector3(25, 5, -340),   // Aisle Right Front
    new THREE.Vector3(-25, 5, -340),  // Aisle Left Front
    new THREE.Vector3(25, 5, -400),   // Aisle Right Back
    new THREE.Vector3(-25, 5, -400),  // Aisle Left Back
    new THREE.Vector3(0, 5, -410),    // Back Alley
];

export const PATROL_SPEED = 8.0;
export const CHASE_SPEED = 13.0; // Slightly faster to catch up
export const IDLE_DURATION = 4.0; // Longer stops to look around
