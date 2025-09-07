"use client";

import React, { useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { CubeTextureLoader, CubeTexture } from "three";

interface TutorialSkyboxProps {
  /**
   * Path to skybox directory (default: "/skyboxes/default/")
   */
  path?: string;
  /**
   * File extension (default: ".jpg")
   */
  extension?: string;
  /**
   * Custom file names array (overrides numbered format)
   */
  files?: [string, string, string, string, string, string];
  /**
   * Callback when skybox loads successfully
   */
  onLoad?: () => void;
  /**
   * Callback when skybox fails to load
   */
  onError?: (error: any) => void;
}

/**
 * Simple skybox component following the React Three Fiber tutorial pattern
 * Loads 6 cube map textures and applies them to scene.background
 * Fixed to prevent flashing by using useEffect and proper state management
 */
export function TutorialSkybox({
  path = "/skyboxes/default/",
  extension = ".jpg",
  files,
  onLoad,
  onError,
}: TutorialSkyboxProps = {}) {
  const { scene } = useThree();
  const [texture, setTexture] = useState<CubeTexture | null>(null);
  const loaderRef = useRef<CubeTextureLoader>();
  const isLoadedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple loads
    if (isLoadedRef.current) return;

    // Initialize loader only once
    if (!loaderRef.current) {
      loaderRef.current = new CubeTextureLoader();
    }

    // Build file URLs - either custom files or numbered format
    const urls = files || [
      `${path}1${extension}`, // right
      `${path}2${extension}`, // left
      `${path}3${extension}`, // top
      `${path}4${extension}`, // bottom
      `${path}5${extension}`, // front
      `${path}6${extension}`, // back
    ];

    // The CubeTextureLoader load method takes an array of urls representing all 6 sides of the cube.
    // Order: [right, left, top, bottom, front, back] (positive-x, negative-x, positive-y, negative-y, positive-z, negative-z)
    const loadedTexture = loaderRef.current.load(
      urls,
      // onLoad callback
      () => {
        setTexture(loadedTexture);
        isLoadedRef.current = true;
        if (process.env.NODE_ENV === "development") {
          console.log("✅ Skybox loaded successfully");
        }
        onLoad?.();
      },
      // onProgress callback
      undefined,
      // onError callback
      (error) => {
        console.warn("❌ Skybox failed to load:", error);
        if (process.env.NODE_ENV === "development") {
          console.log(`📁 Make sure you have 6 images in: ${path}`);
        }
        if (process.env.NODE_ENV === "development") {
          console.log(`Expected files:`, urls);
        }
        onError?.(error);
      },
    );

    // Cleanup function
    return () => {
      if (loadedTexture && !isLoadedRef.current) {
        loadedTexture.dispose();
      }
    };
  }, [path, extension, files]); // Reload if props change

  // Apply texture to scene only when loaded
  useEffect(() => {
    if (texture && scene) {
      const previousBackground = scene.background;
      scene.background = texture;

      // Cleanup previous background if it exists and is different
      return () => {
        if (scene.background === texture) {
          scene.background = previousBackground;
        }
      };
    }
  }, [texture, scene]);

  return null;
}

export default TutorialSkybox;
