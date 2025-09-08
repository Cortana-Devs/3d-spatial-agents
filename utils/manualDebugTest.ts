import { devLog } from "@/utils/devLogger";

/**
 * Manual Debug Test Utility
 *
 * This file provides a simple way to manually test debug functionality
 * from the browser console. Import and call testDebug() to see what's happening.
 */

// Import the debug functions
import debug, {
  debugSimulantYPositioning,
  debugBlockYPositioning,
  isAnyDebugEnabled,
  getEnabledDebugCategories,
} from './debugLogger';

/**
 * Manual test function that can be called from browser console
 */
export function testDebug() {
  console.group('🧪 Manual Debug Test');

  // Test environment
  devLog('🌍 Environment Info:');
  devLog('  NODE_ENV:', process.env.NODE_ENV);
  devLog('  Is browser:', typeof window !== 'undefined');
  devLog('  Is production:', process.env.NODE_ENV === 'production');

  // Test environment variables
  devLog('\n📋 Environment Variables:');
  const envVars = [
    'DEBUG_SIMULANT_Y_POSITIONING',
    'DEBUG_BLOCK_Y_POSITIONING',
    'DEBUG_Y_LEVEL_VALIDATION',
    'DEBUG_POSITIONING_GENERAL',
    'NEXT_PUBLIC_DEBUG_SIMULANT_Y_POSITIONING',
    'NEXT_PUBLIC_DEBUG_BLOCK_Y_POSITIONING',
    'NEXT_PUBLIC_DEBUG_Y_LEVEL_VALIDATION',
    'NEXT_PUBLIC_DEBUG_POSITIONING_GENERAL'
  ];

  envVars.forEach(varName => {
    const value = (process.env as any)[varName];
    const status = value === 'true' ? '✅' : value === 'false' ? '❌' : '❓';
    devLog(`  ${status} ${varName}: ${value || 'undefined'}`);
  });

  // Test debug system status
  devLog('\n🔧 Debug System Status:');
  devLog('  Any debug enabled:', isAnyDebugEnabled());
  devLog('  Enabled categories:', getEnabledDebugCategories());

  // Test individual category checks
  devLog('\n🎯 Category Tests:');
  const categories = [
    'simulant-y-positioning',
    'block-y-positioning',
    'y-level-validation',
    'positioning-general'
  ] as const;

  categories.forEach(category => {
    const isEnabled = debug.isEnabled(category);
    const status = isEnabled ? '✅' : '❌';
    devLog(`  ${status} ${category}: ${isEnabled}`);
  });

  // Test actual debug logging
  devLog('\n📝 Test Debug Logs:');

  devLog('Testing simulant debug...');
  debugSimulantYPositioning.logDefaultPositioning(
    'test-simulant-123',
    { x: 1, y: 0.5, z: 2 },
    'Manual test from browser console'
  );

  devLog('Testing block debug...');
  debugBlockYPositioning.logInitialPositioning(
    'test-block-456',
    { x: 3, y: 0, z: 4 },
    'test block'
  );

  devLog('Testing validation debug...');
  debug.validation.logAlignmentCheck(
    'manual test',
    0.5,
    0.5,
    true
  );

  devLog('Testing general debug...');
  debug.general.logEvent('Manual test event', {
    test: true,
    timestamp: Date.now()
  });

  devLog('\n✨ Manual test complete!');
  devLog('If you see colorful debug logs above, the system is working.');
  devLog('If not, check the environment variables and restart your dev server.');

  console.groupEnd();

  return {
    isAnyEnabled: isAnyDebugEnabled(),
    enabledCategories: getEnabledDebugCategories(),
    environment: process.env.NODE_ENV,
    isBrowser: typeof window !== 'undefined'
  };
}

/**
 * Quick test that just shows current status
 */
export function quickDebugStatus() {
  devLog('🚀 Quick Debug Status:');
  devLog('Any enabled:', isAnyDebugEnabled());
  console.log('Categories:', getEnabledDebugCategories());
  console.log('Environment:', process.env.NODE_ENV);

  // Test one log
  debugSimulantYPositioning.logDefaultPositioning(
    'quick-test',
    { x: 0, y: 0.5, z: 0 },
    'Quick status test'
  );
}

/**
 * Force enable a category for testing (browser only)
 */
export function forceEnableDebug(category: string) {
  if (typeof window === 'undefined') {
    console.log('❌ Force enable only works in browser');
    return;
  }

  // Temporarily set the environment variable
  const envVar = `NEXT_PUBLIC_DEBUG_${category.toUpperCase().replace('-', '_')}`;
  (process.env as any)[envVar] = 'true';

  console.log(`✅ Temporarily enabled ${envVar} = true`);
  console.log('Try calling testDebug() again to see if it works');

  return envVar;
}

// Export for browser console access
if (typeof window !== 'undefined') {
  (window as any).testDebug = testDebug;
  (window as any).quickDebugStatus = quickDebugStatus;
  (window as any).forceEnableDebug = forceEnableDebug;

  console.log('🔧 Debug test functions available in console:');
  console.log('  testDebug() - Full debug test');
  console.log('  quickDebugStatus() - Quick status check');
  console.log('  forceEnableDebug("simulant-y-positioning") - Force enable category');
}

export default {
  testDebug,
  quickDebugStatus,
  forceEnableDebug
};
