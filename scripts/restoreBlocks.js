#!/usr/bin/env node

/**
 * Quick script to restore test blocks in the world store
 * This is useful when blocks get cleared by resetStore() calls
 */

console.log('🔄 Starting block restoration...');

// Since this is a Node.js script running outside the React context,
// we need to simulate the restoration by providing instructions
console.log(`
🔧 To restore blocks in your application:

1. Open your browser console on the PlayerAvatarExample page
2. Run the following command:

   window.__restoreTestBlocks = () => {
     const { useWorldStore } = window;
     if (useWorldStore) {
       const store = useWorldStore.getState();
       if (store.restoreTestBlocks) {
         store.restoreTestBlocks();
         console.log('✅ Test blocks restored!');
       } else {
         console.error('❌ restoreTestBlocks function not found');
       }
     } else {
       console.error('❌ worldStore not accessible');
     }
   };

   window.__restoreTestBlocks();

3. Alternatively, if you have the diagnostic panel visible,
   click the "Restore Test Blocks" button.

4. Expected blocks after restoration:
   - Red block at (0, 0.5, 0) - top face at Y=1.0
   - Blue block at (0, 1.5, 0) - top face at Y=2.0
   - Glass block at (2, 0.475, 0) - top face at Y=0.95
   - Green block at (2, 0.5, 0) - top face at Y=1.0

📝 Note: The blocks were likely cleared by running blockSystemExample.ts
which calls resetStore(). This has been fixed to restore blocks instead
of clearing them.
`);

console.log('✅ Instructions provided. Please follow the browser console steps.');
