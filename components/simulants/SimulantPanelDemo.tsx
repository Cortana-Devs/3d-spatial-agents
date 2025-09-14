"use client";

import React, { useState } from "react";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Play,
  Users,
  Sparkles,
  FileText,
  Code,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import SimulantPanel from "./SimulantPanel";
import { CharacterIcons } from "../icons/CharacterIcons";

interface FeatureCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  status: "completed" | "in-progress" | "planned";
  technical?: string;
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  status,
  technical,
}: FeatureCardProps) {
  const statusConfig = {
    completed: { color: "bg-green-500/20 text-green-300", icon: CheckCircle },
    "in-progress": {
      color: "bg-yellow-500/20 text-yellow-300",
      icon: AlertCircle,
    },
    planned: { color: "bg-blue-500/20 text-blue-300", icon: Info },
  };

  const StatusIcon = statusConfig[status].icon;

  return (
    <Card className="bg-axiom-neutral-100/50 dark:bg-axiom-neutral-800/50 border-axiom-neutral-200 dark:border-axiom-neutral-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-axiom-neutral-200 dark:bg-axiom-neutral-700">
              <Icon size={20} />
            </div>
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <Badge className={statusConfig[status].color}>
            <StatusIcon size={12} className="mr-1" />
            {status.replace("-", " ")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-axiom-neutral-600 dark:text-axiom-neutral-400 mb-3">
          {description}
        </CardDescription>
        {technical && (
          <div className="text-xs font-mono p-2 rounded bg-axiom-neutral-200/50 dark:bg-axiom-neutral-700/50 text-axiom-neutral-700 dark:text-axiom-neutral-300">
            {technical}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SimulantPanelDemo() {
  const [showLiveDemo, setShowLiveDemo] = useState(false);

  const features = [
    {
      icon: CharacterIcons.Executive,
      title: "Character Presets",
      description:
        "Pre-configured character archetypes with personalities, roles, and default behaviors. Includes Executive, Virtual Assistant, Creative Director, Parent Figure, Team Leader, and Custom options.",
      status: "completed" as const,
      technical:
        "6 preset archetypes with SVG icons, personality templates, and default avatar assignments",
    },
    {
      icon: Users,
      title: "Avatar Integration",
      description:
        "Seamless integration with the female avatar system. Each character can be assigned male or female avatars with persistent preferences.",
      status: "completed" as const,
      technical:
        "Integrates src/state/avatarSelectionStore.tsx with character creation workflow",
    },
    {
      icon: Play,
      title: "Live Character Management",
      description:
        "Real-time character status management with bulk operations. Activate, pause, or randomize actions across multiple simulants simultaneously.",
      status: "completed" as const,
      technical:
        "Connects to useWorldStore() for simulant CRUD operations with optimistic updates",
    },
    {
      icon: Sparkles,
      title: "Visual Enhancements",
      description:
        "Custom SVG icons, animated status indicators, expandable character cards, and responsive design with proper accessibility support.",
      status: "completed" as const,
      technical:
        "CSS animations, ARIA labels, focus management, and responsive grid layouts",
    },
    {
      icon: FileText,
      title: "Personality Templates",
      description:
        "Rich personality descriptions that can be used by AI systems to generate contextual behaviors and responses.",
      status: "in-progress" as const,
      technical:
        "Character personality strings ready for LLM prompt engineering integration",
    },
    {
      icon: Code,
      title: "API Integration",
      description:
        "Integration with Gemini AI for dynamic personality expression and conversation management.",
      status: "planned" as const,
      technical:
        "geminiSessionId tracking and conversationHistory management for AI continuity",
    },
  ];

  const codeExample = `// Creating a new character with avatar selection
const handleCreateCharacter = useCallback((preset: CharacterPreset, avatarId: AvatarId) => {
  const newSimulant: AISimulant = {
    id: uuidv4(),
    name: \`\${preset.name} \${simulants.size + 1}\`,
    position: { x: Math.random() * 10 - 5, y: 0, z: Math.random() * 10 - 5 },
    status: "active",
    lastAction: preset.initialAction,
    conversationHistory: [],
    geminiSessionId: \`session-\${simulantId}\`,
  };

  addSimulant(newSimulant);
  setAvatar(avatarId); // Set selected avatar globally
}, [simulants.size, addSimulant]);`;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-axiom-neutral-900 dark:text-axiom-neutral-100">
          Enhanced Simulant Panel
        </h1>
        <p className="text-lg text-axiom-neutral-600 dark:text-axiom-neutral-400 max-w-2xl mx-auto">
          Advanced character management system with personality presets, avatar
          integration, and real-time control for your Virtual Social Behavior
          Simulations.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Badge className="bg-green-500/20 text-green-300">
            <CheckCircle size={12} className="mr-1" />
            Production Ready
          </Badge>
          <Badge className="bg-blue-500/20 text-blue-300">
            <Sparkles size={12} className="mr-1" />
            TypeScript
          </Badge>
          <Badge className="bg-purple-500/20 text-purple-300">
            <Users size={12} className="mr-1" />
            AI Integration Ready
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="features" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="demo">Live Demo</TabsTrigger>
          <TabsTrigger value="code">Implementation</TabsTrigger>
          <TabsTrigger value="usage">Usage Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="demo" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Interactive Demo</CardTitle>
                  <CardDescription>
                    Experience the full simulant panel functionality in a live
                    environment
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowLiveDemo(!showLiveDemo)}
                  className="bg-axiom-primary-500 hover:bg-axiom-primary-600"
                >
                  <Play size={16} className="mr-2" />
                  {showLiveDemo ? "Hide Demo" : "Show Demo"}
                </Button>
              </div>
            </CardHeader>
            {showLiveDemo && (
              <CardContent>
                <div className="border rounded-lg p-4 bg-axiom-neutral-50 dark:bg-axiom-neutral-900">
                  <SimulantPanel />
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="code" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Implementation Details</CardTitle>
              <CardDescription>
                Core code structure and integration patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">
                  Character Creation Flow
                </h4>
                <pre className="text-xs bg-axiom-neutral-900 dark:bg-axiom-neutral-800 text-axiom-neutral-100 p-4 rounded-lg overflow-x-auto">
                  <code>{codeExample}</code>
                </pre>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">File Structure</h4>
                <div className="text-sm font-mono space-y-1 text-axiom-neutral-700 dark:text-axiom-neutral-300">
                  <div>📁 components/simulants/</div>
                  <div className="ml-4">
                    📄 SimulantPanel.tsx - Main panel component
                  </div>
                  <div className="ml-4">
                    📄 SimulantPanelDemo.tsx - Documentation & demo
                  </div>
                  <div>📁 components/icons/</div>
                  <div className="ml-4">
                    📄 CharacterIcons.tsx - Custom SVG icon library
                  </div>
                  <div>📁 src/state/</div>
                  <div className="ml-4">
                    📄 avatarSelectionStore.tsx - Avatar state management
                  </div>
                  <div>📁 styles/</div>
                  <div className="ml-4">
                    📄 avatarSelector.css - Enhanced styling
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Key Dependencies</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>State Management:</strong>
                    <ul className="list-disc list-inside text-axiom-neutral-600 dark:text-axiom-neutral-400">
                      <li>Zustand store integration</li>
                      <li>React hooks for reactivity</li>
                      <li>localStorage persistence</li>
                    </ul>
                  </div>
                  <div>
                    <strong>UI Components:</strong>
                    <ul className="list-disc list-inside text-axiom-neutral-600 dark:text-axiom-neutral-400">
                      <li>Custom Button components</li>
                      <li>SVG icon system</li>
                      <li>Responsive grid layouts</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">1. Add Characters</h4>
                  <p className="text-sm text-axiom-neutral-600 dark:text-axiom-neutral-400">
                    Click "Add Character" to open the character library. Choose
                    from preset archetypes or create custom characters.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">2. Select Avatars</h4>
                  <p className="text-sm text-axiom-neutral-600 dark:text-axiom-neutral-400">
                    Each character can be assigned male or female avatars.
                    Expand character cards to customize avatar selection.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">3. Manage Simulants</h4>
                  <p className="text-sm text-axiom-neutral-600 dark:text-axiom-neutral-400">
                    Use bulk operations to activate, pause, or randomize actions
                    across multiple characters simultaneously.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Character Archetypes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-3">
                  {[
                    {
                      icon: CharacterIcons.Executive,
                      name: "Executive",
                      use: "Business simulations",
                    },
                    {
                      icon: CharacterIcons.Assistant,
                      name: "Virtual Assistant",
                      use: "Customer service",
                    },
                    {
                      icon: CharacterIcons.Creative,
                      name: "Creative Director",
                      use: "Brainstorming sessions",
                    },
                    {
                      icon: CharacterIcons.Parent,
                      name: "Parent Figure",
                      use: "Family dynamics",
                    },
                    {
                      icon: CharacterIcons.Leader,
                      name: "Team Leader",
                      use: "Leadership training",
                    },
                    {
                      icon: CharacterIcons.Custom,
                      name: "Custom",
                      use: "Personalized scenarios",
                    },
                  ].map(({ icon: Icon, name, use }) => (
                    <div key={name} className="flex items-center gap-3">
                      <div className="p-1.5 rounded bg-axiom-neutral-200 dark:bg-axiom-neutral-700">
                        <Icon size={14} />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{name}</div>
                        <div className="text-xs text-axiom-neutral-600 dark:text-axiom-neutral-400">
                          {use}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
