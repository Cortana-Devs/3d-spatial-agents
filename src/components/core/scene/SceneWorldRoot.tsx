"use client";

import ResearchLabHub from "@/components/world/OfficeHub";
import MinimalFloorWorld from "@/components/world/facility/ResearchFacilityWorld";
import { SCENE_WORLD_MODE } from "@/components/core/scene/sceneWorldConfig";

export default function SceneWorldRoot() {
  switch (SCENE_WORLD_MODE) {
    case "full":
      return <ResearchLabHub />;
    case "facility":
      return <MinimalFloorWorld />;
    default:
      return <MinimalFloorWorld />;
  }
}
