"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { Grid3X3, Eye, EyeOff, Zap, Target } from "lucide-react";
import { GridConfig } from "./GridSystem";

interface GridConfigPanelProps {
  config: GridConfig;
  onConfigChange: (updates: Partial<GridConfig>) => void;
  className?: string;
}

export default function GridConfigPanel({
  config,
  onConfigChange,
  className = "",
}: GridConfigPanelProps) {
  return (
    <Card className={`w-80 bg-black/20 backdrop-blur-md border-white/10 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-white">
          <Grid3X3 className="w-5 h-5" />
          Grid System
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Visibility Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="grid-visibility" className="text-white/90 flex items-center gap-2">
            {config.visibility ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            Visibility
          </Label>
          <Switch
            id="grid-visibility"
            checked={config.visibility}
            onCheckedChange={(visibility) => onConfigChange({ visibility })}
          />
        </div>

        <Separator className="bg-white/10" />

        {/* Grid Size */}
        <div className="space-y-2">
          <Label className="text-white/90">Grid Size: {config.size}</Label>
          <Slider
            value={[config.size]}
            onValueChange={([size]) => onConfigChange({ size })}
            min={10}
            max={100}
            step={5}
            className="w-full"
            disabled={!config.visibility}
          />
        </div>

        {/* Cell Size */}
        <div className="space-y-2">
          <Label className="text-white/90">Cell Size: {config.cellSize.toFixed(1)}</Label>
          <Slider
            value={[config.cellSize]}
            onValueChange={([cellSize]) => onConfigChange({ cellSize })}
            min={0.5}
            max={2.0}
            step={0.1}
            className="w-full"
            disabled={!config.visibility}
          />
        </div>

        {/* Opacity */}
        <div className="space-y-2">
          <Label className="text-white/90">Opacity: {(config.opacity * 100).toFixed(0)}%</Label>
          <Slider
            value={[config.opacity]}
            onValueChange={([opacity]) => onConfigChange({ opacity })}
            min={0.1}
            max={1.0}
            step={0.05}
            className="w-full"
            disabled={!config.visibility}
          />
        </div>

        <Separator className="bg-white/10" />

        {/* Fade Distance */}
        <div className="space-y-2">
          <Label className="text-white/90">Fade Distance: {config.fadeDistance}</Label>
          <Slider
            value={[config.fadeDistance]}
            onValueChange={([fadeDistance]) => onConfigChange({ fadeDistance })}
            min={10}
            max={100}
            step={5}
            className="w-full"
            disabled={!config.visibility}
          />
        </div>

        {/* Fade Strength */}
        <div className="space-y-2">
          <Label className="text-white/90">Fade Strength: {config.fadeStrength.toFixed(1)}</Label>
          <Slider
            value={[config.fadeStrength]}
            onValueChange={([fadeStrength]) => onConfigChange({ fadeStrength })}
            min={0.1}
            max={3.0}
            step={0.1}
            className="w-full"
            disabled={!config.visibility}
          />
        </div>

        <Separator className="bg-white/10" />

        {/* Interaction Features */}
        <div className="space-y-3">
          <Label className="text-white/90 font-medium">Interaction Features</Label>
          
          {/* Ripple Effects */}
          <div className="flex items-center justify-between">
            <Label htmlFor="ripple-enabled" className="text-white/80 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Ripple Effects
            </Label>
            <Switch
              id="ripple-enabled"
              checked={config.rippleEnabled}
              onCheckedChange={(rippleEnabled) => onConfigChange({ rippleEnabled })}
              disabled={!config.visibility}
            />
          </div>

          {/* Snap to Grid */}
          <div className="flex items-center justify-between">
            <Label htmlFor="snap-to-grid" className="text-white/80 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Snap to Grid
            </Label>
            <Switch
              id="snap-to-grid"
              checked={config.snapToGrid}
              onCheckedChange={(snapToGrid) => onConfigChange({ snapToGrid })}
              disabled={!config.visibility}
            />
          </div>

          {/* Snap Indicators */}
          <div className="flex items-center justify-between">
            <Label htmlFor="snap-indicators" className="text-white/80 text-sm pl-6">
              Show Snap Indicators
            </Label>
            <Switch
              id="snap-indicators"
              checked={config.showSnapIndicators}
              onCheckedChange={(showSnapIndicators) => onConfigChange({ showSnapIndicators })}
              disabled={!config.visibility || !config.snapToGrid}
            />
          </div>
        </div>

        <Separator className="bg-white/10" />

        {/* Preset Buttons */}
        <div className="space-y-2">
          <Label className="text-white/90 font-medium">Presets</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onConfigChange({
                size: 30,
                cellSize: 1,
                opacity: 0.2,
                fadeDistance: 20,
                fadeStrength: 1,
                rippleEnabled: false,
                snapToGrid: true,
                showSnapIndicators: false,
              })}
              className="bg-white/5 border-white/20 text-white/90 hover:bg-white/10"
              disabled={!config.visibility}
            >
              Minimal
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onConfigChange({
                size: 50,
                cellSize: 1,
                opacity: 0.4,
                fadeDistance: 40,
                fadeStrength: 1.5,
                rippleEnabled: true,
                snapToGrid: true,
                showSnapIndicators: true,
              })}
              className="bg-white/5 border-white/20 text-white/90 hover:bg-white/10"
              disabled={!config.visibility}
            >
              Standard
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onConfigChange({
                size: 80,
                cellSize: 0.5,
                opacity: 0.6,
                fadeDistance: 60,
                fadeStrength: 2,
                rippleEnabled: true,
                snapToGrid: true,
                showSnapIndicators: true,
              })}
              className="bg-white/5 border-white/20 text-white/90 hover:bg-white/10"
              disabled={!config.visibility}
            >
              Detailed
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onConfigChange({
                size: 100,
                cellSize: 2,
                opacity: 0.8,
                fadeDistance: 80,
                fadeStrength: 0.5,
                rippleEnabled: true,
                snapToGrid: true,
                showSnapIndicators: true,
              })}
              className="bg-white/5 border-white/20 text-white/90 hover:bg-white/10"
              disabled={!config.visibility}
            >
              Large Scale
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}