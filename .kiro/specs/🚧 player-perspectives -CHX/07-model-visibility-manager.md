# Model Visibility Manager System - Implementation Prompt

## Feature Overview

The Model Visibility Manager System provides intelligent control over player model visibility across different POV modes, interaction contexts, and rendering scenarios. This system ensures optimal visual presentation by dynamically showing/hiding model parts, managing LOD levels, applying visual effects, and coordinating with camera systems to deliver seamless first-person and third-person experiences without visual artifacts or performance issues.

## Current State Analysis

### Existing Components
- **POV Switching System**: Manages transitions between first and third-person perspectives
- **Player Avatar Integration**: 3D character models with RPM animation support
- **First/Third-Person Camera Systems**: Camera management with different viewing requirements
- **Animation State Management**: Context-aware animation selection and blending
- **Performance Optimization Systems**: LOD and culling systems for efficient rendering

### Integration Points
- `components/modules/PlayerControlModule.tsx` - Player model state integration
- `components/animations/IsolatedAnimationManager.tsx` - Animation-aware visibility
- `store/worldStore.ts` - Model visibility state persistence
- `types/index.ts` - Model visibility interfaces and state models
- Integration with all camera systems and animation components

## Technical Requirements

### Core Functionality
1. **POV-Aware Visibility**: Automatic model part visibility based on camera perspective
2. **Granular Control**: Individual control over head, body, arms, legs, and accessories
3. **Smooth Transitions**: Fade and scale effects for natural visibility changes
4. **Context Sensitivity**: Visibility adjustments based on environment and interactions
5. **Performance Optimization**: Efficient rendering with minimal overhead

### Performance Targets
- **Visibility Update Time**: ≤ 1ms per frame for visibility calculations
- **Transition Smoothness**: No visible pops or artifacts during changes
- **Memory Efficiency**: ≤ 8MB additional memory for visibility system
- **Frame Rate Impact**: ≤ 2% performance reduction from visibility management
- **State Response Time**: ≤ 16ms from trigger to visibility change

### Technical Constraints
- **Visual Quality**: No clipping, popping, or visual artifacts
- **Cross-Platform Compatibility**: Consistent behavior across different rendering capabilities
- **Integration Harmony**: Seamless integration with existing model and animation systems
- **Performance Scalability**: Efficient operation with multiple character models
- **Asset Compatibility**: Support for standard RPM character models and rigging

## Design Specifications

### Model Visibility State Model

```typescript
interface ModelVisibilityState {
  // Current Visibility Configuration
  currentVisibility: PlayerModelVisibility;
  targetVisibility: PlayerModelVisibility;
  previousVisibility: PlayerModelVisibility;
  
  // Transition State
  isTransitioning: boolean;
  transitionStartTime: number;
  transitionDuration: number;
  transitionProgress: number;
  
  // Part-Specific States
  partStates: Map<ModelPart, PartVisibilityState>;
  
  // Context Information
  currentPOV: POVMode;
  interactionContext: InteractionContext;
  environmentContext: EnvironmentContext;
  animationContext: AnimationContext;
  
  // Performance State
  lodLevel: LODLevel;
  cullingState: CullingState;
  renderingOptimizations: RenderingOptimizations;
  
  // Visual Effects
  fadeEffects: Map<ModelPart, FadeEffect>;
  scaleEffects: Map<ModelPart, ScaleEffect>;
  customEffects: Map<string, CustomEffect>;
}

interface PlayerModelVisibility {
  head: boolean;
  neck: boolean;
  body: boolean;
  leftArm: boolean;
  rightArm: boolean;
  leftHand: boolean;
  rightHand: boolean;
  leftLeg: boolean;
  rightLeg: boolean;
  leftFoot: boolean;
  rightFoot: boolean;
  accessories: AccessoryVisibility;
  clothing: ClothingVisibility;
  equipment: EquipmentVisibility;
}

interface PartVisibilityState {
  part: ModelPart;
  isVisible: boolean;
  targetVisible: boolean;
  opacity: number;
  targetOpacity: number;
  scale: Vector3;
  targetScale: Vector3;
  transitionType: VisibilityTransitionType;
  transitionProgress: number;
  lastUpdateTime: number;
}

type ModelPart = 
  | 'head' | 'neck' | 'body'
  | 'leftArm' | 'rightArm' | 'leftHand' | 'rightHand'
  | 'leftLeg' | 'rightLeg' | 'leftFoot' | 'rightFoot'
  | 'accessories' | 'clothing' | 'equipment';

type VisibilityTransitionType = 
  | 'instant' | 'fade' | 'scale' | 'dissolve' | 'mask';

interface AccessoryVisibility {
  hat: boolean;
  glasses: boolean;
  watch: boolean;
  jewelry: boolean;
  backpack: boolean;
}

interface ClothingVisibility {
  shirt: boolean;
  pants: boolean;
  shoes: boolean;
  jacket: boolean;
  gloves: boolean;
}

interface EquipmentVisibility {
  primaryWeapon: boolean;
  secondaryWeapon: boolean;
  tools: boolean;
  consumables: boolean;
}
```

### Component Architecture

```typescript
interface ModelVisibilityManager {
  // Core Management
  initialize(playerModel: Object3D, animationManager: PlayerAnimationManager): void;
  update(deltaTime: number): void;
  dispose(): void;
  
  // Visibility Control
  setVisibility(visibility: Partial<PlayerModelVisibility>): void;
  getVisibility(): PlayerModelVisibility;
  setPartVisibility(part: ModelPart, visible: boolean, transitionType?: VisibilityTransitionType): void;
  getPartVisibility(part: ModelPart): boolean;
  
  // POV-Specific Presets
  applyFirstPersonVisibility(): void;
  applyThirdPersonVisibility(): void;
  applyCustomPreset(preset: VisibilityPreset): void;
  
  // Transition Management
  transitionToVisibility(targetVisibility: PlayerModelVisibility, duration?: number): Promise<void>;
  fadePartVisibility(part: ModelPart, targetOpacity: number, duration: number): void;
  scalePartVisibility(part: ModelPart, targetScale: Vector3, duration: number): void;
  
  // Context-Aware Visibility
  updateVisibilityForPOV(pov: POVMode): void;
  updateVisibilityForInteraction(interaction: InteractionType): void;
  updateVisibilityForEnvironment(environment: EnvironmentType): void;
  updateVisibilityForAnimation(animationState: AnimationStateType): void;
  
  // Performance Optimization
  updateLODVisibility(distance: number, performanceLevel: PerformanceLevel): void;
  applyCullingOptimizations(frustum: Frustum, camera: Camera): void;
  optimizeForPerformance(level: number): void;
  
  // Special Effects
  addVisibilityEffect(part: ModelPart, effect: VisibilityEffect): void;
  removeVisibilityEffect(part: ModelPart, effectName: string): void;
  updateVisibilityEffects(deltaTime: number): void;
  
  // State Management
  saveVisibilityState(): ModelVisibilityState;
  restoreVisibilityState(state: ModelVisibilityState): void;
  resetToDefault(): void;
  
  // Performance Monitoring
  getPerformanceMetrics(): VisibilityPerformanceMetrics;
  getVisibilityReport(): VisibilityReport;
}

interface VisibilityPreset {
  name: string;
  description: string;
  visibility: PlayerModelVisibility;
  transitionDuration: number;
  conditions: VisibilityCondition[];
}

interface VisibilityCondition {
  type: 'pov' | 'interaction' | 'environment' | 'animation' | 'performance';
  operator: 'equals' | 'not_equals' | 'in' | 'not_in';
  value: any;
  priority: number;
}

interface VisibilityEffect {
  name: string;
  type: 'fade' | 'scale' | 'dissolve' | 'outline' | 'highlight';
  parameters: Record<string, any>;
  duration: number;
  loop: boolean;
  priority: number;
}
```

## Implementation Tasks

### Phase 1: Core Visibility Management (Priority: Critical)

#### Task 1.1: Model Part Detection and Control
**Success Criteria**: Accurate identification and individual control of all model parts
```typescript
class ModelPartController {
  private modelParts: Map<ModelPart, Object3D> = new Map();
  private boneMapping: Map<string, ModelPart> = new Map();
  private materialMapping: Map<string, ModelPart[]> = new Map();
  
  initializeModelParts(playerModel: Object3D): void {
    // Traverse model hierarchy to identify parts
    this.traverseModelHierarchy(playerModel);
    
    // Create bone mappings for RPM models
    this.createBoneMapping(playerModel);
    
    // Map materials to model parts
    this.createMaterialMapping(playerModel);
    
    // Validate all expected parts are found
    this.validateModelPartMapping();
  }
  
  traverseModelHierarchy(model: Object3D): void {
    model.traverse((child) => {
      if (child.isMesh || child.isSkinnedMesh) {
        const partType = this.identifyModelPart(child);
        if (partType) {
          this.modelParts.set(partType, child);
        }
      }
    });
  }
  
  identifyModelPart(mesh: Object3D): ModelPart | null {
    const name = mesh.name.toLowerCase();
    
    // Standard RPM naming conventions
    if (name.includes('head') || name.includes('skull')) {
      return 'head';
    }
    if (name.includes('neck')) {
      return 'neck';
    }
    if (name.includes('body') || name.includes('torso') || name.includes('chest')) {
      return 'body';
    }
    if (name.includes('arm_l') || name.includes('shoulder_l')) {
      return 'leftArm';
    }
    if (name.includes('arm_r') || name.includes('shoulder_r')) {
      return 'rightArm';
    }
    if (name.includes('hand_l')) {
      return 'leftHand';
    }
    if (name.includes('hand_r')) {
      return 'rightHand';
    }
    if (name.includes('leg_l') || name.includes('thigh_l')) {
      return 'leftLeg';
    }
    if (name.includes('leg_r') || name.includes('thigh_r')) {
      return 'rightLeg';
    }
    if (name.includes('foot_l')) {
      return 'leftFoot';
    }
    if (name.includes('foot_r')) {
      return 'rightFoot';
    }
    
    // Check for accessories and equipment
    if (name.includes('hat') || name.includes('helmet')) {
      return 'accessories';
    }
    if (name.includes('weapon') || name.includes('tool')) {
      return 'equipment';
    }
    if (name.includes('shirt') || name.includes('pants')) {
      return 'clothing';
    }
    
    return null;
  }
  
  createBoneMapping(model: Object3D): void {
    // Map bone names to model parts for animation-aware visibility
    const boneMap: Record<string, ModelPart> = {
      'Head': 'head',
      'Neck': 'neck',
      'Spine2': 'body',
      'LeftArm': 'leftArm',
      'RightArm': 'rightArm',
      'LeftHand': 'leftHand',
      'RightHand': 'rightHand',
      'LeftUpLeg': 'leftLeg',
      'RightUpLeg': 'rightLeg',
      'LeftFoot': 'leftFoot',
      'RightFoot': 'rightFoot'
    };
    
    for (const [boneName, partType] of Object.entries(boneMap)) {
      this.boneMapping.set(boneName, partType);
    }
  }
  
  setPartVisibility(part: ModelPart, visible: boolean): void {
    const modelObject = this.modelParts.get(part);
    if (modelObject) {
      modelObject.visible = visible;
      
      // Handle special cases for connected parts
      this.handleConnectedPartVisibility(part, visible);
      
      // Update material visibility if needed
      this.updateMaterialVisibility(part, visible);
    }
  }
  
  handleConnectedPartVisibility(part: ModelPart, visible: boolean): void {
    // Handle interdependent visibility relationships
    switch (part) {
      case 'head':
        // If head is hidden, hide neck for seamless look
        if (!visible) {
          this.setPartVisibility('neck', false);
        }
        break;
        
      case 'leftArm':
        // Ensure hand visibility matches arm visibility
        const leftHand = this.getPartVisibility('leftHand');
        if (!visible && leftHand) {
          this.setPartVisibility('leftHand', false);
        }
        break;
        
      case 'rightArm':
        const rightHand = this.getPartVisibility('rightHand');
        if (!visible && rightHand) {
          this.setPartVisibility('rightHand', false);
        }
        break;
    }
  }
  
  getPartVisibility(part: ModelPart): boolean {
    const modelObject = this.modelParts.get(part);
    return modelObject ? modelObject.visible : false;
  }
  
  validateModelPartMapping(): void {
    const requiredParts: ModelPart[] = [
      'head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'
    ];
    
    const missingParts = requiredParts.filter(part => !this.modelParts.has(part));
    
    if (missingParts.length > 0) {
      console.warn(`Missing model parts: ${missingParts.join(', ')}`);
      
      // Create fallback mappings
      this.createFallbackMappings(missingParts);
    }
  }
  
  createFallbackMappings(missingParts: ModelPart[]): void {
    // Create fallback objects for missing parts
    for (const part of missingParts) {
      const fallback = new THREE.Group();
      fallback.name = `fallback_${part}`;
      fallback.visible = false;
      this.modelParts.set(part, fallback);
    }
  }
}
```

**Implementation Steps**:
1. Create model hierarchy traversal and part identification
2. Implement bone mapping for RPM character models
3. Add material-based part identification for complex models
4. Create validation and fallback systems for missing parts
5. Implement connected part visibility relationships

**Visual Feedback**: Individual model parts can be shown/hidden correctly
**Success Metrics**: 100% part identification accuracy, no missing critical parts

#### Task 1.2: POV-Specific Visibility Presets
**Success Criteria**: Optimized visibility configurations for different POV modes
```typescript
class POVVisibilityPresetManager {
  private presets: Map<POVMode, VisibilityPreset> = new Map();
  private customPresets: Map<string, VisibilityPreset> = new Map();
  private transitionConfigs: Map<string, TransitionConfig> = new Map();
  
  initializeDefaultPresets(): void {
    // First-person preset
    this.presets.set('first-person', {
      name: 'first-person',
      description: 'Optimized visibility for first-person perspective',
      visibility: {
        head: false,          // Hide head to prevent seeing inside
        neck: false,          // Hide neck for clean transition
        body: false,          // Hide body for unobstructed view
        leftArm: true,        // Show arms for presence and interaction
        rightArm: true,       // Show arms for presence and interaction
        leftHand: true,       // Show hands for tool/weapon interaction
        rightHand: true,      // Show hands for tool/weapon interaction
        leftLeg: false,       // Hide legs (not typically visible)
        rightLeg: false,      // Hide legs (not typically visible)
        leftFoot: false,      // Hide feet (not typically visible)
        rightFoot: false,     // Hide feet (not typically visible)
        accessories: {
          hat: false,         // Hide hat (would obstruct view)
          glasses: false,     // Hide glasses (on hidden head)
          watch: true,        // Show watch on visible arm
          jewelry: true,      // Show arm jewelry
          backpack: false     // Hide backpack (behind camera)
        },
        clothing: {
          shirt: true,        // Show shirt on visible arms
          pants: false,       // Hide pants (legs not visible)
          shoes: false,       // Hide shoes (feet not visible)
          jacket: true,       // Show jacket on visible arms
          gloves: true        // Show gloves on visible hands
        },
        equipment: {
          primaryWeapon: true,    // Show primary weapon
          secondaryWeapon: false, // Hide secondary (usually on back)
          tools: true,            // Show tools in hands
          consumables: true       // Show consumables being used
        }
      },
      transitionDuration: 200,
      conditions: [
        { type: 'pov', operator: 'equals', value: 'first-person', priority: 10 }
      ]
    });
    
    // Third-person preset
    this.presets.set('third-person', {
      name: 'third-person',
      description: 'Full visibility for third-person perspective',
      visibility: {
        head: true,
        neck: true,
        body: true,
        leftArm: true,
        rightArm: true,
        leftHand: true,
        rightHand: true,
        leftLeg: true,
        rightLeg: true,
        leftFoot: true,
        rightFoot: true,
        accessories: {
          hat: true,
          glasses: true,
          watch: true,
          jewelry: true,
          backpack: true
        },
        clothing: {
          shirt: true,
          pants: true,
          shoes: true,
          jacket: true,
          gloves: true
        },
        equipment: {
          primaryWeapon: true,
          secondaryWeapon: true,
          tools: true,
          consumables: true
        }
      },
      transitionDuration: 200,
      conditions: [
        { type: 'pov', operator: 'equals', value: 'third-person', priority: 10 }
      ]
    });
    
    this.createTransitionConfigs();
  }
  
  createTransitionConfigs(): void {
    // First-person to third-person transition
    this.transitionConfigs.set('first-person->third-person', {
      duration: 200,
      phases: [
        {
          name: 'show-head',
          startProgress: 0.1,
          endProgress: 0.3,
          parts: ['head', 'neck'],
          transitionType: 'fade'
        },
        {
          name: 'show-body',
          startProgress: 0.2,
          endProgress: 0.6,
          parts: ['body', 'leftLeg', 'rightLeg'],
          transitionType: 'fade'
        },
        {
          name: 'show-accessories',
          startProgress: 0.4,
          endProgress: 0.8,
          parts: ['accessories', 'equipment'],
          transitionType: 'scale'
        }
      ]
    });
    
    // Third-person to first-person transition
    this.transitionConfigs.set('third-person->first-person', {
      duration: 200,
      phases: [
        {
          name: 'hide-accessories',
          startProgress: 0.0,
          endProgress: 0.2,
          parts: ['accessories'],
          transitionType: 'scale'
        },
        {
          name: 'hide-body',
          startProgress: 0.1,
          endProgress: 0.5,
          parts: ['body', 'leftLeg', 'rightLeg'],
          transitionType: 'fade'
        },
        {
          name: 'hide-head',
          startProgress: 0.6,
          endProgress: 0.9,
          parts: ['head', 'neck'],
          transitionType: 'instant'
        }
      ]
    });
  }
  
  applyPreset(preset: VisibilityPreset, modelController: ModelPartController): void {
    // Apply basic visibility settings
    this.applyBasicVisibility(preset.visibility, modelController);
    
    // Apply accessory visibility
    this.applyAccessoryVisibility(preset.visibility.accessories, modelController);
    
    // Apply clothing visibility
    this.applyClothingVisibility(preset.visibility.clothing, modelController);
    
    // Apply equipment visibility
    this.applyEquipmentVisibility(preset.visibility.equipment, modelController);
  }
  
  transitionToPreset(
    fromPreset: VisibilityPreset,
    toPreset: VisibilityPreset,
    modelController: ModelPartController,
    duration?: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const transitionKey = `${fromPreset.name}->${toPreset.name}`;
      const config = this.transitionConfigs.get(transitionKey);
      
      if (!config) {
        // Direct transition without phases
        this.applyPreset(toPreset, modelController);
        resolve();
        return;
      }
      
      const startTime = Date.now();
      const transitionDuration = duration || config.duration;
      
      const updateTransition = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / transitionDuration, 1.0);
        
        // Update each phase based on progress
        for (const phase of config.phases) {
          if (progress >= phase.startProgress && progress <= phase.endProgress) {
            const phaseProgress = (progress - phase.startProgress) / 
                                (phase.endProgress - phase.startProgress);
            
            this.updateTransitionPhase(phase, phaseProgress, fromPreset, toPreset, modelController);
          }
        }
        
        if (progress < 1.0) {
          requestAnimationFrame(updateTransition);
        } else {
          this.applyPreset(toPreset, modelController);
          resolve();
        }
      };
      
      requestAnimationFrame(updateTransition);
    });
  }
  
  updateTransitionPhase(
    phase: TransitionPhase,
    progress: number,
    fromPreset: VisibilityPreset,
    toPreset: VisibilityPreset,
    modelController: ModelPartController
  ): void {
    for (const partName of phase.parts) {
      const part = partName as ModelPart;
      const fromVisible = this.getPartVisibilityFromPreset(part, fromPreset);
      const toVisible = this.getPartVisibilityFromPreset(part, toPreset);
      
      if (fromVisible !== toVisible) {
        switch (phase.transitionType) {
          case 'fade':
            this.applyFadeTransition(part, fromVisible, toVisible, progress, modelController);
            break;
          case 'scale':
            this.applyScaleTransition(part, fromVisible, toVisible, progress, modelController);
            break;
          case 'instant':
            if (progress >= 1.0) {
              modelController.setPartVisibility(part, toVisible);
            }
            break;
        }
      }
    }
  }
  
  applyFadeTransition(
    part: ModelPart,
    fromVisible: boolean,
    toVisible: boolean,
    progress: number,
    modelController: ModelPartController
  ): void {
    const targetOpacity = toVisible ? progress : (1 - progress);
    
    // Ensure part is visible during fade
    modelController.setPartVisibility(part, true);
    
    // Apply opacity
    this.setPartOpacity(part, targetOpacity, modelController);
    
    // Hide completely when fade is done
    if (progress >= 1.0) {
      modelController.setPartVisibility(part, toVisible);
      this.setPartOpacity(part, 1.0, modelController);
    }
  }
  
  createCustomPreset(
    name: string,
    description: string,
    visibility: PlayerModelVisibility,
    conditions?: VisibilityCondition[]
  ): void {
    this.customPresets.set(name, {
      name,
      description,
      visibility,
      transitionDuration: 300,
      conditions: conditions || []
    });
  }
  
  evaluatePresetConditions(
    preset: VisibilityPreset,
    context: VisibilityContext
  ): boolean {
    for (const condition of preset.conditions) {
      if (!this.evaluateCondition(condition, context)) {
        return false;
      }
    }
    return true;
  }
  
  evaluateCondition(condition: VisibilityCondition, context: VisibilityContext): boolean {
    const contextValue = this.getContextValue(condition.type, context);
    
    switch (condition.operator) {
      case 'equals':
        return contextValue === condition.value;
      case 'not_equals':
        return contextValue !== condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(contextValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(contextValue);
      default:
        return false;
    }
  }
}
```

**Implementation Steps**:
1. Create default visibility presets for first and third-person POV
2. Implement preset transition system with configurable phases
3. Add custom preset creation and management
4. Create condition evaluation system for context-aware presets
5. Integrate with model part controller for preset application

**Visual Feedback**: Model visibility changes appropriately for POV mode
**Success Metrics**: Preset transitions complete within 300ms, appropriate visibility for each POV

#### Task 1.3: Smooth Visibility Transitions
**Success Criteria**: Natural fade and scale effects for visibility changes without visual artifacts
```typescript
class VisibilityTransitionController {
  private activeTransitions: Map<ModelPart, PartTransition> = new Map();
  private effectQueue: VisibilityEffect[] = [];
  private materialCache: Map<string, Material> = new Map();
  
  fadePartVisibility(
    part: ModelPart,
    targetOpacity: number,
    duration: number,
    easing: EasingFunction = 'easeInOutCubic'
  ): Promise<void> {
    return new Promise((resolve) => {
      const modelObject = this.modelPartController.getModelPart(part);
      if (!modelObject) {
        resolve();
        return;
      }
      
      const startOpacity = this.getCurrentOpacity(modelObject);
      const transition: PartTransition = {
        part,
        type: 'fade',
        startValue: startOpacity,
        endValue: targetOpacity,
        startTime: Date.now(),
        duration,
        easing,
        isComplete: false,
        onComplete: resolve
      };
      
      this.activeTransitions.set(part, transition);
      
      // Ensure object is visible during fade
      modelObject.visible = true;
    });
  }
  
  scalePartVisibility(
    part: ModelPart,
    targetScale: Vector3,
    duration: number,
    easing: EasingFunction = 'easeInOutCubic'
  ): Promise<void> {
    return new Promise((resolve) => {
      const modelObject = this.modelPartController.getModelPart(part);
      if (!modelObject) {
        resolve();
        return;
      }
      
      const startScale = modelObject.scale.clone();
      const transition: PartTransition = {
        part,
        type: 'scale',
        startValue: startScale,
        endValue: targetScale,
        startTime: Date.now(),
        duration,
        easing,
        isComplete: false,
        onComplete: resolve
      };
      
      this.activeTransitions.set(part, transition);
      
      // Ensure object is visible during scale
      modelObject.visible = true;
    });
  }
  
  updateTransitions(deltaTime: number): void {
    for (const [part, transition] of this.activeTransitions) {
      this.updateTransition(transition, deltaTime);
      
      if (transition.isComplete) {
        this.completeTransition(transition);
        this.activeTransitions.delete(part);
      }
    }
  }
  
  updateTransition(transition: PartTransition, deltaTime: number): void {
    const elapsed = Date.now() - transition.startTime;
    const progress = Math.min(elapsed / transition.duration, 1.0);
    const easedProgress = this.applyEasing(progress, transition.easing);
    
    const modelObject = this.modelPartController.getModelPart(transition.part);
    if (!modelObject) return;
    
    switch (transition.type) {
      case 'fade':
        const opacity = MathUtils.lerp(
          transition.startValue as number,
          transition.endValue as number,
          easedProgress
        );
        this.applyOpacity(modelObject, opacity);
        break;
        
      case 'scale':
        const scale = (transition.startValue as Vector3).clone().lerp(
          transition.endValue as Vector3,
          easedProgress
        );
        modelObject.scale.copy(scale);
        break;
        
      case 'dissolve':
        this.applyDissolveEffect(modelObject, easedProgress);
        break;
    }
    
    if (progress >= 1.0) {
      transition.isComplete = true;
    }
  }
  
  applyOpacity(object: Object3D, opacity: number): void {
    object.traverse((child) => {
      if (child.isMesh) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(mat => this.setMaterialOpacity(mat, opacity));
        } else {
          this.setMaterialOpacity(mesh.material, opacity);
        }
      }
    });
  }
  
  setMaterialOpacity(material: Material, opacity: number): void {
    // Cache original material properties
    if (!this.materialCache.has(material.uuid)) {
      this.materialCache.set(material.uuid, {
        transparent: material.transparent,
        opacity: material.opacity
      });
    }
    
    // Apply opacity
    material.transparent = opacity < 1.0;
    material.opacity = opacity;
    material.needsUpdate = true;
  }
  
  applyDissolveEffect(object: Object3D, progress: number): void {
    // Create dissolve effect using shader uniforms
    object.traverse((child) => {
      if (child.isMesh) {
        const mesh = child as THREE.Mesh;
        
        // Apply dissolve shader if available
        if (mesh.material && mesh.material.uniforms) {
          mesh.material.uniforms.dissolveProgress = { value: progress };
          mesh.material.needsUpdate = true;
        }
      }
    });
  }
  
  createDissolveShader(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: null },
        dissolveProgress: { value: 0.0 },
        dissolveTexture: { value: this.createNoiseTexture() }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform sampler2D dissolveTexture;
        uniform float dissolveProgress;
        varying vec2 vUv;
        
        void main() {
          vec4 color = texture2D(map, vUv);
          float noise = texture2D(dissolveTexture, vUv).r;
          
          float dissolve = dissolveProgress * 1.2 - 0.1;
          float alpha = smoothstep(dissolve - 0.1, dissolve + 0.1, noise);
          
          gl_FragColor = vec4(color.rgb, color.a * alpha);
        }
      `,
      transparent: true
    });
  }
  
  createNoiseTexture(): THREE.Texture {
    const size = 256;
    const data = new Uint8Array(size * size);
    
    for (let i = 0; i < size * size; i++) {
      data[i] = Math.random() * 255;
    }
    
    const texture = new THREE.DataTexture(data, size, size, THREE.LuminanceFormat);
    texture.needsUpdate = true;
    
    return texture;
  }
  
  completeTransition(transition: PartTransition): void {
    const modelObject = this.modelPartController.getModelPart(transition.part);
    if (!modelObject) return;
    
    switch (transition.type) {
      case 'fade':
        const finalOpacity = transition.endValue as number;
        this.applyOpacity(modelObject, finalOpacity);
        
        // Hide object if fully transparent
        if (finalOpacity <= 0.01) {
          modelObject.visible = false;
          this.restoreOriginalMaterials(modelObject);
        }
        break;
        
      case 'scale':
        const finalScale = transition.endValue as Vector3;
        modelObject.scale.copy(finalScale);
        
        // Hide object if scaled to zero
        if (finalScale.length() <= 0.01) {
          modelObject.visible = false;
        }
        break;
    }
    
    if (transition.onComplete) {
      transition.onComplete();
    }
  }
  
  restoreOriginalMaterials(object: Object3D): void {
    object.traverse((child) => {
      if (child.isMesh) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(mat => this.restoreMaterial(mat));
        } else {
          this.restoreMaterial(mesh.material);
        }
      }
    });
  }
  
  restoreMaterial(material: Material): void {
    const originalProps = this.materialCache.get(material.uuid);
    if (originalProps) {
      material.transparent = originalProps.transparent;
      material.opacity = originalProps.opacity;
      material.needsUpdate = true;
    }
  }
  
  cancelTransition(part: ModelPart): void {
    const transition = this.activeTransitions.get(part);
    if (transition) {
      this.completeTransition(transition);
      this.activeTransitions.delete(part);
    }
  }
  
  cancelAllTransitions(): void {
    for (const [part] of this.activeTransitions) {
      this.cancelTransition(part);
    }
  }
}

interface PartTransition {
  part: ModelPart;
  type: 'fade' | 'scale' | 'dissolve';
  startValue: number | Vector3;
  endValue: number | Vector3;
  startTime: number;
  duration: number;
  easing: EasingFunction;
  isComplete: boolean;
  onComplete?: () => void;
}
```

**Implementation Steps**:
1. Create fade transition system with opacity control
2. Implement scale transition system with size animation
3. Add dissolve effect with shader-based transitions
4. Create transition queue and conflict resolution
5. Implement material caching and restoration

**Visual Feedback**: Smooth fades and scales without pops or artifacts
**Success Metrics**: Transitions complete smoothly, no visual glitches, materials restored correctly

### Phase 2: Context-Aware Visibility (Priority: High)

#### Task 2.1: Interaction-Based Visibility
**Success Criteria**: Model visibility adapts appropriately to different interaction contexts
```typescript
class InteractionVisibilityController {
  private interactionPresets: Map<InteractionType, VisibilityModifier> = new Map();
  private activeInteractions: Set<InteractionType> = new Set();
  private interactionHistory: InteractionHistoryEntry[] = [];
  
  initializeInteractionPresets(): void {
    // Weapon handling interaction
    this.interactionPresets.set('weapon-equip', {
      name: 'weapon-equip',
      priority: 8,
      modifications: {
        leftHand: { visible: true, emphasis: 'highlight' },
        rightHand: { visible: true, emphasis: 'highlight' },
        equipment: { visible: true, scale: 1.1 }
      },
      duration: 1500,
      conditions: ['has-weapon', 'not-in-menu']
    });
    
    // Item pickup interaction
    this.interactionPresets.set('item-pickup', {
      name: 'item-pickup',
      priority: 6,
      modifications: {
        leftHand: { visible: true, emphasis: 'glow' },
        rightHand: { visible: true, emphasis: 'glow' },
        body: { visible: true, scale: 1.05 }
      },
      duration: 800,
      conditions: ['near-item', 'hands-free']
    });
    
    // Door opening interaction
    this.interactionPresets.set('door-open', {
      name: 'door-open',
      priority: 5,
      modifications: {
        rightHand: { visible: true, emphasis: 'outline' },
        body: { visible: true, rotation: { y: 0.1 } }
      },
      duration: 1000,
      conditions: ['near-door', 'facing-door']
    });
    
    // Climbing interaction
    this.interactionPresets.set('climbing', {
      name: 'climbing',
      priority: 9,
      modifications: {
        leftHand: { visible: true, emphasis: 'highlight' },
        rightHand: { visible: true, emphasis: 'highlight' },
        leftArm: { visible: true, scale: 1.1 },
        rightArm: { visible: true, scale: 1.1 },
        legs: { visible: true, alpha: 0.8 } // Less emphasis on legs
      },
      duration: 0, // Continuous while climbing
      conditions: ['on-climbable-surface', 'climbing-input']
    });
    
    // Swimming interaction
    this.interactionPresets.set('swimming', {
      name: 'swimming',
      priority: 10,
      modifications: {
        head: { visible: true, scale: 0.95 }, // Slightly smaller for streamlined look
        body: { visible: true, emphasis: 'water-distortion' },
        leftArm: { visible: true, emphasis: 'water-ripple' },
        rightArm: { visible: true, emphasis: 'water-ripple' },
        legs: { visible: true, emphasis: 'water-ripple' }
      },
      duration: 0, // Continuous while in water
      conditions: ['in-water', 'swimming-depth']
    });
  }
  
  updateInteractionVisibility(
    activeInteractions: InteractionType[],
    context: InteractionContext
  ): void {
    // Update active interactions
    this.updateActiveInteractions(activeInteractions);
    
    // Apply interaction-specific visibility modifications
    this.applyInteractionModifications(context);
    
    // Handle interaction transitions
    this.handleInteractionTransitions();
    
    // Update interaction history
    this.updateInteractionHistory(activeInteractions);
  }
  
  updateActiveInteractions(interactions: InteractionType[]): void {
    const newInteractions = new Set(interactions);
    
    // Find interactions that ended
    for (const interaction of this.activeInteractions) {
      if (!newInteractions.has(interaction)) {
        this.endInteraction(interaction);
      }
    }
    
    // Find interactions that started
    for (const interaction of newInteractions) {
      if (!this.activeInteractions.has(interaction)) {
        this.startInteraction(interaction);
      }
    }
    
    this.activeInteractions = newInteractions;
  }
  
  startInteraction(interaction: InteractionType): void {
    const preset = this.interactionPresets.get(interaction);
    if (!preset) return;
    
    // Check conditions
    if (!this.checkInteractionConditions(preset.conditions)) return;
    
    // Apply modifications
    this.applyVisibilityModifications(preset.modifications);
    
    // Log interaction start
    this.interactionHistory.push({
      interaction,
      action: 'start',
      timestamp: Date.now(),
      preset: preset.name
    });
  }
  
  endInteraction(interaction: InteractionType): void {
    const preset = this.interactionPresets.get(interaction);
    if (!preset) return;
    
    // Revert modifications
    this.revertVisibilityModifications(preset.modifications);
    
    // Log interaction end
    this.interactionHistory.push({
      interaction,
      action: 'end',
      timestamp: Date.now(),
      preset: preset.name
    });
  }
  
  applyVisibilityModifications(modifications: Record<string, PartModification>): void {
    for (const [partName, modification] of Object.entries(modifications)) {
      const part = partName as ModelPart;
      
      // Apply visibility
      if (modification.visible !== undefined) {
        this.modelPartController.setPartVisibility(part, modification.visible);
      }
      
      // Apply scale
      if (modification.scale !== undefined) {
        const modelObject = this.modelPartController.getModelPart(part);
        if (modelObject) {
          const scale = typeof modification.scale === 'number' 
            ? new Vector3(modification.scale, modification.scale, modification.scale)
            : modification.scale;
          
          this.transitionController.scalePartVisibility(part, scale, 300);
        }
      }
      
      // Apply emphasis effects
      if (modification.emphasis) {
        this.applyEmphasisEffect(part, modification.emphasis);
      }
      
      // Apply alpha
      if (modification.alpha !== undefined) {
        this.transitionController.fadePartVisibility(part, modification.alpha, 300);
      }
    }
  }
  
  applyEmphasisEffect(part: ModelPart, emphasis: EmphasisType): void {
    const modelObject = this.modelPartController.getModelPart(part);
    if (!modelObject) return;
    
    switch (emphasis) {
      case 'highlight':
        this.addHighlightEffect(modelObject);
        break;
        
      case 'glow':
        this.addGlowEffect(modelObject);
        break;
        
      case 'outline':
        this.addOutlineEffect(modelObject);
        break;
        
      case 'water-distortion':
        this.addWaterDistortionEffect(modelObject);
        break;
        
      case 'water-ripple':
        this.addWaterRippleEffect(modelObject);
        break;
    }
  }
  
  addHighlightEffect(object: Object3D): void {
    // Create highlight material overlay
    const highlightMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    });
    
    // Clone object geometry for highlight
    object.traverse((child) => {
      if (child.isMesh) {
        const mesh = child as THREE.Mesh;
        const highlightMesh = new THREE.Mesh(mesh.geometry, highlightMaterial);
        highlightMesh.scale.setScalar(1.02); // Slightly larger
        
        child.add(highlightMesh);
        
        // Store reference for later removal
        (child as any).highlightMesh = highlightMesh;
      }
    });
  }
  
  addGlowEffect(object: Object3D): void {
    // Create glow using bloom-like effect
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        glowColor: { value: new THREE.Color(0x00ffff) },
        intensity: { value: 1.5 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform float time;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          
          vec3 pos = position + normal * sin(time * 2.0) * 0.01;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float intensity;
        uniform float time;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          float rim = 1.0 - abs(dot(vNormal, vec3(0, 0, 1)));
          float pulse = sin(time * 3.0) * 0.5 + 0.5;
          
          vec3 color = glowColor * intensity * rim * pulse;
          gl_FragColor = vec4(color, rim);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    
    // Apply glow material
    this.applyEffectMaterial(object, glowMaterial, 'glow');
  }
  
  addOutlineEffect(object: Object3D): void {
    // Create outline using edge detection
    const outlineMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.8
    });
    
    object.traverse((child) => {
      if (child.isMesh) {
        const mesh = child as THREE.Mesh;
        const outlineMesh = new THREE.Mesh(mesh.geometry, outlineMaterial);
        outlineMesh.scale.setScalar(1.05);
        
        child.add(outlineMesh);
        (child as any).outlineMesh = outlineMesh;
      }
    });
  }
  
  handleInteractionPriorities(): void {
    // Sort active interactions by priority
    const sortedInteractions = Array.from(this.activeInteractions)
      .map(interaction => ({
        interaction,
        preset: this.interactionPresets.get(interaction)
      }))
      .filter(item => item.preset)
      .sort((a, b) => (b.preset?.priority || 0) - (a.preset?.priority || 0));
    
    // Apply modifications in priority order
    for (const { interaction, preset } of sortedInteractions) {
      if (preset) {
        this.applyVisibilityModifications(preset.modifications);
      }
    }
  }
  
  checkInteractionConditions(conditions: string[]): boolean {
    // Evaluate interaction conditions
    for (const condition of conditions) {
      if (!this.evaluateCondition(condition)) {
        return false;
      }
    }
    return true;
  }
  
  evaluateCondition(condition: string): boolean {
    switch (condition) {
      case 'has-weapon':
        return this.hasEquippedWeapon();
      case 'hands-free':
        return !this.hasItemInHands();
      case 'near-item':
        return this.isNearInteractableItem();
      case 'in-water':
        return this.isInWater();
      // Add more condition evaluations as needed
      default:
        return true;
    }
  }
}

interface VisibilityModifier {
  name: string;
  priority: number;
  modifications: Record<string, PartModification>;
  duration: number;
  conditions: string[];
}

interface PartModification {
  visible?: boolean;
  scale?: number | Vector3;
  alpha?: number;
  emphasis?: EmphasisType;
  rotation?: Euler;
}

type EmphasisType = 
  | 'highlight' | 'glow' | 'outline' | 'pulse' 
  | 'water-distortion' | 'water-ripple' | 'fire-glow';

type InteractionType = 
  | 'weapon-equip' | 'item-pickup' | 'door-open' 
  | 'climbing' | 'swimming' | 'crafting' | 'trading';
```

**Implementation Steps**:
1. Create interaction-specific visibility presets
2. Implement priority-based modification system
3. Add visual emphasis effects (highlight, glow, outline)
4. Create condition evaluation system for interactions
5. Integrate with existing interaction detection systems

**Visual Feedback**: Model appearance changes appropriately for different interactions
**Success Metrics**: Context-appropriate visibility changes, smooth effect transitions

#### Task 2.2: Environment-Adaptive Visibility
**Success Criteria**: Model visibility adapts to environmental conditions and lighting
```typescript
class EnvironmentVisibilityController {
  private environmentPresets: Map<EnvironmentType, EnvironmentVisibilityPreset> = new Map();
  private lightingConditions: LightingConditions = this.createDefaultLighting();
  private weatherEffects: Map<WeatherType, WeatherVisibilityEffect> = new Map();
  
  initializeEnvironmentPresets(): void {
    // Underwater environment
    this.environmentPresets.set('underwater', {
      name: 'underwater',
      modifications: {
        body: { 
          alpha: 0.9,
          tint: new THREE.Color(0.7, 0.9, 1.0),
          distortion: 'water-refraction'
        },
        accessories: {
          hat: { visible: false }, // Hats don't work underwater
          glasses: { alpha: 0.5 }
        },
        effects: ['bubble-trail', 'water-distortion']
      },
      transitionDuration: 1000
    });
    
    // Cave environment
    this.environmentPresets.set('cave', {
      name: 'cave',
      modifications: {
        body: {
          tint: new THREE.Color(0.3, 0.3, 0.4),
          contrast: 1.5
        },
        equipment: {
          tools: { emphasis: 'dim-glow' } // Tools might have lights
        },
        effects: ['shadow-enhancement', 'echo-outline']
      },
      transitionDuration: 800
    });
    
    // Bright sunlight environment
    this.environmentPresets.set('bright-sunlight', {
      name: 'bright-sunlight',
      modifications: {
        body: {
          tint: new THREE.Color(1.2, 1.1, 0.9),
          saturation: 1.1
        },
        accessories: {
          hat: { emphasis: 'shadow-cast' },
          glasses: { emphasis: 'sun-reflection' }
        },
        effects: ['heat-shimmer', 'bright-rim-light']
      },
      transitionDuration: 600
    });
    
    // Foggy environment
    this.environmentPresets.set('foggy', {
      name: 'foggy',
      modifications: {
        body: {
          alpha: 0.7,
          softness: 1.5,
          tint: new THREE.Color(0.9, 0.9, 0.9)
        },
        extremities: {
          hands: { alpha: 0.5 },
          feet: { alpha: 0.3 }
        },
        effects: ['fog-fade', 'distance-blur']
      },
      transitionDuration: 1200
    });
  }
  
  initializeWeatherEffects(): void {
    // Rain effects
    this.weatherEffects.set('rain', {
      name: 'rain',
      intensity: 1.0,
      modifications: {
        clothing: {
          wetness: 0.8,
          darkening: 0.2,
          reflection: 1.5
        },
        hair: {
          wetness: 1.0,
          weight: 1.3 // Hair looks heavier when wet
        }
      },
      particleEffects: ['rain-droplets', 'water-drip']
    });
    
    // Snow effects
    this.weatherEffects.set('snow', {
      name: 'snow',
      intensity: 0.7,
      modifications: {
        body: {
          tint: new THREE.Color(0.95, 0.95, 1.0),
          accumulation: 'snow-layer'
        },
        clothing: {
          thickness: 1.1,
          insulation: true
        }
      },
      particleEffects: ['snowflakes', 'frost-breath']
    });
    
    // Wind effects
    this.weatherEffects.set('windy', {
      name: 'windy',
      intensity: 1.2,
      modifications: {
        clothing: {
          movement: 'wind-sway',
          flutter: true
        },
        hair: {
          movement: 'wind-blown',
          direction: 'environment-wind'
        }
      },
      particleEffects: ['dust-swirl', 'leaf-scatter']
    });
  }
  
  updateEnvironmentVisibility(
    environment: EnvironmentType,
    lighting: LightingConditions,
    weather: WeatherType,
    intensity: number
  ): void {
    // Update lighting conditions
    this.lightingConditions = lighting;
    
    // Apply environment-specific modifications
    this.applyEnvironmentPreset(environment);
    
    // Apply weather effects
    this.applyWeatherEffects(weather, intensity);
    
    // Apply lighting-based visibility adjustments
    this.applyLightingVisibility(lighting);
    
    // Handle environment transitions
    this.handleEnvironmentTransitions(environment);
  }
  
  applyEnvironmentPreset(environment: EnvironmentType): void {
    const preset = this.environmentPresets.get(environment);
    if (!preset) return;
    
    // Apply body modifications
    if (preset.modifications.body) {
      this.applyBodyModifications(preset.modifications.body);
    }
    
    // Apply accessory modifications
    if (preset.modifications.accessories) {
      this.applyAccessoryModifications(preset.modifications.accessories);
    }
    
    // Apply equipment modifications
    if (preset.modifications.equipment) {
      this.applyEquipmentModifications(preset.modifications.equipment);
    }
    
    // Apply special effects
    if (preset.modifications.effects) {
      this.applyEnvironmentEffects(preset.modifications.effects);
    }
  }
  
  applyBodyModifications(modifications: BodyModifications): void {
    const bodyParts: ModelPart[] = ['head', 'neck', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
    
    for (const part of bodyParts) {
      const modelObject = this.modelPartController.getModelPart(part);
      if (!modelObject) continue;
      
      // Apply alpha changes
      if (modifications.alpha !== undefined) {
        this.transitionController.fadePartVisibility(part, modifications.alpha, 500);
      }
      
      // Apply tint
      if (modifications.tint) {
        this.applyTint(modelObject, modifications.tint);
      }
      
      // Apply distortion effects
      if (modifications.distortion) {
        this.applyDistortionEffect(modelObject, modifications.distortion);
      }
      
      // Apply contrast adjustments
      if (modifications.contrast) {
        this.applyContrast(modelObject, modifications.contrast);
      }
      
      // Apply saturation adjustments
      if (modifications.saturation) {
        this.applySaturation(modelObject, modifications.saturation);
      }
    }
  }
  
  applyTint(object: Object3D, tint: THREE.Color): void {
    object.traverse((child) => {
      if (child.isMesh) {
        const mesh = child as THREE.Mesh;
        
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(mat => this.applyMaterialTint(mat, tint));
        } else {
          this.applyMaterialTint(mesh.material, tint);
        }
      }
    });
  }
  
  applyMaterialTint(material: Material, tint: THREE.Color): void {
    // Store original color if not already stored
    if (!material.userData.originalColor) {
      material.userData.originalColor = material.color.clone();
    }
    
    // Apply tint by multiplying with original color
    const tintedColor = material.userData.originalColor.clone();
    tintedColor.multiply(tint);
    material.color.copy(tintedColor);
    material.needsUpdate = true;
  }
  
  applyLightingVisibility(lighting: LightingConditions): void {
    // Adjust visibility based on lighting conditions
    const brightnessMultiplier = this.calculateBrightnessMultiplier(lighting);
    const contrastMultiplier = this.calculateContrastMultiplier(lighting);
    
    // Apply to all visible parts
    const allParts: ModelPart[] = [
      'head', 'neck', 'body', 'leftArm', 'rightArm', 
      'leftLeg', 'rightLeg', 'leftHand', 'rightHand'
    ];
    
    for (const part of allParts) {
      if (this.modelPartController.getPartVisibility(part)) {
        this.applyLightingToPart(part, brightnessMultiplier, contrastMultiplier);
      }
    }
  }
  
  applyWeatherEffects(weather: WeatherType, intensity: number): void {
    const weatherEffect = this.weatherEffects.get(weather);
    if (!weatherEffect) return;
    
    const effectIntensity = intensity * weatherEffect.intensity;
    
    // Apply clothing modifications
    if (weatherEffect.modifications.clothing) {
      this.applyClothingWeatherEffects(weatherEffect.modifications.clothing, effectIntensity);
    }
    
    // Apply hair modifications
    if (weatherEffect.modifications.hair) {
      this.applyHairWeatherEffects(weatherEffect.modifications.hair, effectIntensity);
    }
    
    // Apply body modifications
    if (weatherEffect.modifications.body) {
      this.applyBodyWeatherEffects(weatherEffect.modifications.body, effectIntensity);
    }
    
    // Add particle effects
    if (weatherEffect.particleEffects) {
      this.addWeatherParticleEffects(weatherEffect.particleEffects, effectIntensity);
    }
  }
  
  calculateEnvironmentLOD(
    environment: EnvironmentType,
    distance: number,
    performance: PerformanceLevel
  ): LODLevel {
    // Base LOD calculation
    let lodLevel: LODLevel = 'high';
    
    if (distance > 50) lodLevel = 'low';
    else if (distance > 20) lodLevel = 'medium';
    
    // Environment-specific adjustments
    switch (environment) {
      case 'foggy':
        // Reduce LOD in fog since details are obscured anyway
        if (lodLevel === 'high') lodLevel = 'medium';
        if (lodLevel === 'medium') lodLevel = 'low';
        break;
        
      case 'underwater':
        // Maintain higher LOD underwater for better interaction
        if (distance < 30 && lodLevel === 'low') lodLevel = 'medium';
        break;
        
      case 'cave':
        // Reduce LOD in dark caves to save performance
        if (performance === 'low' && lodLevel === 'high') lodLevel = 'medium';
        break;
    }
    
    return lodLevel;
  }
  
  generateEnvironmentReport(): EnvironmentVisibilityReport {
    return {
      currentEnvironment: this.getCurrentEnvironment(),
      lightingConditions: this.lightingConditions,
      activeWeatherEffects: Array.from(this.weatherEffects.keys()),
      activeModifications: this.getActiveModifications(),
      performanceImpact: this.calculatePerformanceImpact(),
      recommendations: this.generateOptimizationRecommendations()
    };
  }
}

interface EnvironmentVisibilityPreset {
  name: string;
  modifications: {
    body?: BodyModifications;
    accessories?: Record<string, PartModification>;
    equipment?: Record<string, PartModification>;
    extremities?: Record<string, PartModification>;
    effects?: string[];
  };
  transitionDuration: number;
}

interface BodyModifications {
  alpha?: number;
  tint?: THREE.Color;
  distortion?: string;
  contrast?: number;
  saturation?: number;
  softness?: number;
  accumulation?: string;
}

interface LightingConditions {
  brightness: number;      // 0-1
  contrast: number;        // 0-2
  colorTemperature: number; // Kelvin
  shadowIntensity: number; // 0-1
  ambientLevel: number;    // 0-1
}

type EnvironmentType = 
  | 'underwater' | 'cave' | 'bright-sunlight' | 'foggy' 
  | '