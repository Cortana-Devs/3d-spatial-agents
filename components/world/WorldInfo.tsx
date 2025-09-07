"use client";

import React from "react";
import { useWorldStore } from "../../store/worldStore";
import { BLOCK_DEFINITIONS } from "../../types";

interface WorldInfoProps {
  className?: string;
}

export default function WorldInfo({ className = "" }: WorldInfoProps) {
  const { blockCount, worldLimits, getWorldStats } = useWorldStore();
  const stats = getWorldStats();

  const blockLimitPercentage = (blockCount / worldLimits.maxBlocks) * 100;

  return (
    <div className={`floating-panel p-4 space-y-3 ${className}`}>
      <h3 className="text-sm font-semibold text-axiom-neutral-700 dark:text-axiom-neutral-300 mb-3">
        World Stats
      </h3>

      {/* Block count with progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-axiom-neutral-600 dark:text-axiom-neutral-400">
            Blocks
          </span>
          <span className="text-sm font-mono text-axiom-neutral-900 dark:text-axiom-neutral-100">
            {blockCount} / {worldLimits.maxBlocks}
          </span>
        </div>

        <div className="w-full bg-axiom-neutral-200 dark:bg-axiom-neutral-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              blockLimitPercentage > 90
                ? "bg-axiom-error-500"
                : blockLimitPercentage > 70
                  ? "bg-axiom-warning-500"
                  : "bg-axiom-success-500"
            }`}
            style={{ width: `${Math.min(blockLimitPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Block types breakdown */}
      <div className="space-y-2">
        <div className="text-sm text-axiom-neutral-600 dark:text-axiom-neutral-400">
          Block Types
        </div>

        {Object.entries(stats.blocksByType).map(([type, count]) => (
          <div key={type} className="flex justify-between items-center text-xs">
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded border border-axiom-neutral-300 dark:border-axiom-neutral-600"
                style={{
                  backgroundColor:
                    BLOCK_DEFINITIONS[type as keyof typeof BLOCK_DEFINITIONS]
                      ?.color || "#cccccc",
                }}
              />
              <span className="capitalize text-axiom-neutral-700 dark:text-axiom-neutral-300">
                {BLOCK_DEFINITIONS[type as keyof typeof BLOCK_DEFINITIONS]
                  ?.displayName || type}
              </span>
            </div>
            <span className="font-mono text-axiom-neutral-600 dark:text-axiom-neutral-400">
              {isNaN(count) ? 0 : count}
            </span>
          </div>
        ))}
      </div>

      {/* Active simulants */}
      <div className="flex justify-between items-center pt-2 border-t border-axiom-neutral-200 dark:border-axiom-neutral-700">
        <span className="text-sm text-axiom-neutral-600 dark:text-axiom-neutral-400">
          AI Simulants
        </span>
        <span className="text-sm font-mono text-axiom-neutral-900 dark:text-axiom-neutral-100">
          {stats.activeSimulants}
        </span>
      </div>

      {/* Warning when approaching limit */}
      {blockLimitPercentage > 90 && (
        <div className="p-2 rounded bg-axiom-error-50 dark:bg-axiom-error-900/20 border border-axiom-error-200 dark:border-axiom-error-800">
          <div className="text-xs text-axiom-error-700 dark:text-axiom-error-300 font-medium">
            ⚠️ Approaching block limit
          </div>
          <div className="text-xs text-axiom-error-600 dark:text-axiom-error-400 mt-1">
            {worldLimits.maxBlocks - blockCount} blocks remaining
          </div>
        </div>
      )}
    </div>
  );
}
