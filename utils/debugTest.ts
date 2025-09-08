import { devLog } from "@/utils/devLogger";

/**
 * Debug Test Utility
 *
 * This utility tests real-time access to debug environment variables
 * to help diagnose why debugLogger isn't detecting enabled categories.
 */

export function testDebugEnvironment() {
  console.group('🔍 Real-time Debug Environment Test');

  // Test current environment
  devLog('NODE_ENV:', process.env.NODE_ENV);
  devLog('Is production?', process.env.NODE_ENV === 'production');

  // Test server-side variables
  devLog('\n📋 Server-side Variables:');
  devLog('DEBUG_SIMULANT_Y_POSITIONING:', process.env.DEBUG_SIMULANT_Y_POSITIONING);
  devLog('DEBUG_BLOCK_Y_POSITIONING:', process.env.DEBUG_BLOCK_Y_POSITIONING);
  devLog('DEBUG_Y_LEVEL_VALIDATION:', process.env.DEBUG_Y_LEVEL_VALIDATION);
  devLog('DEBUG_POSITIONING_GENERAL:', process.env.DEBUG_POSITIONING_GENERAL);

  // Test client-side variables
  devLog('\n🌐 Client-side Variables (NEXT_PUBLIC_):');
  devLog('NEXT_PUBLIC_DEBUG_SIMULANT_Y_POSITIONING:', process.env.NEXT_PUBLIC_DEBUG_SIMULANT_Y_POSITIONING);
  devLog('NEXT_PUBLIC_DEBUG_BLOCK_Y_POSITIONING:', process.env.NEXT_PUBLIC_DEBUG_BLOCK_Y_POSITIONING);
  devLog('NEXT_PUBLIC_DEBUG_Y_LEVEL_VALIDATION:', process.env.NEXT_PUBLIC_DEBUG_Y_LEVEL_VALIDATION);
  devLog('NEXT_PUBLIC_DEBUG_POSITIONING_GENERAL:', process.env.NEXT_PUBLIC_DEBUG_POSITIONING_GENERAL);

  // Test the logic that debugLogger uses
  devLog('\n🔧 Debug Logic Test:');

  const categories = [
    'simulant-y-positioning',
    'block-y-positioning',
    'y-level-validation',
    'positioning-general'
  ] as const;

  const DEBUG_ENV_VARS = {
    "simulant-y-positioning": "DEBUG_SIMULANT_Y_POSITIONING",
    "block-y-positioning": "DEBUG_BLOCK_Y_POSITIONING",
    "y-level-validation": "DEBUG_Y_LEVEL_VALIDATION",
    "positioning-general": "DEBUG_POSITIONING_GENERAL",
  } as const;

  const CLIENT_DEBUG_ENV_VARS = {
    "simulant-y-positioning": "NEXT_PUBLIC_DEBUG_SIMULANT_Y_POSITIONING",
    "block-y-positioning": "NEXT_PUBLIC_DEBUG_BLOCK_Y_POSITIONING",
    "y-level-validation": "NEXT_PUBLIC_DEBUG_Y_LEVEL_VALIDATION",
    "positioning-general": "NEXT_PUBLIC_DEBUG_POSITIONING_GENERAL",
  } as const;

  categories.forEach(category => {
    const serverVar = DEBUG_ENV_VARS[category];
    const clientVar = CLIENT_DEBUG_ENV_VARS[category];

    const serverValue = process.env[serverVar];
    const clientValue = process.env[clientVar];

    const finalValue = clientValue || serverValue;
    const isEnabled = finalValue === "true" || finalValue === "1";

    devLog(`${category}:`);
    console.log(`  Server (${serverVar}): ${serverValue || 'undefined'}`);
    console.log(`  Client (${clientVar}): ${clientValue || 'undefined'}`);
    console.log(`  Final value: ${finalValue || 'undefined'}`);
    console.log(`  Is enabled: ${isEnabled}`);
    console.log('');
  });

  // Test what happens if we call this again in a timeout
  console.log('⏰ Testing delayed access...');
  setTimeout(() => {
    console.log('🔄 After 1 second timeout:');
    console.log('NEXT_PUBLIC_DEBUG_SIMULANT_Y_POSITIONING:', process.env.NEXT_PUBLIC_DEBUG_SIMULANT_Y_POSITIONING);
    console.log('NEXT_PUBLIC_DEBUG_BLOCK_Y_POSITIONING:', process.env.NEXT_PUBLIC_DEBUG_BLOCK_Y_POSITIONING);
  }, 1000);

  console.groupEnd();
}

// Auto-run when imported in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Run immediately
  testDebugEnvironment();
}
