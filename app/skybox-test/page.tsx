"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { SimpleSkybox } from "../../components/skybox/EnhancedSkybox";
import { devLog } from "@/utils/devLogger";

export default function SkyboxTestPage() {
  return (
    <main className="w-full h-screen bg-gray-900">
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <Suspense fallback={null}>
          <SimpleSkybox
            onLoad={() => devLog("🌅 Skybox loaded - no flashing!")}
            onError={(error) => console.error("❌ Skybox error:", error)}
          />

          {/* Test sphere to see reflections */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[1.5, 32, 32]} />
            <meshStandardMaterial color="white" roughness={0.1} metalness={1} />
          </mesh>

          {/* Basic lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />

          <OrbitControls autoRotate enableZoom />
        </Suspense>
      </Canvas>

      {/* Instructions overlay */}
      <div className="absolute top-4 left-4 bg-black/80 text-white p-4 rounded-lg max-w-md">
        <h3 className="font-bold mb-2">Enhanced Skybox Test</h3>
        <p className="text-sm mb-2">✅ No flashing on interactions!</p>
        <p className="text-sm mb-2">Place 6 skybox images in:</p>
        <code className="block text-xs bg-gray-800 p-2 rounded mb-2">
          public/skyboxes/default/
        </code>
        <p className="text-xs text-gray-300">
          Files: 1.jpg, 2.jpg, 3.jpg, 4.jpg, 5.jpg, 6.jpg
          <br />
          Order: right, left, top, bottom, front, back
          <br />
          <span className="text-green-400">
            ✨ Flashing fixed with proper state management
          </span>
        </p>

        <div className="mt-3 text-xs">
          <div className="text-yellow-400">🎮 Try interactions:</div>
          <div>• Orbit the camera</div>
          <div>• Notice NO white flashing</div>
          <div>• Smooth, stable skybox</div>
        </div>
      </div>
    </main>
  );
}
