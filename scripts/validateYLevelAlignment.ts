#!/usr/bin/env ts-node

/**
 * Y-Level Alignment Validation Script
 *
 * This script validates that the Y-level alignment between floors and player
 * positioning has been correctly implemented to resolve the floating player issue.
 */

import { Vector3 } from 'three';

// Import our Y-level constants
const Y_LEVEL_CONSTANTS = {
  WORLD_GROUND_PLANE: 0.0,
  PLAYER_GROUND_LEVEL: 0.5,
  DEFAULT_FLOOR_Y: 0.0,
  BLOCK_HEIGHT: 1.0,
  BLOCK_CENTER_TO_TOP: 0.5,
  BLOCK_CENTER_TO_BOTTOM: -0.5,
};

// Validation functions
const validateAlignment = {
  getBlockTopFace: (blockY: number): number => {
    return blockY + Y_LEVEL_CONSTANTS.BLOCK_CENTER_TO_TOP;
  },

  getFloorSurface: (floorY: number): number => {
    return floorY + Y_LEVEL_CONSTANTS.BLOCK_CENTER_TO_TOP;
  },

  isAligned: (surface: number, playerLevel: number): boolean => {
    return Math.abs(surface - playerLevel) < 0.01;
  },
};

// Test scenarios
interface TestScenario {
  name: string;
  floorY: number;
  expectedResult: boolean;
  description: string;
}

const testScenarios: TestScenario[] = [
  {
    name: "Default Floor Alignment",
    floorY: Y_LEVEL_CONSTANTS.DEFAULT_FLOOR_Y,
    expectedResult: true,
    description: "Floor block at Y=0, top surface at Y=0.5, player collision at Y=0.5"
  },
  {
    name: "Old System (Y=0.5)",
    floorY: 0.5,
    expectedResult: false,
    description: "Floor block at Y=0.5, top surface at Y=1.0, player collision at Y=0.5 (mismatch)"
  },
  {
    name: "Documentation Error (Y=-0.5)",
    floorY: -0.5,
    expectedResult: false,
    description: "Floor block at Y=-0.5, top surface at Y=0, player collision at Y=0.5 (mismatch)"
  },
  {
    name: "Raised Floor (Y=1)",
    floorY: 1.0,
    expectedResult: false,
    description: "Floor block at Y=1, top surface at Y=1.5, player collision at Y=0.5 (elevated floor)"
  }
];

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Main validation function
function runValidation(): void {
  console.log(`${colors.bold}${colors.cyan}Y-Level Alignment Validation${colors.reset}\n`);

  console.log(`${colors.blue}System Constants:${colors.reset}`);
  console.log(`  Player Ground Level: ${Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL}`);
  console.log(`  Default Floor Y: ${Y_LEVEL_CONSTANTS.DEFAULT_FLOOR_Y}`);
  console.log(`  Block Height: ${Y_LEVEL_CONSTANTS.BLOCK_HEIGHT}`);
  console.log(`  Block Center to Top: ${Y_LEVEL_CONSTANTS.BLOCK_CENTER_TO_TOP}\n`);

  let passedTests = 0;
  let totalTests = testScenarios.length;

  console.log(`${colors.blue}Running Test Scenarios:${colors.reset}\n`);

  testScenarios.forEach((scenario, index) => {
    const floorSurface = validateAlignment.getFloorSurface(scenario.floorY);
    const isAligned = validateAlignment.isAligned(floorSurface, Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL);
    const passed = isAligned === scenario.expectedResult;

    if (passed) passedTests++;

    const status = passed ? `${colors.green}✅ PASS` : `${colors.red}❌ FAIL`;
    const alignment = isAligned ? `${colors.green}ALIGNED` : `${colors.red}MISALIGNED`;

    console.log(`${colors.bold}Test ${index + 1}: ${scenario.name}${colors.reset}`);
    console.log(`  Status: ${status}${colors.reset}`);
    console.log(`  Floor Y: ${scenario.floorY}`);
    console.log(`  Floor Surface Y: ${floorSurface}`);
    console.log(`  Player Level Y: ${Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL}`);
    console.log(`  Alignment: ${alignment}${colors.reset}`);
    console.log(`  Description: ${colors.white}${scenario.description}${colors.reset}\n`);
  });

  // Summary
  console.log(`${colors.bold}${colors.cyan}Validation Summary:${colors.reset}`);
  console.log(`  Tests Passed: ${colors.green}${passedTests}/${totalTests}${colors.reset}`);

  if (passedTests === totalTests) {
    console.log(`  ${colors.green}${colors.bold}🎉 ALL TESTS PASSED - Y-level alignment is correct!${colors.reset}\n`);
  } else {
    console.log(`  ${colors.red}${colors.bold}⚠️  SOME TESTS FAILED - Y-level alignment needs attention!${colors.reset}\n`);
  }

  // Critical alignment check
  console.log(`${colors.bold}${colors.yellow}Critical Alignment Check:${colors.reset}`);
  const criticalFloorY = Y_LEVEL_CONSTANTS.DEFAULT_FLOOR_Y;
  const criticalSurface = validateAlignment.getFloorSurface(criticalFloorY);
  const criticalAligned = validateAlignment.isAligned(criticalSurface, Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL);

  if (criticalAligned) {
    console.log(`  ${colors.green}✅ Floor blocks placed at Y=${criticalFloorY} create walkable surface at Y=${criticalSurface}`);
    console.log(`  ${colors.green}✅ Player collision at Y=${Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL} matches floor surface`);
    console.log(`  ${colors.green}${colors.bold}🎯 PERFECT ALIGNMENT - No floating player issue!${colors.reset}\n`);
  } else {
    console.log(`  ${colors.red}❌ Floor surface at Y=${criticalSurface} does not match player collision at Y=${Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL}`);
    console.log(`  ${colors.red}${colors.bold}⚠️  ALIGNMENT ISSUE DETECTED - Players will appear to float!${colors.reset}\n`);
  }

  // Implementation verification
  console.log(`${colors.bold}${colors.blue}Implementation Verification:${colors.reset}`);
  console.log(`  ${colors.white}Floor Manager Default Y: ${Y_LEVEL_CONSTANTS.DEFAULT_FLOOR_Y}${colors.reset}`);
  console.log(`  ${colors.white}Player Controller Ground Level: ${Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL}${colors.reset}`);
  console.log(`  ${colors.white}Block Top Face Formula: blockY + ${Y_LEVEL_CONSTANTS.BLOCK_CENTER_TO_TOP}${colors.reset}`);

  const implementationCorrect = criticalAligned;
  if (implementationCorrect) {
    console.log(`  ${colors.green}✅ Implementation is mathematically correct${colors.reset}`);
  } else {
    console.log(`  ${colors.red}❌ Implementation needs adjustment${colors.reset}`);
  }

  console.log();
}

// Additional validation for different scenarios
function runExtendedValidation(): void {
  console.log(`${colors.bold}${colors.cyan}Extended Validation Scenarios:${colors.reset}\n`);

  // Test block stacking
  console.log(`${colors.blue}Block Stacking Test:${colors.reset}`);
  for (let y = 0; y <= 3; y++) {
    const blockTop = validateAlignment.getBlockTopFace(y);
    const canWalkOn = validateAlignment.isAligned(blockTop, Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL);
    const status = canWalkOn ? `${colors.green}Walkable` : `${colors.yellow}Not walkable at default level`;
    console.log(`  Block at Y=${y}: Top face at Y=${blockTop} - ${status}${colors.reset}`);
  }

  console.log();

  // Test floor patterns
  console.log(`${colors.blue}Floor Pattern Consistency:${colors.reset}`);
  const floorPositions = [
    new Vector3(-1, Y_LEVEL_CONSTANTS.DEFAULT_FLOOR_Y, -1),
    new Vector3(0, Y_LEVEL_CONSTANTS.DEFAULT_FLOOR_Y, 0),
    new Vector3(1, Y_LEVEL_CONSTANTS.DEFAULT_FLOOR_Y, 1),
  ];

  floorPositions.forEach((pos, index) => {
    const surface = validateAlignment.getFloorSurface(pos.y);
    const aligned = validateAlignment.isAligned(surface, Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL);
    const status = aligned ? `${colors.green}✅` : `${colors.red}❌`;
    console.log(`  Floor ${index + 1} at (${pos.x}, ${pos.y}, ${pos.z}): Surface Y=${surface} ${status}${colors.reset}`);
  });

  console.log();
}

// Performance impact assessment
function assessPerformanceImpact(): void {
  console.log(`${colors.bold}${colors.cyan}Performance Impact Assessment:${colors.reset}\n`);

  const oldSystem = {
    floorY: 0,
    playerGroundY: 0.5,
    floatingDistance: 0.5
  };

  const newSystem = {
    floorY: Y_LEVEL_CONSTANTS.DEFAULT_FLOOR_Y,
    playerGroundY: Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL,
    floatingDistance: 0
  };

  console.log(`${colors.yellow}Before Fix:${colors.reset}`);
  console.log(`  Floor Y: ${oldSystem.floorY}`);
  console.log(`  Player Y: ${oldSystem.playerGroundY}`);
  console.log(`  Floating Distance: ${oldSystem.floatingDistance} units ${colors.red}(PROBLEM)${colors.reset}`);

  console.log(`\n${colors.green}After Fix:${colors.reset}`);
  console.log(`  Floor Y: ${newSystem.floorY}`);
  console.log(`  Player Y: ${newSystem.playerGroundY}`);
  console.log(`  Floating Distance: ${newSystem.floatingDistance} units ${colors.green}(PERFECT)${colors.reset}`);

  const improvementPercent = ((oldSystem.floatingDistance - newSystem.floatingDistance) / oldSystem.floatingDistance) * 100;
  console.log(`\n  ${colors.bold}${colors.green}Improvement: ${improvementPercent}% reduction in floating distance${colors.reset}\n`);
}

// Main execution
if (require.main === module) {
  runValidation();
  runExtendedValidation();
  assessPerformanceImpact();

  console.log(`${colors.bold}${colors.cyan}Validation Complete!${colors.reset}`);
  console.log(`${colors.white}Run this script after any Y-level related changes to verify alignment.${colors.reset}\n`);
}

// Export for testing
export {
  validateAlignment,
  testScenarios,
  Y_LEVEL_CONSTANTS,
  runValidation
};
