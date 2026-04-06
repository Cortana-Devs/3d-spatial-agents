import React from "react";
import { interiorFloorGeometry, exteriorPlazaGeometry } from "./FacilityGeometries";
import { floorMaterial, concreteMaterial } from "./FacilityMaterials";
import { DEFAULT_LAB_HUB } from "./labFloorConstants";

export default function FacilityFloor() {
  return (
    <group>
      {/* Base ground slab to prevent falling off edge of plaza */}
      <mesh
        position={[DEFAULT_LAB_HUB.x, 0, DEFAULT_LAB_HUB.z]}
        receiveShadow
        userData={{
          type: "Structure",
          id: "ground-main",
          name: "Lab Ground",
        }}
        onUpdate={(self) => {
          self.layers.enable(1);
        }}
      >
        <boxGeometry args={[400, 6, 400]} />
        <meshStandardMaterial color="#2a2f38" />
      </mesh>

      {/* Interior Wooden Floor */}
      <mesh
        geometry={interiorFloorGeometry}
        material={floorMaterial}
        position={[DEFAULT_LAB_HUB.x, DEFAULT_LAB_HUB.y - 0.2, DEFAULT_LAB_HUB.z]}
        receiveShadow
        userData={{ type: "Structure", id: "interior-floor" }}
        onUpdate={(self) => {
          self.layers.enable(1);
        }}
      />
      
      {/* Exterior Concrete Plaza */}
      <mesh
        geometry={exteriorPlazaGeometry}
        material={concreteMaterial}
        position={[DEFAULT_LAB_HUB.x, DEFAULT_LAB_HUB.y - 0.15, DEFAULT_LAB_HUB.z]}
        receiveShadow
        userData={{ type: "Structure", id: "exterior-plaza" }}
        onUpdate={(self) => {
          self.layers.enable(1);
        }}
      />
    </group>
  );
}
