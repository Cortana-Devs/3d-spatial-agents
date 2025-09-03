"use client";

import React, { useEffect } from "react";
import { useExternalAnimations } from "../../utils/useExternalAnimations";
import { getDefaultAnimationPaths } from "../../utils/animationUtils";

/**
 * External Animation Test Component
 * Test the external animation loading system directly
 */
export default function ExternalAnimationTest() {
  const animationPaths = getDefaultAnimationPaths();
  
  const externalAnimations = useExternalAnimations(animationPaths, {
    enableCaching: true,
    enableConcurrentLoading: true,
    enableLogging: true,
    enableRetry: true,
  });
  
  useEffect(() => {
    console.log("🧪 External Animation Test - Paths:", animationPaths);
    console.log("🧪 External Animation Test - State:", {
      loading: externalAnimations.loading,
      error: externalAnimations.error?.message,
      clipsCount: externalAnimations.clips.size,
      totalCount: externalAnimations.totalCount,
      loadedCount: externalAnimations.loadedCount,
      progress: externalAnimations.progress
    });
    
    if (externalAnimations.clips.size > 0) {
      console.log("🧪 External Animation Test - Loaded clips:", Array.from(externalAnimations.clips.keys()));
      
      // Test each clip
      externalAnimations.clips.forEach((clip, name) => {
        console.log(`🧪 Clip "${name}":`, {
          duration: clip.duration,
          tracks: clip.tracks.length,
          uuid: clip.uuid
        });
      });
    }
    
    if (externalAnimations.error) {
      console.error("🧪 External Animation Test - Error:", externalAnimations.error);
    }
  }, [
    animationPaths,
    externalAnimations.loading,
    externalAnimations.error,
    externalAnimations.clips,
    externalAnimations.loadedCount,
    externalAnimations.progress
  ]);
  
  return null; // This is just a test component, no visual output
}
