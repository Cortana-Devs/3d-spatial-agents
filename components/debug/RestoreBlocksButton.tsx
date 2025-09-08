"use client";

import React from 'react';
import { useWorldStore } from '@/store/worldStore';

export function RestoreBlocksButton() {
  const { blockMap, blockCount, restoreTestBlocks } = useWorldStore();

  const handleRestoreBlocks = () => {
    try {
      console.log('🔄 Restoring test blocks...');
      restoreTestBlocks();
      console.log('✅ Test blocks restored successfully!');
    } catch (error) {
      console.error('❌ Failed to restore test blocks:', error);
    }
  };

  return (
    <div className="fixed top-1/2 left-4 z-50 bg-red-600/90 text-white p-4 rounded-lg shadow-lg">
      <div className="text-center">
        <h3 className="font-bold text-lg mb-2">⚠️ Blocks Missing!</h3>
        <p className="text-sm mb-3">
          Found {blockCount} blocks (expected 4 test blocks)
        </p>
        <button
          onClick={handleRestoreBlocks}
          className="bg-white text-red-600 px-4 py-2 rounded font-semibold hover:bg-gray-100 transition-colors"
        >
          Restore Test Blocks
        </button>
        <div className="text-xs mt-2 text-red-200">
          This will add back the 4 test blocks needed for avatar alignment testing
        </div>
      </div>
    </div>
  );
}

export default RestoreBlocksButton;
