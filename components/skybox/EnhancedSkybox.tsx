"use client";

import React, { useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { CubeTextureLoader, CubeTexture } from "three";
import { useSkyboxStore } from "../../store/skyboxStore";
import { DEFAULT_SKYBOX_PRESET } from "../../utils/skybox/defaultPreset";

interface EnhancedSkyboxProps {
  /**
   * Path to skybox directory (default: "/skyboxes/default/")
   */
  path?: string;
  /**
   * File extension (default: ".jpg")
   */
  extension?: string;
  /**
   * Enable store integration for presets (default: false)
   */
  useStore?: boolean;
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
 * Enhanced skybox that bridges tutorial simplicity with store features
 * - Simple mode: Direct texture loading like tutorial
 * - Store mode: Uses preset system with performance monitoring
 * - Prevents flashing by proper state management
 * - Extensible without complexity
 */
export function EnhancedSkybox({
  path = "/skyboxes/default/",
  extension = ".jpg",
  useStore = false,
  files,
  onLoad,
  onError,
}: EnhancedSkyboxProps = {}) {
  const { scene } = useThree();
  const [texture, setTexture] = useState<CubeTexture | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const loaderRef = useRef<CubeTextureLoader>();
  const isLoadedRef = useRef(false);

  // Store integration (optional)
  const { addPreset, setCurrentPreset, textureCache, currentPreset, presets } =
    useSkyboxStore();

  // Simple mode - direct texture loading
  useEffect(() => {
    if (useStore || isLoadedRef.current) return;

    setIsLoading(true);

    // Initialize loader only once
    if (!loaderRef.current) {
      loaderRef.current = new CubeTextureLoader();
    }

    // Build file URLs
    const urls = files || [
      `${path}1${extension}`, // right
      `${path}2${extension}`, // left
      `${path}3${extension}`, // top
      `${path}4${extension}`, // bottom
      `${path}5${extension}`, // front
      `${path}6${extension}`, // back
    ];

    const loadedTexture = loaderRef.current.load(
      urls,
      // onLoad
      () => {
        setTexture(loadedTexture);
        setIsLoading(false);
        isLoadedRef.current = true;
        if (process.env.NODE_ENV === "development") {
          console.log("✅ Skybox loaded successfully (simple mode)");
        }
        onLoad?.();
      },
      // onProgress
      undefined,
      // onError
      (error) => {
        setIsLoading(false);
        console.warn("❌ Skybox failed to load:", error);
        if (process.env.NODE_ENV === "development") {
          console.log(`📁 Make sure you have 6 images in: ${path}`);
        }
        if (process.env.NODE_ENV === "development") {
          console.log("Expected files:", urls);
        }
        onError?.(error);
      },
    );

    return () => {
      if (loadedTexture && !isLoadedRef.current) {
        loadedTexture.dispose();
      }
    };
  }, [path, extension, files, useStore]);

  // Store mode - preset system
  useEffect(() => {
    if (!useStore) return;

    // Add default preset if not exists
    if (!presets[DEFAULT_SKYBOX_PRESET.id]) {
      if (process.env.NODE_ENV === "development") {
        console.log("Adding default skybox preset...");
      }
      addPreset({
        ...DEFAULT_SKYBOX_PRESET,
        assetPath: path,
      });

      // Set as current with delay to allow store update
      setTimeout(() => {
        setCurrentPreset(DEFAULT_SKYBOX_PRESET.id).catch((error) => {
          console.warn("Failed to load default skybox:", error.message);
          onError?.(error);
        });
      }, 100);
    }
  }, [useStore, path, addPreset, setCurrentPreset, presets]);

  // Get texture from store if using store mode
  useEffect(() => {
    if (useStore && currentPreset && textureCache.has(currentPreset)) {
      const storeTexture = textureCache.get(currentPreset);
      if (storeTexture && storeTexture !== texture) {
        setTexture(storeTexture);
        if (process.env.NODE_ENV === "development") {
          console.log("✅ Skybox loaded from store");
        }
        onLoad?.();
      }
    }
  }, [useStore, currentPreset, textureCache, texture, onLoad]);

  // Apply texture to scene (both modes)
  useEffect(() => {
    if (texture && scene) {
      const previousBackground = scene.background;

      // Apply texture with smooth transition prevention
      scene.background = texture;

      // Enable environment mapping for reflective materials
      scene.environment = texture;

      if (process.env.NODE_ENV === "development") {
        console.log(
          `🌅 Skybox applied to scene (${useStore ? "store" : "simple"} mode)`,
        );
      }

      // Cleanup function
      return () => {
        if (scene.background === texture) {
          scene.background = previousBackground;
        }
        if (scene.environment === texture) {
          scene.environment = null;
        }
      };
    }
  }, [texture, scene, useStore]);

  // Development info
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("EnhancedSkybox state:", {
        mode: useStore ? "store" : "simple",
        hasTexture: !!texture,
        isLoading,
        currentPreset: useStore ? currentPreset : "N/A",
        path,
      });
    }
  }, [texture, isLoading, useStore, currentPreset, path]);

  return null;
}

/**
 * Simple skybox - just loads and displays
 */
export function SimpleSkybox(props: Omit<EnhancedSkyboxProps, "useStore">) {
  return <EnhancedSkybox {...props} useStore={false} />;
}

/**
 * Store-integrated skybox with presets and performance monitoring
 */
export function StoreSkybox(props: Omit<EnhancedSkyboxProps, "useStore">) {
  return <EnhancedSkybox {...props} useStore={true} />;
}

export default EnhancedSkybox;
