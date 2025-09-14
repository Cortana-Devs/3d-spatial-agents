"use client";

import React from "react";
import { useWorldStore } from "../../store/worldStore";
import { BLOCK_DEFINITIONS } from "../../types";
import {
  FloatingPanel,
  FloatingPanelHeader,
  FloatingPanelItem,
  FloatingPanelSection,
  FloatingPanelDivider,
} from "../ui/FloatingPanel";
import { Text, Mono } from "../ui/Text";

interface WorldInfoProps {
  className?: string;
}

export default function WorldInfo({ className = "" }: WorldInfoProps) {
  const { blockCount, worldLimits, getWorldStats } = useWorldStore();
  const stats = getWorldStats();

  const blockLimitPercentage = (blockCount / worldLimits.maxBlocks) * 100;

  return (
    <FloatingPanel className={className}>
      <FloatingPanelHeader>World Stats</FloatingPanelHeader>

      {/* Block count with progress bar */}
      <div className="space-y-2">
        <FloatingPanelItem
          label="Blocks"
          value={`${blockCount} / ${worldLimits.maxBlocks}`}
          mono
        />

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
      <FloatingPanelSection title="Block Types">
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
              <Text variant="primary" className="capitalize text-xs">
                {BLOCK_DEFINITIONS[type as keyof typeof BLOCK_DEFINITIONS]
                  ?.displayName || type}
              </Text>
            </div>
            <Mono variant="secondary" className="text-xs">
              {isNaN(count) ? 0 : count}
            </Mono>
          </div>
        ))}
      </FloatingPanelSection>

      {/* Active simulants */}
      <FloatingPanelDivider className="pt-2" />
      <FloatingPanelItem
        label="AI Simulants"
        value={stats.activeSimulants}
        mono
      />

      {/* Warning when approaching limit */}
      {blockLimitPercentage > 90 && (
        <div className="p-2 rounded bg-axiom-error-50 dark:bg-axiom-error-900/20 border border-axiom-error-200 dark:border-axiom-error-800">
          <Text
            variant="primary"
            className="text-axiom-error-700 dark:text-axiom-error-300 font-medium text-xs"
          >
            ⚠️ Approaching block limit
          </Text>
          <Text
            variant="secondary"
            className="text-axiom-error-600 dark:text-axiom-error-400 mt-1"
          >
            {worldLimits.maxBlocks - blockCount} blocks remaining
          </Text>
        </div>
      )}
    </FloatingPanel>
  );
}
