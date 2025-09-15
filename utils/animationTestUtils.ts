/**
 * Animation Test Utilities
 * =========================
 *
 * Utility functions to test and debug animation loading issues,
 * particularly for gender-specific animation resolution.
 */

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  AnimationRegistry,
  AvatarGender,
  SemanticKeys,
  resolveAnimationPath,
} from "../types/animationRegistry";
import { ANIMATION_REGISTRY } from "../data/animationRegistry";

/**
 * Test if a specific animation file can be loaded
 */
export async function testAnimationLoad(path: string): Promise<{
  success: boolean;
  error?: string;
  animationCount?: number;
  duration?: number;
}> {
  const loader = new GLTFLoader();

  try {
    const startTime = Date.now();
    const gltf = await loader.loadAsync(path);
    const duration = Date.now() - startTime;

    return {
      success: true,
      animationCount: gltf.animations?.length || 0,
      duration,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test animation resolution for a semantic key
 */
export function testAnimationResolution(
  semanticKey: string,
  gender: AvatarGender,
): {
  semanticKey: string;
  gender: AvatarGender;
  resolvedPath: string | null;
  registryEntry: any;
} {
  const resolvedPath = resolveAnimationPath(
    ANIMATION_REGISTRY,
    semanticKey,
    gender,
  );
  const registryEntry = ANIMATION_REGISTRY[semanticKey];

  return {
    semanticKey,
    gender,
    resolvedPath,
    registryEntry,
  };
}

/**
 * Test critical animations for a specific gender
 */
export async function testCriticalAnimations(gender: AvatarGender): Promise<{
  gender: AvatarGender;
  results: Array<{
    semanticKey: string;
    path: string | null;
    loadResult: Awaited<ReturnType<typeof testAnimationLoad>>;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  };
}> {
  const criticalAnimations = [
    SemanticKeys.LOCOMOTION_IDLE_PRIMARY,
    SemanticKeys.LOCOMOTION_WALK_FORWARD_NORMAL,
    SemanticKeys.LOCOMOTION_RUN_FORWARD,
    SemanticKeys.EXPRESSION_TALK_VARIANT_1,
    SemanticKeys.EMOTE_DANCE_CASUAL_1,
  ];

  const results = [];
  const errors: string[] = [];
  let successful = 0;
  let failed = 0;

  for (const semanticKey of criticalAnimations) {
    const path = resolveAnimationPath(ANIMATION_REGISTRY, semanticKey, gender);
    const registryEntry = ANIMATION_REGISTRY[semanticKey];

    console.log(`🔍 Testing ${semanticKey} for ${gender}:`);
    console.log(`  Registry entry:`, registryEntry);
    console.log(`  Resolved path: ${path || "❌ NO PATH"}`);

    let loadResult;

    if (path) {
      loadResult = await testAnimationLoad(path);
      if (loadResult.success) {
        successful++;
        console.log(
          `  ✅ Loaded successfully (${loadResult.animationCount} clips)`,
        );
      } else {
        failed++;
        errors.push(`${semanticKey}: ${loadResult.error}`);
        console.log(`  ❌ Failed: ${loadResult.error}`);
      }
    } else {
      loadResult = { success: false, error: "No path resolved" };
      failed++;
      errors.push(`${semanticKey}: No path resolved`);
      console.log(`  ❌ No path resolved`);
    }

    results.push({
      semanticKey,
      path,
      loadResult,
    });
  }

  return {
    gender,
    results,
    summary: {
      total: criticalAnimations.length,
      successful,
      failed,
      errors,
    },
  };
}

/**
 * Test all idle variations for a gender
 */
export async function testIdleVariations(gender: AvatarGender): Promise<{
  gender: AvatarGender;
  variations: Array<{
    semanticKey: string;
    path: string | null;
    success: boolean;
    error?: string;
  }>;
}> {
  const idleKeys = [
    SemanticKeys.LOCOMOTION_IDLE_PRIMARY,
    SemanticKeys.LOCOMOTION_IDLE_VARIANT_1,
    SemanticKeys.LOCOMOTION_IDLE_VARIANT_2,
    SemanticKeys.LOCOMOTION_IDLE_VARIANT_3,
    SemanticKeys.LOCOMOTION_IDLE_VARIANT_4,
    SemanticKeys.LOCOMOTION_IDLE_VARIANT_5,
    SemanticKeys.LOCOMOTION_IDLE_VARIANT_6,
  ];

  const variations = [];

  for (const semanticKey of idleKeys) {
    const path = resolveAnimationPath(ANIMATION_REGISTRY, semanticKey, gender);

    if (path) {
      const result = await testAnimationLoad(path);
      variations.push({
        semanticKey,
        path,
        success: result.success,
        error: result.error,
      });
    } else {
      variations.push({
        semanticKey,
        path: null,
        success: false,
        error: "No path resolved",
      });
    }
  }

  return {
    gender,
    variations,
  };
}

/**
 * Compare animation availability between genders
 */
export function compareGenderAnimations(): {
  onlyFeminine: string[];
  onlyMasculine: string[];
  both: string[];
  neither: string[];
} {
  const onlyFeminine: string[] = [];
  const onlyMasculine: string[] = [];
  const both: string[] = [];
  const neither: string[] = [];

  for (const [semanticKey, entry] of Object.entries(ANIMATION_REGISTRY)) {
    const hasFeminine = !!entry.feminine;
    const hasMasculine = !!entry.masculine;

    if (hasFeminine && hasMasculine) {
      both.push(semanticKey);
    } else if (hasFeminine) {
      onlyFeminine.push(semanticKey);
    } else if (hasMasculine) {
      onlyMasculine.push(semanticKey);
    } else {
      neither.push(semanticKey);
    }
  }

  return {
    onlyFeminine,
    onlyMasculine,
    both,
    neither,
  };
}

/**
 * Log test results to console in a readable format
 */
export function logTestResults(
  results: any,
  title: string = "Animation Test Results",
) {
  console.group(`🎭 ${title}`);

  if (results.gender) {
    console.log(`Gender: ${results.gender}`);
  }

  if (results.summary) {
    console.log(
      `Summary: ${results.summary.successful}/${results.summary.total} successful`,
    );
    if (results.summary.errors.length > 0) {
      console.group("❌ Errors:");
      results.summary.errors.forEach((error) => console.error(error));
      console.groupEnd();
    }
  }

  if (results.results) {
    console.group("📋 Detailed Results:");
    results.results.forEach((result: any) => {
      const status = result.loadResult.success ? "✅" : "❌";
      console.log(`${status} ${result.semanticKey} -> ${result.path}`);
      if (!result.loadResult.success) {
        console.error(`   Error: ${result.loadResult.error}`);
      }
    });
    console.groupEnd();
  }

  console.groupEnd();
}

/**
 * Run comprehensive animation test suite
 */
export async function runAnimationTestSuite(): Promise<{
  femaleResults: Awaited<ReturnType<typeof testCriticalAnimations>>;
  maleResults: Awaited<ReturnType<typeof testCriticalAnimations>>;
  genderComparison: ReturnType<typeof compareGenderAnimations>;
}> {
  console.log("🔍 Starting comprehensive animation test suite...");

  // Test gender resolution for critical animations
  console.group("🧬 Gender Resolution Test");
  const criticalKeys = [
    SemanticKeys.LOCOMOTION_IDLE_PRIMARY,
    SemanticKeys.LOCOMOTION_WALK_FORWARD_NORMAL,
    SemanticKeys.LOCOMOTION_RUN_FORWARD,
    SemanticKeys.EXPRESSION_TALK_VARIANT_1,
    SemanticKeys.EMOTE_DANCE_CASUAL_1,
  ];

  for (const key of criticalKeys) {
    const femaleResolution = testAnimationResolution(key, "feminine");
    const maleResolution = testAnimationResolution(key, "masculine");

    console.log(`📝 ${key}:`);
    console.log(`  Female: ${femaleResolution.resolvedPath || "❌ NO PATH"}`);
    console.log(`  Male: ${maleResolution.resolvedPath || "❌ NO PATH"}`);
  }
  console.groupEnd();

  const femaleResults = await testCriticalAnimations("feminine");
  const maleResults = await testCriticalAnimations("masculine");
  const genderComparison = compareGenderAnimations();

  logTestResults(femaleResults, "Female Animation Results");
  logTestResults(maleResults, "Male Animation Results");

  console.group("🔄 Gender Comparison");
  console.log(`Both genders: ${genderComparison.both.length} animations`);
  console.log(
    `Only feminine: ${genderComparison.onlyFeminine.length} animations`,
  );
  console.log(
    `Only masculine: ${genderComparison.onlyMasculine.length} animations`,
  );
  console.log(`Neither: ${genderComparison.neither.length} animations`);
  console.groupEnd();

  return {
    femaleResults,
    maleResults,
    genderComparison,
  };
}

// Export for browser console debugging
if (typeof window !== "undefined") {
  (window as any).__animationTestUtils = {
    testAnimationLoad,
    testAnimationResolution,
    testCriticalAnimations,
    testIdleVariations,
    compareGenderAnimations,
    runAnimationTestSuite,
    logTestResults,
  };

  console.log(
    "🎭 Animation test utils available at window.__animationTestUtils",
  );
}
