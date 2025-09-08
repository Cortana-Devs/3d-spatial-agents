"use client";

import React, { useState, useEffect } from "react";
import { useWorldStore } from "../store/worldStore";
import { debugSimulantYPositioning, debugBlockYPositioning, debugYLevelValidation, debugPositioning } from "../utils/debugLogger";
import { Y_LEVEL_CONSTANTS, Y_LEVEL_DEBUG } from "../config/yLevelConstants";
import { AISimulant } from "../types";
import { BlockType } from "../types/blocks";

/**
 * Y-Level Debug Test Component
 *
 * This component provides interactive testing for the Y-level debug logging system.
 * It allows developers to trigger various Y-level positioning scenarios and see
 * the debug output in the console.
 */
export default function YLevelDebugTest() {
  const { addSimulant, addBlock, simulants, blocks } = useWorldStore();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Test counter for generating unique IDs
  const [testCounter, setTestCounter] = useState(0);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev.slice(-9), result]); // Keep last 10 results
  };

  const generateTestId = (prefix: string) => {
    const id = `${prefix}-test-${testCounter}`;
    setTestCounter(prev => prev + 1);
    return id;
  };

  // Test 1: Simulant Default Y Positioning
  const testSimulantDefaultPositioning = () => {
    const simulantId = generateTestId("simulant");
    const position = { x: 0, y: 0.5, z: 0 }; // Correct ground level

    const testSimulant: AISimulant = {
      id: simulantId,
      name: `Test Simulant ${simulantId}`,
      position,
      status: "active",
      lastAction: "testing Y positioning",
      conversationHistory: [],
      geminiSessionId: `session-${simulantId}`,
    };

    // This will trigger debug logs in debugSimulantYPositioning
    addSimulant(testSimulant);
    addTestResult(`✅ Created simulant at correct Y level (${position.y})`);
  };

  // Test 2: Simulant Incorrect Y Positioning
  const testSimulantIncorrectPositioning = () => {
    const simulantId = generateTestId("simulant-wrong");
    const position = { x: 1, y: 1.5, z: 1 }; // Incorrect - too high

    const testSimulant: AISimulant = {
      id: simulantId,
      name: `Floating Test Simulant ${simulantId}`,
      position,
      status: "active",
      lastAction: "floating incorrectly",
      conversationHistory: [],
      geminiSessionId: `session-${simulantId}`,
    };

    addSimulant(testSimulant);
    addTestResult(`⚠️ Created simulant at incorrect Y level (${position.y}) - should be ~0.5`);
  };

  // Test 3: Block Default Y Positioning
  const testBlockDefaultPositioning = () => {
    const position = { x: 2, y: 0, z: 2 }; // Correct floor level
    const blockType: BlockType = "stone";

    // This will trigger debug logs in debugBlockYPositioning
    const success = addBlock(position, blockType, "debug-test-user");

    if (success) {
      addTestResult(`✅ Created ${blockType} block at correct Y level (${position.y})`);
    } else {
      addTestResult(`❌ Failed to create ${blockType} block`);
    }
  };

  // Test 4: Block Y Positioning with Rounding
  const testBlockYRounding = () => {
    const position = { x: 3, y: 0.7, z: 3 }; // Will be rounded to 1
    const blockType: BlockType = "wood";

    const success = addBlock(position, blockType, "debug-test-user");

    if (success) {
      addTestResult(`🔄 Created ${blockType} block with Y rounding (${position.y} → 1)`);
    } else {
      addTestResult(`❌ Failed to create ${blockType} block with rounding`);
    }
  };

  // Test 5: Y-Level Validation Tests
  const testYLevelValidation = () => {
    const testCases = [
      { y: 0.5, context: "Player Ground Level", shouldAlign: true },
      { y: 0.0, context: "Floor Level", shouldAlign: true },
      { y: 1.2, context: "Misaligned Position", shouldAlign: false },
      { y: -0.3, context: "Below Ground", shouldAlign: false }
    ];

    testCases.forEach(({ y, context, shouldAlign }) => {
      debugYLevelValidation.logAlignmentCheck(
        context,
        y,
        Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL,
        shouldAlign
      );
    });

    addTestResult("📐 Ran Y-level validation tests (check console)");
  };

  // Test 6: Y-Level Constants Usage
  const testYLevelConstants = () => {
    // Log usage of different constants
    debugYLevelValidation.logConstantUsage(
      "PLAYER_GROUND_LEVEL",
      Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL,
      "Debug test validation"
    );

    debugYLevelValidation.logConstantUsage(
      "DEFAULT_FLOOR_Y",
      Y_LEVEL_CONSTANTS.DEFAULT_FLOOR_Y,
      "Debug test floor placement"
    );

    Y_LEVEL_DEBUG.logAlignmentStatus("Debug Test Constants", {
      "Player Ground": Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL,
      "Default Floor": Y_LEVEL_CONSTANTS.DEFAULT_FLOOR_Y,
      "World Ground": Y_LEVEL_CONSTANTS.WORLD_GROUND_PLANE,
    });

    addTestResult("📊 Logged Y-level constants usage (check console)");
  };

  // Test 7: Performance Test
  const testPerformance = () => {
    const startTime = performance.now();

    // Simulate bulk positioning operations
    for (let i = 0; i < 10; i++) {
      const simulantId = generateTestId(`perf-simulant-${i}`);
      const position = {
        x: i,
        y: 0.5,
        z: 0
      };

      debugSimulantYPositioning.logDefaultPositioning(
        simulantId,
        position,
        `Performance test simulant ${i}`
      );
    }

    const duration = performance.now() - startTime;

    debugPositioning.logPerformance(
      "Y-level debug performance test",
      duration,
      10
    );

    addTestResult(`⚡ Performance test completed in ${duration.toFixed(2)}ms`);
  };

  // Test 8: Y-Level Migration Test
  const testYLevelMigration = () => {
    const migrationCases = [
      { from: -0.5, to: 0.0, reason: "Legacy floor positioning" },
      { from: 0.5, to: 0.0, reason: "Incorrect high floor placement" },
      { from: 1.2, to: 1.0, reason: "Non-standard block positioning" }
    ];

    migrationCases.forEach(({ from, to, reason }) => {
      debugYLevelValidation.logMigration(from, to, reason);
    });

    addTestResult("🔄 Simulated Y-level migrations (check console)");
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true);
    addTestResult("🚀 Starting comprehensive Y-level debug tests...");

    const tests = [
      testSimulantDefaultPositioning,
      testSimulantIncorrectPositioning,
      testBlockDefaultPositioning,
      testBlockYRounding,
      testYLevelValidation,
      testYLevelConstants,
      testPerformance,
      testYLevelMigration
    ];

    for (let i = 0; i < tests.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
      tests[i]();
    }

    addTestResult("✨ All Y-level debug tests completed!");
    setIsRunning(false);
  };

  // Clear test results and world state
  const clearTests = () => {
    setTestResults([]);
    setTestCounter(0);
    addTestResult("🧹 Test results cleared");
  };

  // Display debug status on component mount
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      import("../utils/debugLogger").then((debug) => {
        debug.default.logStatus();
      });
    }
  }, []);

  // Only render in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 w-80 bg-black/90 text-white p-4 rounded-lg border border-gray-600 z-50">
      <h3 className="text-lg font-bold mb-3 text-blue-400">
        🔧 Y-Level Debug Test Panel
      </h3>

      <div className="space-y-2 mb-4">
        <button
          onClick={testSimulantDefaultPositioning}
          className="w-full px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
          disabled={isRunning}
        >
          🤖 Test Simulant Default Y
        </button>

        <button
          onClick={testSimulantIncorrectPositioning}
          className="w-full px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm"
          disabled={isRunning}
        >
          🤖 Test Simulant Wrong Y
        </button>

        <button
          onClick={testBlockDefaultPositioning}
          className="w-full px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          disabled={isRunning}
        >
          🧱 Test Block Default Y
        </button>

        <button
          onClick={testBlockYRounding}
          className="w-full px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm"
          disabled={isRunning}
        >
          🧱 Test Block Y Rounding
        </button>

        <button
          onClick={testYLevelValidation}
          className="w-full px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded text-sm"
          disabled={isRunning}
        >
          📐 Test Y Validation
        </button>

        <button
          onClick={testYLevelConstants}
          className="w-full px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-sm"
          disabled={isRunning}
        >
          📊 Test Y Constants
        </button>

        <button
          onClick={testPerformance}
          className="w-full px-3 py-1 bg-pink-600 hover:bg-pink-700 rounded text-sm"
          disabled={isRunning}
        >
          ⚡ Test Performance
        </button>

        <button
          onClick={testYLevelMigration}
          className="w-full px-3 py-1 bg-cyan-600 hover:bg-cyan-700 rounded text-sm"
          disabled={isRunning}
        >
          🔄 Test Y Migration
        </button>
      </div>

      <div className="space-y-2 mb-4">
        <button
          onClick={runAllTests}
          className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded font-bold"
          disabled={isRunning}
        >
          {isRunning ? "🔄 Running Tests..." : "🚀 Run All Tests"}
        </button>

        <button
          onClick={clearTests}
          className="w-full px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm"
          disabled={isRunning}
        >
          🧹 Clear Results
        </button>
      </div>

      <div className="border-t border-gray-600 pt-3">
        <h4 className="text-sm font-semibold mb-2 text-gray-300">
          Test Results ({testResults.length})
        </h4>
        <div className="max-h-40 overflow-y-auto text-xs space-y-1">
          {testResults.length === 0 ? (
            <div className="text-gray-500 italic">No tests run yet...</div>
          ) : (
            testResults.map((result, index) => (
              <div key={index} className="text-gray-200 leading-tight">
                {result}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="border-t border-gray-600 pt-3 mt-3">
        <div className="text-xs text-gray-400">
          <div>Simulants: {simulants.size}</div>
          <div>Blocks: {blocks.size}</div>
          <div>Check browser console for debug output</div>
        </div>
      </div>
    </div>
  );
}
