"use client";

import React from "react";
import { YLevelDebugTest, DevOnly, shouldShowDebugComponents } from "./index";
import { logDebugStatus } from "../utils/debugLogger";

/**
 * Debug Integration Example Component
 *
 * This component demonstrates how to integrate the Y-level debug logging system
 * into your application. It shows proper usage patterns and best practices for
 * debug component integration.
 */
export default function DebugIntegrationExample() {
  // Log debug status when component mounts
  React.useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.group("🔧 Debug Integration Example");
      console.log("Debug components available:", shouldShowDebugComponents());
      logDebugStatus();
      console.groupEnd();
    }
  }, []);

  return (
    <DevOnly>
      {shouldShowDebugComponents() && (
        <div className="debug-integration-container">
          {/* Y-Level Debug Test Panel */}
          <YLevelDebugTest />

          {/* Debug Status Indicator */}
          <div className="fixed bottom-4 right-4 bg-green-500/20 text-green-300 px-3 py-2 rounded-lg border border-green-500/30 text-sm">
            🔧 Y-Level Debug Active
          </div>

          {/* Debug Instructions Overlay (can be toggled) */}
          <DebugInstructions />
        </div>
      )}
    </DevOnly>
  );
}

/**
 * Debug Instructions Component
 * Shows helpful information about using the debug system
 */
function DebugInstructions() {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 left-4 bg-blue-500/20 text-blue-300 px-3 py-2 rounded-lg border border-blue-500/30 text-sm hover:bg-blue-500/30 transition-colors"
      >
        {isVisible ? "Hide" : "Show"} Debug Help
      </button>

      {/* Instructions Panel */}
      {isVisible && (
        <div className="fixed bottom-16 left-4 w-96 bg-black/95 text-white p-4 rounded-lg border border-gray-600 text-sm">
          <h4 className="text-blue-400 font-bold mb-3">
            🔍 Y-Level Debug System Usage
          </h4>

          <div className="space-y-3">
            <div>
              <h5 className="text-green-400 font-semibold mb-1">
                Environment Setup:
              </h5>
              <div className="text-xs bg-gray-800 p-2 rounded font-mono">
                # .env.local<br />
                DEBUG_SIMULANT_Y_POSITIONING=true<br />
                DEBUG_BLOCK_Y_POSITIONING=true
              </div>
            </div>

            <div>
              <h5 className="text-yellow-400 font-semibold mb-1">
                Console Output:
              </h5>
              <ul className="text-xs space-y-1 text-gray-300">
                <li>🤖 = Simulant positioning logs</li>
                <li>🧱 = Block positioning logs</li>
                <li>📐 = Y-level validation logs</li>
                <li>📍 = General positioning logs</li>
              </ul>
            </div>

            <div>
              <h5 className="text-purple-400 font-semibold mb-1">
                Test Actions:
              </h5>
              <ul className="text-xs space-y-1 text-gray-300">
                <li>• Use test panel to trigger debug scenarios</li>
                <li>• Place blocks to see Y positioning logs</li>
                <li>• Spawn simulants to see default positioning</li>
                <li>• Check console for detailed debug output</li>
              </ul>
            </div>

            <div>
              <h5 className="text-red-400 font-semibold mb-1">
                Troubleshooting:
              </h5>
              <ul className="text-xs space-y-1 text-gray-300">
                <li>• No logs? Check environment variables</li>
                <li>• Restart dev server after env changes</li>
                <li>• Logs only work in development mode</li>
                <li>• Filter console by emoji or category</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-700">
            <div className="text-xs text-gray-400 space-y-1">
              <div>📖 Documentation: docs/Y_LEVEL_DEBUG_GUIDE.md</div>
              <div>🔧 Config: .env.debug.example</div>
              <div>💡 Test cases: debug/YLevelDebugTest.tsx</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Usage Examples for Integration in Other Components
 */

// Example 1: Basic debug logging in a component
/*
import { debugSimulantYPositioning } from '../utils/debugLogger';

function MySimulantComponent({ simulant }) {
  React.useEffect(() => {
    debugSimulantYPositioning.logDefaultPositioning(
      simulant.id,
      simulant.position,
      'MySimulantComponent render'
    );
  }, [simulant]);

  return <div>Simulant content</div>;
}
*/

// Example 2: Conditional debug component rendering
/*
import { DevOnly, shouldShowDebugComponents } from '../debug';

function MyGameComponent() {
  return (
    <div>
      <GameContent />

      <DevOnly>
        {shouldShowDebugComponents() && (
          <MyDebugPanel />
        )}
      </DevOnly>
    </div>
  );
}
*/

// Example 3: Debug logging in a world store action
/*
import { debugBlockYPositioning } from '../utils/debugLogger';

const placeBlock = (position, type) => {
  debugBlockYPositioning.logInitialPositioning(
    generateBlockId(),
    position,
    type
  );

  // ... block placement logic
};
*/

// Example 4: Performance monitoring
/*
import { debugPositioning } from '../utils/debugLogger';

function performBulkOperation() {
  const startTime = performance.now();

  // ... bulk positioning operations

  const duration = performance.now() - startTime;
  debugPositioning.logPerformance(
    'bulk positioning operation',
    duration,
    entityCount
  );
}
*/

// Example 5: Y-level validation
/*
import { debugYLevelValidation } from '../utils/debugLogger';
import { Y_LEVEL_CONSTANTS } from '../config/yLevelConstants';

function validateEntityPosition(entity) {
  const isGrounded = Math.abs(entity.position.y - Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL) < 0.1;

  debugYLevelValidation.logAlignmentCheck(
    `${entity.type} entity validation`,
    entity.position.y,
    Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL,
    isGrounded
  );

  return isGrounded;
}
*/
