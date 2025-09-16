/**
 * Ready Player Me Animation Registry
 * ==================================
 *
 * This file contains the complete mapping of all Ready Player Me animation assets
 * to semantic keys, organized by category and function. Each animation is mapped
 * to both feminine and masculine armature variants with comprehensive metadata.
 *
 * Base path: /animations/animation-library-master/
 */

import {
  AnimationRegistry,
  SemanticKeys,
  PRIORITY_TIERS,
  DEFAULT_TIMINGS
} from '../types/animationRegistry';

/**
 * Complete animation registry with semantic key mappings
 */
export const ANIMATION_REGISTRY: AnimationRegistry = {
  // ========================================================================
  // BASE POSES
  // ========================================================================
  [SemanticKeys.BASE_T_POSE_FEMININE]: {
    feminine: '/animations/animation-library-master/feminine/glb/Feminine_TPose.glb',
    meta: {
      category: 'base',
      loop: false,
      oneShot: true,
      priority: PRIORITY_TIERS.OPTIONAL,
      blendHint: 'fullbody',
      defaultCrossFade: 0.5
    }
  },

  [SemanticKeys.BASE_T_POSE_MASCULINE]: {
    masculine: '/animations/animation-library-master/masculine/glb/Masculine_TPose.glb',
    meta: {
      category: 'base',
      loop: false,
      oneShot: true,
      priority: PRIORITY_TIERS.OPTIONAL,
      blendHint: 'fullbody',
      defaultCrossFade: 0.5
    }
  },

  // ========================================================================
  // LOCOMOTION - IDLE ANIMATIONS
  // ========================================================================
  [SemanticKeys.LOCOMOTION_IDLE_PRIMARY]: {
    feminine: '/animations/animation-library-master/feminine/glb/idle/F_Standing_Idle_001.glb',
    masculine: '/animations/animation-library-master/masculine/glb/idle/M_Standing_Idle_001.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.CRITICAL,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['natural', 'base'],
      defaultCrossFade: DEFAULT_TIMINGS.IDLE_CROSSFADE,
      duration: 4.0
    }
  },

  [SemanticKeys.LOCOMOTION_IDLE_VARIANT_1]: {
    feminine: '/animations/animation-library-master/feminine/glb/idle/F_Standing_Idle_Variations_001.glb',
    masculine: '/animations/animation-library-master/masculine/glb/idle/M_Standing_Idle_Variations_001.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.HIGH,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['subtle', 'casual'],
      defaultCrossFade: DEFAULT_TIMINGS.IDLE_CROSSFADE,
      duration: 6.0
    }
  },

  [SemanticKeys.LOCOMOTION_IDLE_VARIANT_2]: {
    feminine: '/animations/animation-library-master/feminine/glb/idle/F_Standing_Idle_Variations_002.glb',
    masculine: '/animations/animation-library-master/masculine/glb/idle/M_Standing_Idle_Variations_002.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.HIGH,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['shift', 'weight'],
      defaultCrossFade: DEFAULT_TIMINGS.IDLE_CROSSFADE,
      duration: 5.5
    }
  },

  [SemanticKeys.LOCOMOTION_IDLE_VARIANT_3]: {
    feminine: '/animations/animation-library-master/feminine/glb/idle/F_Standing_Idle_Variations_003.glb',
    masculine: '/animations/animation-library-master/masculine/glb/idle/M_Standing_Idle_Variations_003.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.HIGH,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['relaxed', 'natural'],
      defaultCrossFade: DEFAULT_TIMINGS.IDLE_CROSSFADE,
      duration: 7.0
    }
  },

  [SemanticKeys.LOCOMOTION_IDLE_VARIANT_4]: {
    feminine: '/animations/animation-library-master/feminine/glb/idle/F_Standing_Idle_Variations_004.glb',
    masculine: '/animations/animation-library-master/masculine/glb/idle/M_Standing_Idle_Variations_004.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.HIGH,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['fidget', 'micro'],
      defaultCrossFade: DEFAULT_TIMINGS.IDLE_CROSSFADE,
      duration: 4.5
    }
  },

  [SemanticKeys.LOCOMOTION_IDLE_VARIANT_5]: {
    feminine: '/animations/animation-library-master/feminine/glb/idle/F_Standing_Idle_Variations_005.glb',
    masculine: '/animations/animation-library-master/masculine/glb/idle/M_Standing_Idle_Variations_005.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.HIGH,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['stretch', 'comfortable'],
      defaultCrossFade: DEFAULT_TIMINGS.IDLE_CROSSFADE,
      duration: 6.5
    }
  },

  [SemanticKeys.LOCOMOTION_IDLE_VARIANT_6]: {
    feminine: '/animations/animation-library-master/feminine/glb/idle/F_Standing_Idle_Variations_006.glb',
    masculine: '/animations/animation-library-master/masculine/glb/idle/M_Standing_Idle_Variations_006.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.HIGH,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['alert', 'attentive'],
      defaultCrossFade: DEFAULT_TIMINGS.IDLE_CROSSFADE,
      duration: 5.0
    }
  },

  [SemanticKeys.LOCOMOTION_IDLE_VARIANT_7]: {
    feminine: '/animations/animation-library-master/feminine/glb/idle/F_Standing_Idle_Variations_007.glb',
    masculine: '/animations/animation-library-master/masculine/glb/idle/M_Standing_Idle_Variations_007.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.HIGH,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['contemplative', 'thoughtful'],
      defaultCrossFade: DEFAULT_TIMINGS.IDLE_CROSSFADE,
      duration: 8.0
    }
  },

  [SemanticKeys.LOCOMOTION_IDLE_VARIANT_8]: {
    feminine: '/animations/animation-library-master/feminine/glb/idle/F_Standing_Idle_Variations_008.glb',
    masculine: '/animations/animation-library-master/masculine/glb/idle/M_Standing_Idle_Variations_008.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.HIGH,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['dynamic', 'energetic'],
      defaultCrossFade: DEFAULT_TIMINGS.IDLE_CROSSFADE,
      duration: 4.8
    }
  },

  [SemanticKeys.LOCOMOTION_IDLE_VARIANT_9]: {
    feminine: '/animations/animation-library-master/feminine/glb/idle/F_Standing_Idle_Variations_009.glb',
    masculine: '/animations/animation-library-master/masculine/glb/idle/M_Standing_Idle_Variations_009.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.HIGH,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['curious', 'observant'],
      defaultCrossFade: DEFAULT_TIMINGS.IDLE_CROSSFADE,
      duration: 6.2
    }
  },

  // ========================================================================
  // LOCOMOTION - WALKING
  // ========================================================================
  [SemanticKeys.LOCOMOTION_WALK_FORWARD_NORMAL]: {
    feminine: '/animations/animation-library-master/feminine/glb/locomotion/F_Walk_002.glb',
    masculine: '/animations/animation-library-master/masculine/glb/locomotion/M_Walk_002.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.CRITICAL,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['natural', 'standard'],
      defaultCrossFade: DEFAULT_TIMINGS.LOCOMOTION_CROSSFADE,
      duration: 1.2
    }
  },

  [SemanticKeys.LOCOMOTION_WALK_FORWARD_ALT]: {
    feminine: '/animations/animation-library-master/feminine/glb/locomotion/F_Walk_003.glb',
    masculine: '/animations/animation-library-master/masculine/glb/locomotion/M_Walk_001.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.HIGH,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['alternative', 'confident'],
      defaultCrossFade: DEFAULT_TIMINGS.LOCOMOTION_CROSSFADE,
      duration: 1.3
    }
  },

  [SemanticKeys.LOCOMOTION_WALK_BACKWARD]: {
    feminine: '/animations/animation-library-master/feminine/glb/locomotion/F_Walk_Backwards_001.glb',
    masculine: '/animations/animation-library-master/masculine/glb/locomotion/M_Walk_Backwards_001.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.HIGH,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['backward', 'careful'],
      defaultCrossFade: DEFAULT_TIMINGS.LOCOMOTION_CROSSFADE,
      duration: 1.4
    }
  },

  [SemanticKeys.LOCOMOTION_WALK_STRAFE_LEFT]: {
    feminine: '/animations/animation-library-master/feminine/glb/locomotion/F_Walk_Strafe_Left_001.glb',
    masculine: '/animations/animation-library-master/masculine/glb/locomotion/M_Walk_Strafe_Left_002.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.HIGH,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['strafe', 'sidestep'],
      defaultCrossFade: DEFAULT_TIMINGS.LOCOMOTION_CROSSFADE,
      duration: 1.3
    }
  },

  [SemanticKeys.LOCOMOTION_WALK_STRAFE_RIGHT]: {
    feminine: '/animations/animation-library-master/feminine/glb/locomotion/F_Walk_Strafe_Right_001.glb',
    masculine: '/animations/animation-library-master/masculine/glb/locomotion/M_Walk_Strafe_Right_002.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.HIGH,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['strafe', 'sidestep'],
      defaultCrossFade: DEFAULT_TIMINGS.LOCOMOTION_CROSSFADE,
      duration: 1.3
    }
  },

  // ========================================================================
  // LOCOMOTION - JOGGING
  // ========================================================================
  [SemanticKeys.LOCOMOTION_JOG_FORWARD]: {
    feminine: '/animations/animation-library-master/feminine/glb/locomotion/F_Jog_001.glb',
    masculine: '/animations/animation-library-master/masculine/glb/locomotion/M_Jog_001.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.CRITICAL,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['medium-pace', 'steady'],
      defaultCrossFade: DEFAULT_TIMINGS.LOCOMOTION_CROSSFADE,
      duration: 0.8
    }
  },

  [SemanticKeys.LOCOMOTION_JOG_FORWARD_ALT]: {
    feminine: '/animations/animation-library-master/feminine/glb/locomotion/F_Jog_001.glb',
    masculine: '/animations/animation-library-master/masculine/glb/locomotion/M_Jog_003.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.HIGH,
      blendHint: 'locomotion',
      captureGender: 'M',
      styleTags: ['alternative', 'rhythmic'],
      defaultCrossFade: DEFAULT_TIMINGS.LOCOMOTION_CROSSFADE,
      duration: 0.9
    }
  },

  [SemanticKeys.LOCOMOTION_JOG_BACKWARD]: {
    feminine: '/animations/animation-library-master/feminine/glb/locomotion/F_Jog_Backwards_001.glb',
    masculine: '/animations/animation-library-master/masculine/glb/locomotion/M_Jog_Backwards_001.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.HIGH,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['backward', 'cautious'],
      defaultCrossFade: DEFAULT_TIMINGS.LOCOMOTION_CROSSFADE,
      duration: 1.0
    }
  },

  [SemanticKeys.LOCOMOTION_JOG_STRAFE_LEFT]: {
    feminine: '/animations/animation-library-master/feminine/glb/locomotion/F_Jog_Strafe_Left_002.glb',
    masculine: '/animations/animation-library-master/masculine/glb/locomotion/M_Jog_Strafe_Left_001.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.HIGH,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['strafe', 'agile'],
      defaultCrossFade: DEFAULT_TIMINGS.LOCOMOTION_CROSSFADE,
      duration: 0.9
    }
  },

  [SemanticKeys.LOCOMOTION_JOG_STRAFE_RIGHT]: {
    feminine: '/animations/animation-library-master/feminine/glb/locomotion/F_Jog_Strafe_Right_002.glb',
    masculine: '/animations/animation-library-master/masculine/glb/locomotion/M_Jog_Strafe_Right_001.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.HIGH,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['strafe', 'agile'],
      defaultCrossFade: DEFAULT_TIMINGS.LOCOMOTION_CROSSFADE,
      duration: 0.9
    }
  },

  // ========================================================================
  // LOCOMOTION - RUNNING
  // ========================================================================
  [SemanticKeys.LOCOMOTION_RUN_FORWARD]: {
    feminine: '/animations/animation-library-master/feminine/glb/locomotion/F_Run_001.glb',
    masculine: '/animations/animation-library-master/masculine/glb/locomotion/M_Run_001.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.CRITICAL,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['fast', 'athletic'],
      defaultCrossFade: DEFAULT_TIMINGS.LOCOMOTION_CROSSFADE,
      duration: 0.6
    }
  },

  [SemanticKeys.LOCOMOTION_RUN_BACKWARD]: {
    feminine: '/animations/animation-library-master/feminine/glb/locomotion/F_Run_Backwards_001.glb',
    masculine: '/animations/animation-library-master/masculine/glb/locomotion/M_Run_Backwards_002.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.HIGH,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['backward', 'defensive'],
      defaultCrossFade: DEFAULT_TIMINGS.LOCOMOTION_CROSSFADE,
      duration: 0.8
    }
  },

  [SemanticKeys.LOCOMOTION_RUN_STRAFE_LEFT]: {
    feminine: '/animations/animation-library-master/feminine/glb/locomotion/F_Run_Strafe_Left_001.glb',
    masculine: '/animations/animation-library-master/masculine/glb/locomotion/M_Run_Strafe_Left_002.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.HIGH,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['strafe', 'evasive'],
      defaultCrossFade: DEFAULT_TIMINGS.LOCOMOTION_CROSSFADE,
      duration: 0.7
    }
  },

  [SemanticKeys.LOCOMOTION_RUN_STRAFE_RIGHT]: {
    feminine: '/animations/animation-library-master/feminine/glb/locomotion/F_Run_Strafe_Right_001.glb',
    masculine: '/animations/animation-library-master/masculine/glb/locomotion/M_Run_Strafe_Right_002.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.HIGH,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['strafe', 'evasive'],
      defaultCrossFade: DEFAULT_TIMINGS.LOCOMOTION_CROSSFADE,
      duration: 0.7
    }
  },

  // ========================================================================
  // LOCOMOTION - CROUCHING
  // ========================================================================
  [SemanticKeys.LOCOMOTION_CROUCH_WALK]: {
    feminine: '/animations/animation-library-master/feminine/glb/locomotion/F_Crouch_Walk_001.glb',
    masculine: '/animations/animation-library-master/masculine/glb/locomotion/M_Crouch_Walk_003.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.MEDIUM,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['stealth', 'low-profile'],
      defaultCrossFade: DEFAULT_TIMINGS.LOCOMOTION_CROSSFADE,
      duration: 1.6
    }
  },

  [SemanticKeys.LOCOMOTION_CROUCH_WALK_BACKWARD]: {
    feminine: '/animations/animation-library-master/feminine/glb/locomotion/F_CrouchedWalk_Backwards_001.glb',
    masculine: '/animations/animation-library-master/masculine/glb/locomotion/M_CrouchedWalk_Backwards_002.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.MEDIUM,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['stealth', 'retreat'],
      defaultCrossFade: DEFAULT_TIMINGS.LOCOMOTION_CROSSFADE,
      duration: 1.8
    }
  },

  [SemanticKeys.LOCOMOTION_CROUCH_STRAFE_LEFT]: {
    feminine: '/animations/animation-library-master/feminine/glb/locomotion/F_Crouch_Strafe_Left.glb',
    masculine: '/animations/animation-library-master/masculine/glb/locomotion/M_Crouch_Strafe_Left_002.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.MEDIUM,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['stealth', 'tactical'],
      defaultCrossFade: DEFAULT_TIMINGS.LOCOMOTION_CROSSFADE,
      duration: 1.5
    }
  },

  [SemanticKeys.LOCOMOTION_CROUCH_STRAFE_RIGHT]: {
    feminine: '/animations/animation-library-master/feminine/glb/locomotion/F_Crouch_Strafe_Right.glb',
    masculine: '/animations/animation-library-master/masculine/glb/locomotion/M_Crouch_Strafe_Right_002.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.MEDIUM,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['stealth', 'tactical'],
      defaultCrossFade: DEFAULT_TIMINGS.LOCOMOTION_CROSSFADE,
      duration: 1.5
    }
  },

  // ========================================================================
  // LOCOMOTION - JUMPING & FALLING
  // ========================================================================
  [SemanticKeys.LOCOMOTION_JUMP_WALK]: {
    feminine: '/animations/animation-library-master/feminine/glb/locomotion/F_Walk_Jump_001.glb',
    masculine: '/animations/animation-library-master/masculine/glb/locomotion/M_Walk_Jump_001.glb',
    meta: {
      category: 'locomotion',
      loop: false,
      oneShot: true,
      priority: PRIORITY_TIERS.HIGH,
      blendHint: 'transition',
      captureGender: 'F',
      styleTags: ['jump', 'gentle'],
      defaultCrossFade: DEFAULT_TIMINGS.JUMP_TRANSITION,
      duration: 0.8
    }
  },

  [SemanticKeys.LOCOMOTION_JUMP_JOG]: {
    feminine: '/animations/animation-library-master/feminine/glb/locomotion/F_Jog_Jump_Small_001.glb',
    masculine: '/animations/animation-library-master/masculine/glb/locomotion/M_Jog_Jump_001.glb',
    meta: {
      category: 'locomotion',
      loop: false,
      oneShot: true,
      priority: PRIORITY_TIERS.HIGH,
      blendHint: 'transition',
      captureGender: 'F',
      styleTags: ['jump', 'medium'],
      defaultCrossFade: DEFAULT_TIMINGS.JUMP_TRANSITION,
      duration: 1.0
    }
  },

  [SemanticKeys.LOCOMOTION_JUMP_RUN]: {
    feminine: '/animations/animation-library-master/feminine/glb/locomotion/F_Run_Jump_001.glb',
    masculine: '/animations/animation-library-master/masculine/glb/locomotion/M_Run_Jump_001.glb',
    meta: {
      category: 'locomotion',
      loop: false,
      oneShot: true,
      priority: PRIORITY_TIERS.HIGH,
      blendHint: 'transition',
      captureGender: 'F',
      styleTags: ['jump', 'dynamic'],
      defaultCrossFade: DEFAULT_TIMINGS.JUMP_TRANSITION,
      duration: 1.2
    }
  },

  [SemanticKeys.LOCOMOTION_FALL_IDLE]: {
    feminine: '/animations/animation-library-master/feminine/glb/locomotion/F_Falling_Idle_000.glb',
    masculine: '/animations/animation-library-master/masculine/glb/locomotion/M_Falling_Idle_002.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.HIGH,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['fall', 'airborne'],
      defaultCrossFade: DEFAULT_TIMINGS.JUMP_TRANSITION,
      duration: 1.0
    }
  },

  [SemanticKeys.LOCOMOTION_FALL_LOOP]: {
    feminine: '/animations/animation-library-master/feminine/glb/locomotion/F_Falling_Idle_001.glb',
    masculine: '/animations/animation-library-master/masculine/glb/locomotion/M_Falling_Idle_002.glb',
    meta: {
      category: 'locomotion',
      loop: true,
      priority: PRIORITY_TIERS.HIGH,
      blendHint: 'locomotion',
      captureGender: 'F',
      styleTags: ['fall', 'extended'],
      defaultCrossFade: DEFAULT_TIMINGS.JUMP_TRANSITION,
      duration: 2.0
    }
  },

  // ========================================================================
  // EXPRESSIONS - TALKING
  // ========================================================================
  [SemanticKeys.EXPRESSION_TALK_VARIANT_1]: {
    feminine: '/animations/animation-library-master/feminine/glb/expression/F_Talking_Variations_001.glb',
    masculine: '/animations/animation-library-master/masculine/glb/expression/M_Talking_Variations_001.glb',
    meta: {
      category: 'expression',
      loop: true,
      priority: PRIORITY_TIERS.MEDIUM,
      blendHint: 'upper',
      captureGender: 'F',
      styleTags: ['talking', 'casual'],
      defaultCrossFade: DEFAULT_TIMINGS.EXPRESSION_CROSSFADE,
      duration: 3.0,
      intensity: 0.3
    }
  },

  [SemanticKeys.EXPRESSION_TALK_VARIANT_2]: {
    feminine: '/animations/animation-library-master/feminine/glb/expression/F_Talking_Variations_002.glb',
    masculine: '/animations/animation-library-master/masculine/glb/expression/M_Talking_Variations_002.glb',
    meta: {
      category: 'expression',
      loop: true,
      priority: PRIORITY_TIERS.MEDIUM,
      blendHint: 'upper',
      captureGender: 'F',
      styleTags: ['talking', 'animated'],
      defaultCrossFade: DEFAULT_TIMINGS.EXPRESSION_CROSSFADE,
      duration: 3.5,
      intensity: 0.5
    }
  },

  [SemanticKeys.EXPRESSION_TALK_VARIANT_3]: {
    feminine: '/animations/animation-library-master/feminine/glb/expression/F_Talking_Variations_003.glb',
    masculine: '/animations/animation-library-master/masculine/glb/expression/M_Talking_Variations_003.glb',
    meta: {
      category: 'expression',
      loop: true,
      priority: PRIORITY_TIERS.MEDIUM,
      blendHint: 'upper',
      captureGender: 'F',
      styleTags: ['talking', 'expressive'],
      defaultCrossFade: DEFAULT_TIMINGS.EXPRESSION_CROSSFADE,
      duration: 4.0,
      intensity: 0.7
    }
  },

  [SemanticKeys.EXPRESSION_TALK_VARIANT_4]: {
    feminine: '/animations/animation-library-master/feminine/glb/expression/F_Talking_Variations_004.glb',
    masculine: '/animations/animation-library-master/masculine/glb/expression/M_Talking_Variations_004.glb',
    meta: {
      category: 'expression',
      loop: true,
      priority: PRIORITY_TIERS.MEDIUM,
      blendHint: 'upper',
      captureGender: 'F',
      styleTags: ['talking', 'enthusiastic'],
      defaultCrossFade: DEFAULT_TIMINGS.EXPRESSION_CROSSFADE,
      duration: 3.8,
      intensity: 0.8
    }
  },

  [SemanticKeys.EXPRESSION_TALK_VARIANT_5]: {
    feminine: '/animations/animation-library-master/feminine/glb/expression/F_Talking_Variations_005.glb',
    masculine: '/animations/animation-library-master/masculine/glb/expression/M_Talking_Variations_005.glb',
    meta: {
      category: 'expression',
      loop: true,
      priority: PRIORITY_TIERS.MEDIUM,
      blendHint: 'upper',
      captureGender: 'F',
      styleTags: ['talking', 'passionate'],
      defaultCrossFade: DEFAULT_TIMINGS.EXPRESSION_CROSSFADE,
      duration: 4.2,
      intensity: 0.9
    }
  },

  [SemanticKeys.EXPRESSION_TALK_VARIANT_6]: {
    feminine: '/animations/animation-library-master/feminine/glb/expression/F_Talking_Variations_006.glb',
    masculine: '/animations/animation-library-master/masculine/glb/expression/M_Talking_Variations_006.glb',
    meta: {
      category: 'expression',
      loop: true,
      priority: PRIORITY_TIERS.MEDIUM,
      blendHint: 'upper',
      captureGender: 'F',
      styleTags: ['talking', 'dramatic'],
      defaultCrossFade: DEFAULT_TIMINGS.EXPRESSION_CROSSFADE,
      duration: 3.6,
      intensity: 1.0
    }
  },

  // ========================================================================
  // EXPRESSIONS - STANDING EXPRESSIONS (MALE CAPTURED ONLY)
  // ========================================================================
  [SemanticKeys.EXPRESSION_FACE_NEUTRAL]: {
    feminine: '/animations/animation-library-master/feminine/glb/expression/M_Standing_Expressions_001.glb',
    masculine: '/animations/animation-library-master/masculine/glb/expression/M_Standing_Expressions_001.glb',
    meta: {
      category: 'expression',
      loop: true,
      priority: PRIORITY_TIERS.MEDIUM,
      blendHint: 'upper',
      captureGender: 'M',
      styleTags: ['neutral', 'calm'],
      defaultCrossFade: DEFAULT_TIMINGS.EXPRESSION_CROSSFADE,
      duration: 4.0,
      intensity: 0.2
    }
  },

  [SemanticKeys.EXPRESSION_FACE_HAPPY]: {
    feminine: '/animations/animation-library-master/feminine/glb/expression/M_Standing_Expressions_002.glb',
    masculine: '/animations/animation-library-master/masculine/glb/expression/M_Standing_Expressions_002.glb',
    meta: {
      category: 'expression',
      loop: true,
      priority: PRIORITY_TIERS.MEDIUM,
      blendHint: 'upper',
      captureGender: 'M',
      styleTags: ['happy', 'positive'],
      defaultCrossFade: DEFAULT_TIMINGS.EXPRESSION_CROSSFADE,
      duration: 3.5,
      intensity: 0.6
    }
  },

  [SemanticKeys.EXPRESSION_FACE_SURPRISED]: {
    feminine: '/animations/animation-library-master/feminine/glb/expression/M_Standing_Expressions_004.glb',
    masculine: '/animations/animation-library-master/masculine/glb/expression/M_Standing_Expressions_004.glb',
    meta: {
      category: 'expression',
      loop: true,
      priority: PRIORITY_TIERS.MEDIUM,
      blendHint: 'upper',
      captureGender: 'M',
      styleTags: ['surprised', 'shocked'],
      defaultCrossFade: DEFAULT_TIMINGS.EXPRESSION_CROSSFADE,
      duration: 2.5,
      intensity: 0.8
    }
  },

  [SemanticKeys.EXPRESSION_FACE_THINKING]: {
    feminine: '/animations/animation-library-master/feminine/glb/expression/M_Standing_Expressions_005.glb',
    masculine: '/animations/animation-library-master/masculine/glb/expression/M_Standing_Expressions_005.glb',
    meta: {
      category: 'expression',
      loop: true,
      priority: PRIORITY_TIERS.MEDIUM,
      blendHint: 'upper',
      captureGender: 'M',
      styleTags: ['thinking', 'contemplative'],
      defaultCrossFade: DEFAULT_TIMINGS.EXPRESSION_CROSSFADE,
      duration: 5.0,
      intensity: 0.4
    }
  },

  [SemanticKeys.EXPRESSION_FACE_CONFUSED]: {
    feminine: '/animations/animation-library-master/feminine/glb/expression/M_Standing_Expressions_006.glb',
    masculine: '/animations/animation-library-master/masculine/glb/expression/M_Standing_Expressions_006.glb',
    meta: {
      category: 'expression',
      loop: true,
      priority: PRIORITY_TIERS.MEDIUM,
      blendHint: 'upper',
      captureGender: 'M',
      styleTags: ['confused', 'puzzled'],
      defaultCrossFade: DEFAULT_TIMINGS.EXPRESSION_CROSSFADE,
      duration: 3.8,
      intensity: 0.5
    }
  },

  [SemanticKeys.EXPRESSION_FACE_EXCITED]: {
    feminine: '/animations/animation-library-master/feminine/glb/expression/M_Standing_Expressions_007.glb',
    masculine: '/animations/animation-library-master/masculine/glb/expression/M_Standing_Expressions_007.glb',
    meta: {
      category: 'expression',
      loop: true,
      priority: PRIORITY_TIERS.MEDIUM,
      blendHint: 'upper',
      captureGender: 'M',
      styleTags: ['excited', 'energetic'],
      defaultCrossFade: DEFAULT_TIMINGS.EXPRESSION_CROSSFADE,
      duration: 4.2,
      intensity: 0.9
    }
  },

  // ========================================================================
  // EMOTES - DANCES
  // ========================================================================
  [SemanticKeys.EMOTE_DANCE_CASUAL_1]: {
    feminine: '/animations/animation-library-master/feminine/glb/dance/F_Dances_001.glb',
    masculine: '/animations/animation-library-master/masculine/glb/dance/M_Dances_001.glb',
    meta: {
      category: 'emote',
      loop: true,
      priority: PRIORITY_TIERS.LOW,
      blendHint: 'fullbody',
      captureGender: 'F',
      styleTags: ['dance', 'casual', 'social'],
      defaultCrossFade: DEFAULT_TIMINGS.EMOTE_FADE_IN,
      duration: 8.0
    }
  },

  [SemanticKeys.EMOTE_DANCE_CASUAL_2]: {
    feminine: '/animations/animation-library-master/feminine/glb/dance/F_Dances_004.glb',
    masculine: '/animations/animation-library-master/masculine/glb/dance/M_Dances_002.glb',
    meta: {
      category: 'emote',
      loop: true,
      priority: PRIORITY_TIERS.LOW,
      blendHint: 'fullbody',
      captureGender: 'F',
      styleTags: ['dance', 'casual', 'relaxed'],
      defaultCrossFade: DEFAULT_TIMINGS.EMOTE_FADE_IN,
      duration: 6.5
    }
  },

  [SemanticKeys.EMOTE_DANCE_ENERGETIC_1]: {
    feminine: '/animations/animation-library-master/feminine/glb/dance/F_Dances_005.glb',
    masculine: '/animations/animation-library-master/masculine/glb/dance/M_Dances_003.glb',
    meta: {
      category: 'emote',
      loop: true,
      priority: PRIORITY_TIERS.LOW,
      blendHint: 'fullbody',
      captureGender: 'F',
      styleTags: ['dance', 'energetic', 'upbeat'],
      defaultCrossFade: DEFAULT_TIMINGS.EMOTE_FADE_IN,
      duration: 7.2
    }
  },

  [SemanticKeys.EMOTE_DANCE_ENERGETIC_2]: {
    feminine: '/animations/animation-library-master/feminine/glb/dance/F_Dances_006.glb',
    masculine: '/animations/animation-library-master/masculine/glb/dance/M_Dances_004.glb',
    meta: {
      category: 'emote',
      loop: true,
      priority: PRIORITY_TIERS.LOW,
      blendHint: 'fullbody',
      captureGender: 'F',
      styleTags: ['dance', 'energetic', 'dynamic'],
      defaultCrossFade: DEFAULT_TIMINGS.EMOTE_FADE_IN,
      duration: 9.1
    }
  },

  [SemanticKeys.EMOTE_DANCE_RHYTHMIC_1]: {
    feminine: '/animations/animation-library-master/feminine/glb/dance/F_Dances_007.glb',
    masculine: '/animations/animation-library-master/masculine/glb/dance/M_Dances_005.glb',
    meta: {
      category: 'emote',
      loop: true,
      priority: PRIORITY_TIERS.LOW,
      blendHint: 'fullbody',
      captureGender: 'F',
      styleTags: ['dance', 'rhythmic', 'groove'],
      defaultCrossFade: DEFAULT_TIMINGS.EMOTE_FADE_IN,
      duration: 8.8
    }
  },

  [SemanticKeys.EMOTE_DANCE_RHYTHMIC_2]: {
    feminine: '/animations/animation-library-master/feminine/glb/dance/F_Dances_001.glb',
    masculine: '/animations/animation-library-master/masculine/glb/dance/M_Dances_006.glb',
    meta: {
      category: 'emote',
      loop: true,
      priority: PRIORITY_TIERS.LOW,
      blendHint: 'fullbody',
      captureGender: 'M',
      styleTags: ['dance', 'rhythmic', 'smooth'],
      defaultCrossFade: DEFAULT_TIMINGS.EMOTE_FADE_IN,
      duration: 7.5
    }
  },

  [SemanticKeys.EMOTE_DANCE_FREESTYLE_1]: {
    feminine: '/animations/animation-library-master/feminine/glb/dance/F_Dances_005.glb',
    masculine: '/animations/animation-library-master/masculine/glb/dance/M_Dances_007.glb',
    meta: {
      category: 'emote',
      loop: true,
      priority: PRIORITY_TIERS.LOW,
      blendHint: 'fullbody',
      captureGender: 'M',
      styleTags: ['dance', 'freestyle', 'creative'],
      defaultCrossFade: DEFAULT_TIMINGS.EMOTE_FADE_IN,
      duration: 10.2
    }
  },

  [SemanticKeys.EMOTE_DANCE_FREESTYLE_2]: {
    feminine: '/animations/animation-library-master/feminine/glb/dance/F_Dances_006.glb',
    masculine: '/animations/animation-library-master/masculine/glb/dance/M_Dances_008.glb',
    meta: {
      category: 'emote',
      loop: true,
      priority: PRIORITY_TIERS.LOW,
      blendHint: 'fullbody',
      captureGender: 'M',
      styleTags: ['dance', 'freestyle', 'expressive'],
      defaultCrossFade: DEFAULT_TIMINGS.EMOTE_FADE_IN,
      duration: 11.5
    }
  }
};

/**
 * Export the registry as default
 */
export default ANIMATION_REGISTRY;

/**
 * Registry metadata
 */
export const REGISTRY_INFO = {
  version: '1.0.0',
  totalAnimations: Object.keys(ANIMATION_REGISTRY).length,
  categories: {
    locomotion: getAnimationsByCategory(ANIMATION_REGISTRY, 'locomotion').length,
    expression: getAnimationsByCategory(ANIMATION_REGISTRY, 'expression').length,
    emote: getAnimationsByCategory(ANIMATION_REGISTRY, 'emote').length,
    base: getAnimationsByCategory(ANIMATION_REGISTRY, 'base').length
  },
  lastUpdated: '2024-12-19'
} as const;

// Helper function for registry info
function getAnimationsByCategory(registry: AnimationRegistry, category: string): string[] {
  return Object.keys(registry).filter(key => registry[key].meta.category === category);
}
