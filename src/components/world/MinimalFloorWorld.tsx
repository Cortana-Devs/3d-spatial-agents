"use client";

/**
 * Default lightweight environment: floor slab + optional-style composition.
 * Facility floor + outer wall only (open center). Toggle `<FacilityOuterWalls enabled={false} />` for variants.
 *
 * Full research lab (rectangle, furniture, inner walls): `SCENE_WORLD_MODE` in sceneWorldConfig.
 */
import React from "react";
import LabFloor from "@/components/world/LabFloor";
import FacilityOuterWalls from "@/components/world/FacilityOuterWalls";
import CenterGarden from "@/components/world/CenterGarden";

export default function MinimalFloorWorld() {
  return (
    <group name="MinimalFloorWorld">
      <LabFloor />
      <FacilityOuterWalls />
      <CenterGarden />
    </group>
  );
}
