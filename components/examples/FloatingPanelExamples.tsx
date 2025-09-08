"use client";

import React from "react";
import {
  FloatingPanel,
  FloatingPanelHeader,
  FloatingPanelItem,
  FloatingPanelSection,
  FloatingPanelDivider,
  FloatingCard,
  FloatingStats,
  FloatingHelp,
} from "../ui/FloatingPanel";
import { Text, Heading, Mono, Accent } from "../ui/Text";
import { Button } from "../ui/button";

/**
 * Examples showing how to use the universal FloatingPanel system
 * Copy these patterns for consistent UI across the app
 */
export default function FloatingPanelExamples() {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <Heading level={1}>FloatingPanel Examples</Heading>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* 1. Simple Stats Panel - Most Common */}
        <FloatingStats
          title="Player Stats"
          stats={[
            { label: "Health", value: "100/100", mono: true },
            { label: "Level", value: 42 },
            { label: "XP", value: "1,247", mono: true },
            { label: "Gold", value: "₹2,350", mono: true },
          ]}
        />

        {/* 2. Help Panel */}
        <FloatingHelp
          instructions={[
            "Tap to move • Double tap to run",
            "WASD to move • Shift to run • Space to jump"
          ]}
          action="Press E to interact"
        />

        {/* 3. Simple Card */}
        <FloatingCard title="Settings">
          <div className="space-y-2">
            <Button size="sm" className="w-full">Save Changes</Button>
            <Button size="sm" variant="outline" className="w-full">Reset</Button>
          </div>
        </FloatingCard>

        {/* 4. Custom Panel with Sections */}
        <FloatingPanel>
          <FloatingPanelHeader>System Monitor</FloatingPanelHeader>

          <FloatingPanelSection title="Performance">
            <FloatingPanelItem label="FPS" value={60} mono />
            <FloatingPanelItem label="Frame Time" value="16.7ms" mono />
          </FloatingPanelSection>

          <FloatingPanelSection title="Memory">
            <FloatingPanelItem label="Used" value="234 MB" mono />
            <FloatingPanelItem label="Available" value="1.8 GB" mono />
          </FloatingPanelSection>
        </FloatingPanel>

        {/* 5. Compact Panel */}
        <FloatingPanel size="sm" variant="compact">
          <Text variant="secondary">Quick Actions</Text>
          <div className="flex gap-2">
            <Button size="sm">Save</Button>
            <Button size="sm" variant="outline">Load</Button>
          </div>
        </FloatingPanel>

        {/* 6. Information Panel */}
        <FloatingPanel>
          <FloatingPanelHeader>World Info</FloatingPanelHeader>

          <FloatingPanelItem label="Seed" value="12345678" mono />
          <FloatingPanelItem label="Biome" value="Forest" />
          <FloatingPanelItem label="Time" value="Day 42" />

          <FloatingPanelDivider />

          <div className="space-y-1">
            <Text variant="body">Weather: Sunny</Text>
            <Text variant="secondary">Temperature: 22°C</Text>
            <Accent color="success">No storms predicted</Accent>
          </div>
        </FloatingPanel>

        {/* 7. Status Panel with Mixed Content */}
        <FloatingPanel>
          <FloatingPanelHeader>Connection Status</FloatingPanelHeader>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <Text variant="primary">Connected</Text>
            </div>

            <FloatingPanelItem label="Ping" value="23ms" mono />
            <FloatingPanelItem label="Players" value="5/20" mono />

            <FloatingPanelDivider />

            <div className="text-center">
              <Accent color="primary">Server: US-West-1</Accent>
            </div>
          </div>
        </FloatingPanel>

        {/* 8. Large Panel */}
        <FloatingPanel size="lg" className="md:col-span-2">
          <FloatingPanelHeader>Inventory Management</FloatingPanelHeader>

          <div className="grid grid-cols-2 gap-4">
            <FloatingPanelSection title="Items">
              <FloatingPanelItem label="Sword" value={1} />
              <FloatingPanelItem label="Potions" value={5} />
              <FloatingPanelItem label="Tools" value={12} />
            </FloatingPanelSection>

            <FloatingPanelSection title="Resources">
              <FloatingPanelItem label="Wood" value={64} mono />
              <FloatingPanelItem label="Stone" value={128} mono />
              <FloatingPanelItem label="Iron" value={32} mono />
            </FloatingPanelSection>
          </div>

          <FloatingPanelDivider />

          <div className="flex justify-between items-center">
            <Text variant="body">Total Weight: 45.2 kg</Text>
            <Button size="sm">Organize</Button>
          </div>
        </FloatingPanel>

        {/* 9. Notification-style Panel */}
        <FloatingPanel size="sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400 text-sm">ℹ️</span>
            </div>
            <div className="flex-1">
              <Text variant="primary" className="font-medium">New Update Available</Text>
              <Text variant="secondary" className="mt-1">Version 2.1.0 includes performance improvements.</Text>
              <div className="flex gap-2 mt-2">
                <Button size="sm">Update</Button>
                <Button size="sm" variant="outline">Later</Button>
              </div>
            </div>
          </div>
        </FloatingPanel>

        {/* 10. Debug Panel */}
        <FloatingPanel>
          <FloatingPanelHeader>Debug Info</FloatingPanelHeader>

          <div className="space-y-2">
            <Mono variant="secondary" className="block">
              pos: (12.5, 64.0, -8.3)
            </Mono>
            <Mono variant="secondary" className="block">
              rot: (0°, 45°, 0°)
            </Mono>
            <Mono variant="secondary" className="block">
              vel: (0.0, -9.8, 2.1)
            </Mono>
          </div>

          <FloatingPanelDivider />

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <Text variant="secondary">Chunks: 16</Text>
            </div>
            <div>
              <Text variant="secondary">Entities: 42</Text>
            </div>
          </div>
        </FloatingPanel>
      </div>

      {/* Usage Instructions */}
      <div className="mt-8">
        <FloatingPanel size="lg">
          <FloatingPanelHeader>How to Use</FloatingPanelHeader>

          <div className="space-y-4">
            <div>
              <Heading level={4}>1. For Simple Stats:</Heading>
              <Mono variant="secondary" className="block mt-1 text-xs">
                {"<FloatingStats title='Stats' stats={[{label: 'HP', value: 100}]} />"}
              </Mono>
            </div>

            <div>
              <Heading level={4}>2. For Help Text:</Heading>
              <Mono variant="secondary" className="block mt-1 text-xs">
                {"<FloatingHelp instructions={['Mobile', 'Desktop']} action='Do thing' />"}
              </Mono>
            </div>

            <div>
              <Heading level={4}>3. For Custom Layouts:</Heading>
              <Mono variant="secondary" className="block mt-1 text-xs">
                {"<FloatingPanel><FloatingPanelHeader>Title</FloatingPanelHeader>...</FloatingPanel>"}
              </Mono>
            </div>

            <FloatingPanelDivider />

            <Accent color="primary">
              See docs/UI_SYSTEM.md for complete documentation
            </Accent>
          </div>
        </FloatingPanel>
      </div>
    </div>
  );
}
