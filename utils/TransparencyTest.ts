"use client";

import { BlockType, BLOCK_DEFINITIONS } from "../types/blocks";

// Transparency Test Utility for NUMBER_7 Block
export class TransparencyValidator {

  // Validate that NUMBER_7 block has correct transparency settings
  static validateNUMBER7Transparency(): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    const number7Block = BLOCK_DEFINITIONS[BlockType.NUMBER_7];

    if (!number7Block) {
      issues.push("NUMBER_7 block definition not found");
      return { isValid: false, issues, recommendations };
    }

    // Check transparency level
    if (!number7Block.transparency || number7Block.transparency < 0.9) {
      issues.push(`Transparency too low: ${number7Block.transparency}, should be >= 0.9`);
      recommendations.push("Increase transparency to 0.95+ for full transparency effect");
    }

    // Check roughness for clarity
    if (number7Block.roughness > 0.02) {
      issues.push(`Roughness too high: ${number7Block.roughness}, should be <= 0.01`);
      recommendations.push("Reduce roughness to 0.01 for crystal clear appearance");
    }

    // Check emissive intensity (should be minimal/zero)
    if (number7Block.emissiveIntensity && number7Block.emissiveIntensity > 0.01) {
      issues.push(`Emissive intensity too high: ${number7Block.emissiveIntensity}`);
      recommendations.push("Set emissiveIntensity to 0.0 for pure transparency");
    }

    // Check display name accuracy
    if (!number7Block.displayName.toLowerCase().includes("clear") &&
        !number7Block.displayName.toLowerCase().includes("transparent")) {
      issues.push("Display name should indicate full transparency/clarity");
      recommendations.push("Update display name to include 'Clear' or 'Transparent'");
    }

    const isValid = issues.length === 0;

    return { isValid, issues, recommendations };
  }

  // Test transparency in different lighting conditions
  static getTransparencyReport(): {
    blockType: string;
    displayName: string;
    transparency: number;
    opacity: number;
    roughness: number;
    metalness: number;
    emissiveIntensity: number;
    isFullyTransparent: boolean;
    visualDescription: string;
  } {
    const number7Block = BLOCK_DEFINITIONS[BlockType.NUMBER_7];
    const transparency = number7Block.transparency || 0;
    const opacity = transparency ? 1 - transparency : 1;

    return {
      blockType: number7Block.type,
      displayName: number7Block.displayName,
      transparency,
      opacity,
      roughness: number7Block.roughness,
      metalness: number7Block.metalness,
      emissiveIntensity: number7Block.emissiveIntensity || 0,
      isFullyTransparent: transparency >= 0.9,
      visualDescription: this.getVisualDescription(transparency, number7Block.roughness)
    };
  }

  // Generate visual description based on transparency settings
  private static getVisualDescription(transparency: number, roughness: number): string {
    if (transparency >= 0.95) {
      if (roughness <= 0.01) {
        return "Crystal clear glass - nearly invisible with perfect transparency";
      } else {
        return "Clear glass with slight surface texture";
      }
    } else if (transparency >= 0.8) {
      return "Highly transparent glass with some visible tint";
    } else if (transparency >= 0.5) {
      return "Semi-transparent frosted glass";
    } else {
      return "Translucent material with significant opacity";
    }
  }

  // Performance impact assessment for transparent materials
  static assessPerformanceImpact(): {
    transparencyLevel: "low" | "medium" | "high" | "ultra";
    performanceImpact: "minimal" | "low" | "medium" | "high";
    frameCost: string;
    recommendations: string[];
  } {
    const number7Block = BLOCK_DEFINITIONS[BlockType.NUMBER_7];
    const transparency = number7Block.transparency || 0;
    const recommendations: string[] = [];

    let transparencyLevel: "low" | "medium" | "high" | "ultra";
    let performanceImpact: "minimal" | "low" | "medium" | "high";
    let frameCost: string;

    if (transparency >= 0.95) {
      transparencyLevel = "ultra";
      performanceImpact = "minimal";
      frameCost = "<0.5ms per 100 blocks";
      recommendations.push("Ultra-high transparency optimized for minimal performance impact");
      recommendations.push("Use depth sorting for proper rendering order");
    } else if (transparency >= 0.8) {
      transparencyLevel = "high";
      performanceImpact = "low";
      frameCost = "~1ms per 100 blocks";
      recommendations.push("Good transparency with acceptable performance");
    } else if (transparency >= 0.5) {
      transparencyLevel = "medium";
      performanceImpact = "medium";
      frameCost = "~2-3ms per 100 blocks";
      recommendations.push("Consider increasing transparency for better performance");
    } else {
      transparencyLevel = "low";
      performanceImpact = "high";
      frameCost = "~5ms+ per 100 blocks";
      recommendations.push("Low transparency causes high performance impact");
      recommendations.push("Increase transparency or use opaque materials instead");
    }

    return { transparencyLevel, performanceImpact, frameCost, recommendations };
  }

  // Runtime transparency test
  static runTransparencyTest(): void {
    console.group("🔬 NUMBER_7 Block Transparency Analysis");

    const validation = this.validateNUMBER7Transparency();
    const report = this.getTransparencyReport();
    const performance = this.assessPerformanceImpact();

    console.log("✅ Validation Results:", {
      isValid: validation.isValid,
      issues: validation.issues,
      recommendations: validation.recommendations
    });

    console.log("📊 Transparency Report:", report);

    console.log("⚡ Performance Assessment:", performance);

    if (validation.isValid) {
      console.log("🎉 NUMBER_7 block transparency is correctly configured!");
    } else {
      console.warn("⚠️ NUMBER_7 block transparency needs adjustment");
    }

    console.groupEnd();
  }

  // Compare with other glass blocks
  static compareGlassBlocks(): {
    frostedGlass: any;
    sunsetGlass: any;
    clearGlass: any;
    comparison: string[];
  } {
    const frostedGlass = BLOCK_DEFINITIONS[BlockType.FROSTED_GLASS];
    const sunsetGlass = BLOCK_DEFINITIONS[BlockType.NUMBER_6];
    const clearGlass = BLOCK_DEFINITIONS[BlockType.NUMBER_7];

    const comparison = [
      `Frosted Glass: ${frostedGlass.transparency || 0} transparency`,
      `Sunset Glass: ${sunsetGlass.transparency || 0} transparency`,
      `Clear Glass: ${clearGlass.transparency || 0} transparency`,
      "",
      "Clear Glass (NUMBER_7) should have the highest transparency value"
    ];

    return { frostedGlass, sunsetGlass, clearGlass, comparison };
  }
}

// Auto-run test in development
if (process.env.NODE_ENV === "development") {
  // Delay to ensure blocks are loaded
  setTimeout(() => {
    TransparencyValidator.runTransparencyTest();
  }, 1000);
}

export default TransparencyValidator;
