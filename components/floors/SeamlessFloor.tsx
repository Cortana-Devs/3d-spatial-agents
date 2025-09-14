"use client";

import React, { useMemo } from "react";
import { Vector3 } from "three";
import FloorBlock from "@/components/world/FloorBlock";
import { BlockType } from "@/types/blocks";
import { floorDepthManager } from "@/config/floorDepthConfig";

interface SeamlessFloorProps {
  // Total width/length in grid units. Defaults to 100x100
  size?: number;
  // Center world position. Y is auto-aligned to floor placement Y
  center?: { x: number; z: number } | Vector3;
  // Visual style via existing block types (STONE/WOOD/FROSTED_GLASS/FLOOR)
  blockType?: BlockType;
  // Optional texture scale (repeats across the plane)
  textureRepeat?: number;
}

export const SeamlessFloor: React.FC<SeamlessFloorProps> = ({
  size = 100,
  center,
  blockType = BlockType.FLOOR,
  textureRepeat,
}) => {
  const y = floorDepthManager.getFloorPlacementY();

  const centerVec = useMemo(() => {
    if (!center) return new Vector3(0, y, 0);
    if (center instanceof Vector3) return new Vector3(center.x, y, center.z);
    return new Vector3(center.x, y, center.z);
  }, [center, y]);

  // Default texture repeat to a reasonable tiling based on size
  const repeat = useMemo(() => {
    if (typeof textureRepeat === "number") return textureRepeat;
    // Heuristic: 1 repeat per 2 grid units keeps texel density reasonable
    return Math.max(1, Math.floor(size / 2));
  }, [size, textureRepeat]);

  return (
    <FloorBlock
      size={size}
      position={centerVec}
      blockType={blockType}
      textureRepeat={repeat}
    />
  );
};

export default SeamlessFloor;


