'use client';

import React from 'react';
import { useWorldStore } from '../../store/worldStore';
import { BlockType, BLOCK_DEFINITIONS } from '../../types';

interface BlockSelectorProps {
  className?: string;
}

export default function BlockSelector({ className = '' }: BlockSelectorProps) {
  const { selectedBlockType, setSelectedBlockType } = useWorldStore();

  const blockTypes = Object.values(BlockType);

  return (
    <div className={`floating-panel p-4 space-y-3 ${className}`}>
      <h3 className="text-sm font-semibold text-axiom-neutral-700 dark:text-axiom-neutral-300 mb-3">
        Block Types
      </h3>
      
      <div className="space-y-2">
        {blockTypes.map((type) => {
          const definition = BLOCK_DEFINITIONS[type];
          const isSelected = selectedBlockType === type;
          
          return (
            <button
              key={type}
              onClick={() => setSelectedBlockType(type)}
              className={`
                w-full p-3 rounded-lg border transition-all duration-200
                flex items-center space-x-3 text-left
                ${isSelected 
                  ? 'border-axiom-primary-400 bg-axiom-primary-50 dark:bg-axiom-primary-900/20 glow-effect-blue' 
                  : 'border-axiom-neutral-200 dark:border-axiom-neutral-700 bg-white dark:bg-axiom-neutral-800 hover:border-axiom-primary-300'
                }
                interactive-hover
              `}
            >
              {/* Color preview */}
              <div 
                className="w-6 h-6 rounded border border-axiom-neutral-300 dark:border-axiom-neutral-600 flex-shrink-0"
                style={{ backgroundColor: definition.color }}
              />
              
              {/* Block info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-axiom-neutral-900 dark:text-axiom-neutral-100">
                  {definition.displayName}
                </div>
                <div className="text-xs text-axiom-neutral-600 dark:text-axiom-neutral-400 truncate">
                  {definition.description}
                </div>
              </div>
              
              {/* Keyboard shortcut */}
              <div className="text-xs text-axiom-neutral-500 dark:text-axiom-neutral-500 font-mono">
                {blockTypes.indexOf(type) + 1}
              </div>
            </button>
          );
        })}
      </div>
      
      <div className="text-xs text-axiom-neutral-500 dark:text-axiom-neutral-500 mt-3 pt-3 border-t border-axiom-neutral-200 dark:border-axiom-neutral-700">
        Use number keys 1-3 to quickly select block types
      </div>
    </div>
  );
}