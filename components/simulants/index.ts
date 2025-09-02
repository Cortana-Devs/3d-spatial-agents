// Simulant system exports
export { default as ReadyPlayerMeSimulant } from './ReadyPlayerMeSimulant';
export { default as SimulantManager } from './SimulantManager';
export { default as SimulantControls } from './SimulantControls';
export { default as AnimationTestControls } from './AnimationTestControls';

// Export types
export type { ReadyPlayerMeSimulantProps } from './ReadyPlayerMeSimulant';
export type { SimulantManagerProps } from './SimulantManager';
export type { SimulantControlsProps } from './SimulantControls';
export type { AnimationTestControlsProps } from './AnimationTestControls';

// Export utilities
export { SimulantUtils, PERFORMANCE_CONFIG } from './SimulantManager';
export { SIMULANT_PRESETS } from './SimulantControls';
export { RPM_CONFIG, disposeReadyPlayerMeSimulant } from './ReadyPlayerMeSimulant';