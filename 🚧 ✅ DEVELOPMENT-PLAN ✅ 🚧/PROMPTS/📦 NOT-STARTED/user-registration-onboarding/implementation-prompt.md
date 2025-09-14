# User Registration & Onboarding System - Comprehensive Development Prompt

## CONTEXT
You are implementing a comprehensive user registration, authentication, and onboarding system for the Descendants metaverse that provides seamless user journey from first visit to fully engaged participant. The system integrates with Supabase authentication, provides progressive onboarding experiences, manages user profiles and preferences, and creates smooth transitions into the living metaverse world with AI simulants and social dynamics.

Current Architecture:
- Supabase authentication infrastructure with browser client
- Next.js 15 with App Router and TypeScript
- React 19 with concurrent features
- ShadCN/UI components with Tailwind CSS and Axiom Design System
- Existing world store and AI simulant systems
- Communication and social dynamics established

## OBJECTIVE
Create a comprehensive user registration and onboarding system that provides intuitive account creation, progressive skill introduction, personalized avatar setup, social integration guidance, and smooth transitions into the metaverse experience while maintaining the ethereal, cinematic aesthetic of the Axiom Design System.

## REQUIREMENTS
- Seamless user registration with multiple authentication methods
- Progressive onboarding with skill-based tutorials and guidance
- Comprehensive user profile and preference management
- Avatar customization and personality selection systems
- Social integration and relationship building guidance
- Accessibility compliance and multi-device responsiveness
- Integration with existing AI simulant and world systems
- Performance optimization for smooth user experience

## USER REGISTRATION & ONBOARDING ARCHITECTURE
```typescript
// Core user registration system
interface UserRegistrationSystem {
  authenticationManager: AuthenticationManager
  onboardingEngine: OnboardingEngine
  userProfileManager: UserProfileManager
  avatarCustomization: AvatarCustomizationSystem
  
  // User journey management
  journeyOrchestrator: UserJourneyOrchestrator
  progressTracker: OnboardingProgressTracker
  tutorialSystem: InteractiveTutorialSystem
  
  // Integration systems
  worldIntegration: WorldIntegrationManager
  socialIntegration: SocialIntegrationManager
  accessibilityManager: AccessibilityManager
}

interface UserRegistrationFlow {
  id: string
  flowType: RegistrationFlowType
  currentStep: RegistrationStep
  totalSteps: number
  
  // User information
  userInfo: UserRegistrationInfo
  preferences: UserPreferences
  avatarConfig: AvatarConfiguration
  personalityProfile: PersonalitySelectionProfile
  
  // Progress tracking
  completedSteps: CompletedStep[]
  skippedSteps: SkippedStep[]
  timeSpent: TimeSpentData
  assistanceUsed: AssistanceUsage[]
  
  // Customization
  customizations: OnboardingCustomization[]
  accessibilitySettings: AccessibilitySettings
  deviceOptimization: DeviceOptimization
}

interface OnboardingExperience {
  id: string
  name: string
  description: string
  targetAudience: TargetAudience
  
  // Experience structure
  phases: OnboardingPhase[]
  tutorials: InteractiveTutorial[]
  checkpoints: ProgressCheckpoint[]
  assessments: SkillAssessment[]
  
  // Personalization
  adaptiveContent: AdaptiveContent[]
  personalizedPath: PersonalizedPath
  difficultyAdjustment: DifficultyAdjustment
  
  // Integration
  worldIntroduction: WorldIntroductionSequence
  aiSimulantIntroduction: AISimulantIntroductionSequence
  socialIntegration: SocialIntegrationSequence
}

type RegistrationFlowType = 
  | 'quick_start' | 'comprehensive' | 'guided_discovery'
  | 'accessibility_focused' | 'social_focused' | 'creative_focused'
  | 'technical_focused' | 'casual_explorer' | 'advanced_user'
```

## IMPLEMENTATION TASKS

### 1. Authentication Manager
Create `systems/auth/AuthenticationManager.tsx` with:
```typescript
interface AuthenticationManagerProps {
  enableSocialAuth: boolean
  enableAnonymousAuth: boolean
  enableEmailAuth: boolean
  enableMagicLink: boolean
  requireEmailVerification: boolean
  enableMultiFactorAuth: boolean
  
  onAuthSuccess?: (user: AuthenticatedUser) => void
  onAuthError?: (error: AuthError) => void
  onRegistrationComplete?: (user: RegisteredUser) => void
}

interface AuthenticationManager {
  // Registration methods
  registerWithEmail: (email: string, password: string, userData: UserRegistrationData) => Promise<RegistrationResult>
  registerWithSocial: (provider: SocialProvider, userData: UserRegistrationData) => Promise<RegistrationResult>
  registerAnonymously: (deviceData: DeviceData) => Promise<AnonymousRegistrationResult>
  
  // Authentication methods
  signInWithEmail: (email: string, password: string) => Promise<AuthenticationResult>
  signInWithSocial: (provider: SocialProvider) => Promise<AuthenticationResult>
  signInWithMagicLink: (email: string) => Promise<MagicLinkResult>
  
  // Account management
  verifyEmail: (token: string) => Promise<VerificationResult>
  resetPassword: (email: string) => Promise<PasswordResetResult>
  updatePassword: (currentPassword: string, newPassword: string) => Promise<PasswordUpdateResult>
  
  // Profile management
  updateUserProfile: (updates: UserProfileUpdate) => Promise<ProfileUpdateResult>
  deleteAccount: (confirmation: AccountDeletionConfirmation) => Promise<DeletionResult>
  exportUserData: () => Promise<UserDataExport>
  
  // Security features
  enableTwoFactorAuth: (method: TwoFactorMethod) => Promise<TwoFactorSetupResult>
  validateSession: () => Promise<SessionValidationResult>
  refreshSession: () => Promise<SessionRefreshResult>
}

interface UserRegistrationData {
  // Basic information
  email: string
  username: string
  displayName: string
  
  // Optional information
  firstName?: string
  lastName?: string
  dateOfBirth?: Date
  location?: UserLocation
  
  // Preferences
  communicationPreferences: CommunicationPreferences
  privacySettings: PrivacySettings
  accessibilityNeeds: AccessibilityNeeds
  
  // Metaverse preferences
  avatarPreferences: AvatarPreferences
  interactionStyle: InteractionStyle
  experienceLevel: ExperienceLevel
  interests: UserInterest[]
}

interface RegistrationResult {
  success: boolean
  user?: AuthenticatedUser
  error?: RegistrationError
  nextStep: RegistrationNextStep
  
  // Onboarding preparation
  onboardingFlow: OnboardingFlow
  recommendedTutorials: RecommendedTutorial[]
  personalizedExperience: PersonalizedExperience
}
```

### 2. Progressive Onboarding Engine
Create `systems/onboarding/OnboardingEngine.tsx` with:
```typescript
interface OnboardingEngineProps {
  userProfile: UserProfile
  experienceLevel: ExperienceLevel
  enableSkipOptions: boolean
  enablePersonalization: boolean
  adaptToDifficulty: boolean
  trackProgress: boolean
  
  onPhaseComplete?: (phase: OnboardingPhase, results: PhaseResults) => void
  onOnboardingComplete?: (completion: OnboardingCompletion) => void
  onUserNeedsHelp?: (helpRequest: HelpRequest) => void
}

interface OnboardingEngine {
  // Onboarding orchestration
  startOnboardingExperience: (user: User, selectedFlow: OnboardingFlowType) => OnboardingSession
  createPersonalizedPath: (user: User, assessmentResults: AssessmentResult[]) => PersonalizedOnboardingPath
  adaptOnboardingDifficulty: (session: OnboardingSession, performance: PerformanceData) => DifficultyAdaptation
  
  // Tutorial management
  launchInteractiveTutorial: (tutorial: Tutorial, context: TutorialContext) => TutorialSession
  createContextualHelp: (currentAction: UserAction, context: ActionContext) => ContextualHelp
  provideSmartAssistance: (userStruggle: UserStruggle, context: StruggleContext) => SmartAssistance
  
  // Progress tracking
  trackUserProgress: (session: OnboardingSession, milestones: Milestone[]) => ProgressUpdate
  assessUserSkills: (skillArea: SkillArea, interactions: UserInteraction[]) => SkillAssessment
  generateProgressReport: (session: OnboardingSession) => ProgressReport
  
  // Experience optimization
  optimizeForDevice: (device: DeviceInfo, session: OnboardingSession) => DeviceOptimizedExperience
  personalizeContent: (user: User, preferences: ContentPreferences) => PersonalizedContent
  adaptToAccessibilityNeeds: (needs: AccessibilityNeeds, experience: OnboardingExperience) => AccessibleExperience
}

interface OnboardingPhase {
  id: string
  name: string
  description: string
  estimatedDuration: number
  
  // Phase content
  objectives: LearningObjective[]
  activities: OnboardingActivity[]
  assessments: SkillAssessment[]
  checkpoints: ProgressCheckpoint[]
  
  // Adaptive elements
  difficultyLevels: DifficultyLevel[]
  personalizations: PhasePersonalization[]
  alternatives: AlternativeContent[]
  
  // Integration
  worldElements: WorldElementIntroduction[]
  aiInteractions: AIInteractionIntroduction[]
  socialElements: SocialElementIntroduction[]
}

interface InteractiveTutorial {
  id: string
  title: string
  description: string
  category: TutorialCategory
  
  // Tutorial structure
  steps: TutorialStep[]
  interactiveElements: InteractiveElement[]
  practiceExercises: PracticeExercise[]
  assessments: TutorialAssessment[]
  
  // Guidance system
  hints: TutorialHint[]
  helpSystem: HelpSystem
  errorHandling: ErrorGuidance[]
  
  // Customization
  adaptiveGuidance: AdaptiveGuidance
  accessibilitySupport: AccessibilitySupport
  deviceOptimization: DeviceOptimization
}

type TutorialCategory = 
  | 'world_navigation' | 'avatar_control' | 'ai_interaction'
  | 'social_features' | 'creative_tools' | 'communication'
  | 'safety_privacy' | 'customization' | 'advanced_features'
```

### 3. Avatar Customization System
Create `components/onboarding/AvatarCustomizationSystem.tsx` with:
```typescript
interface AvatarCustomizationSystemProps {
  user: User
  availableOptions: AvatarCustomizationOptions
  enableAdvancedCustomization: boolean
  enablePresets: boolean
  enableAIAssistance: boolean
  enableRealTimePreview: boolean
  
  onCustomizationComplete?: (avatar: CustomizedAvatar) => void
  onPresetSelected?: (preset: AvatarPreset) => void
  onAIRecommendation?: (recommendation: AIRecommendation) => void
}

interface AvatarCustomizationSystem {
  // Customization management
  initializeCustomization: (user: User, preferences: AvatarPreferences) => CustomizationSession
  applyCustomization: (avatar: Avatar, customization: AvatarCustomization) => CustomizedAvatar
  previewCustomization: (customization: AvatarCustomization) => AvatarPreview
  
  // Preset system
  loadAvatarPresets: (category: PresetCategory, style: AvatarStyle) => AvatarPreset[]
  createCustomPreset: (avatar: CustomizedAvatar, presetName: string) => CustomPreset
  sharePreset: (preset: AvatarPreset, sharingSettings: SharingSettings) => PresetSharingResult
  
  // AI assistance
  generateAIRecommendations: (user: User, preferences: StylePreferences) => AIAvatarRecommendation[]
  adaptToPersonality: (personality: PersonalityProfile, baseAvatar: Avatar) => PersonalityAdaptedAvatar
  suggestImprovements: (currentAvatar: Avatar, usageData: AvatarUsageData) => ImprovementSuggestion[]
  
  // Advanced features
  enableAdvancedCustomization: (user: User, avatar: Avatar) => AdvancedCustomizationInterface
  createAnimationPresets: (avatar: Avatar, animationStyle: AnimationStyle) => AnimationPreset[]
  integrateVoicePersonality: (avatar: Avatar, voiceProfile: VoiceProfile) => VoiceIntegratedAvatar
}

interface AvatarCustomization {
  // Physical appearance
  physicalFeatures: PhysicalFeature[]
  clothing: ClothingOptions
  accessories: Accessory[]
  colors: ColorScheme
  
  // Personality expression
  personalityTraits: VisualPersonalityTrait[]
  emotionalExpression: EmotionalExpressionSettings
  gesturePreferences: GesturePreferences
  voiceCharacteristics: VoiceCharacteristics
  
  // Behavioral settings
  movementStyle: MovementStyle
  interactionStyle: InteractionStyle
  socialBehavior: SocialBehaviorSettings
  
  // Technical settings
  performanceOptimization: PerformanceSettings
  accessibilityFeatures: AccessibilityFeature[]
  deviceAdaptation: DeviceAdaptationSettings
}

interface PersonalitySelectionProfile {
  // Core personality
  selectedArchetype: PersonalityArchetype
  traitAdjustments: TraitAdjustment[]
  customizations: PersonalityCustomization[]
  
  // Social preferences
  socialStyle: SocialStyle
  communicationPreferences: CommunicationStyle
  leadershipInclination: LeadershipInclination
  
  // Creative preferences
  creativeStyle: CreativeStyle
  artisticInclinations: ArtisticInclination[]
  culturalInterests: CulturalInterest[]
  
  // World interaction
  explorationStyle: ExplorationStyle
  buildingPreferences: BuildingPreference[]
  collaborationStyle: CollaborationStyle
}
```

### 4. World Integration Manager
Create `systems/integration/WorldIntegrationManager.ts` with:
```typescript
interface WorldIntegrationManager {
  // Smooth world entry
  prepareWorldEntry: (user: User, avatar: CustomizedAvatar) => WorldEntryPreparation
  introduceToWorld: (user: User, entryPoint: WorldEntryPoint) => WorldIntroductionSequence
  facilitateFirstInteractions: (user: User, nearbyEntities: Entity[]) => FirstInteractionFacilitation
  
  // AI simulant introduction
  introduceToAISimulants: (user: User, simulants: AISimulant[]) => AIIntroductionSequence
  facilitateAIConversation: (user: User, simulant: AISimulant) => ConversationFacilitation
  explainAICapabilities: (user: User, context: AICapabilityContext) => AICapabilityExplanation
  
  // Social integration
  introduceSocialFeatures: (user: User, socialContext: SocialContext) => SocialFeatureIntroduction
  facilitateUserConnections: (user: User, compatibleUsers: User[]) => ConnectionFacilitation
  guideSocialEtiquette: (user: User, socialSituation: SocialSituation) => EtiquetteGuidance
  
  // World mechanics
  explainWorldMechanics: (user: User, mechanicType: WorldMechanicType) => MechanicExplanation
  guideCreativeTools: (user: User, toolContext: ToolContext) => CreativeToolGuidance
  introduceCommunicationSystems: (user: User, commSystem: CommunicationSystem) => CommunicationIntroduction
}

interface UserJourneyOrchestrator {
  // Journey planning
  createPersonalizedJourney: (user: User, goals: UserGoal[]) => PersonalizedUserJourney
  adaptJourneyToProgress: (journey: UserJourney, progressData: ProgressData) => AdaptedJourney
  optimizeForEngagement: (journey: UserJourney, engagementData: EngagementData) => OptimizedJourney
  
  // Milestone management
  defineJourneyMilestones: (journey: UserJourney, objectives: LearningObjective[]) => JourneyMilestone[]
  trackMilestoneProgress: (user: User, milestones: JourneyMilestone[]) => MilestoneProgress
  celebrateMilestoneAchievements: (achievement: MilestoneAchievement) => CelebrationExperience
  
  // Retention and engagement
  identifyDropOffRisks: (user: User, behaviorData: UserBehaviorData) => DropOffRisk[]
  implementRetentionStrategies: (risks: DropOffRisk[]) => RetentionStrategy[]
  personalizeRetentionEfforts: (user: User, preferences: RetentionPreferences) => PersonalizedRetention
}
```

### 5. Accessibility and Responsiveness Manager
Create `systems/accessibility/AccessibilityManager.ts` with:
```typescript
interface AccessibilityManager {
  // Accessibility assessment
  assessAccessibilityNeeds: (user: User, deviceInfo: DeviceInfo) => AccessibilityAssessment
  configureAccessibilityFeatures: (needs: AccessibilityNeeds) => AccessibilityConfiguration
  validateAccessibilityCompliance: (interface: UserInterface) => ComplianceValidation
  
  // Visual accessibility
  implementVisualAccessibility: (needs: VisualAccessibilityNeeds) => VisualAccessibilityFeatures
  configureColorBlindnessSupport: (colorBlindnessType: ColorBlindnessType) => ColorAccessibilityConfig
  enableHighContrastMode: (contrastNeeds: ContrastNeeds) => HighContrastConfiguration
  
  // Motor accessibility
  implementMotorAccessibility: (needs: MotorAccessibilityNeeds) => MotorAccessibilityFeatures
  configureInputAlternatives: (inputLimitations: InputLimitation[]) => InputAlternativeConfig
  enableAssistiveControls: (controlNeeds: AssistiveControlNeeds) => AssistiveControlConfiguration
  
  // Cognitive accessibility
  implementCognitiveSupport: (needs: CognitiveAccessibilityNeeds) => CognitiveSupport
  simplifyComplexInterfaces: (complexity: ComplexityLevel) => SimplifiedInterface
  enableFocusAssistance: (focusNeeds: FocusAssistanceNeeds) => FocusAssistanceConfiguration
  
  // Multi-device responsiveness
  optimizeForDevice: (device: DeviceInfo, experience: UserExperience) => DeviceOptimizedExperience
  ensureCrossDeviceContinuity: (user: User, devices: Device[]) => CrossDeviceContinuity
  adaptToNetworkConditions: (networkInfo: NetworkInfo) => NetworkAdaptedExperience
}

interface UserExperienceOptimizer {
  // Performance optimization
  optimizeForUserDevice: (device: DeviceInfo, userProfile: UserProfile) => DeviceOptimization
  adaptToNetworkQuality: (networkQuality: NetworkQuality) => NetworkOptimization
  balanceQualityAndPerformance: (userPreferences: QualityPreferences) => QualityPerformanceBalance
  
  // UI/UX optimization
  personalizeUserInterface: (user: User, usagePatterns: UsagePattern[]) => PersonalizedUI
  optimizeForUsability: (usabilityData: UsabilityData) => UsabilityOptimization
  enhanceUserFlow: (userFlow: UserFlow, frictionPoints: FrictionPoint[]) => OptimizedUserFlow
  
  // Engagement optimization
  identifyEngagementOpportunities: (user: User, behaviorData: BehaviorData) => EngagementOpportunity[]
  implementEngagementStrategies: (opportunities: EngagementOpportunity[]) => EngagementStrategy[]
  measureEngagementEffectiveness: (strategies: EngagementStrategy[]) => EngagementEffectiveness
}
```

### 6. User Profile and Preferences System
Create `systems/user/UserProfileManager.ts` with:
- Comprehensive user profile management and customization
- Preference synchronization across devices and sessions  
- Privacy control and data management systems
- Profile sharing and social integration features
- Advanced analytics and user behavior insights
- Cross-platform preference persistence and migration

## SUCCESS CRITERIA
- [ ] Seamless user registration with multiple authentication options
- [ ] Progressive onboarding adapts to user skill level and preferences
- [ ] Avatar customization provides rich personalization options
- [ ] World integration creates smooth transitions from onboarding to gameplay
- [ ] Accessibility features ensure inclusive user experience
- [ ] Performance maintains optimal levels across all devices
- [ ] User retention improves through personalized journey orchestration
- [ ] Integration enhances existing AI simulant and world systems

## PERFORMANCE SPECIFICATIONS
```typescript
const PERFORMANCE_TARGETS = {
  registration: {
    registrationPageLoadTime: 1000,    // ms for registration page load
    authenticationTime: 2000,          // ms for authentication completion
    profileCreationTime: 3000,         // ms for profile setup
    avatarCustomizationTime: 5000,     // ms for avatar customization
    onboardingStartTime: 1500          // ms to start onboarding
  },
  
  onboarding: {
    tutorialLoadTime: 800,             // ms for tutorial loading
    phaseTransitionTime: 500,          // ms for phase transitions
    interactiveElementResponse: 100,   // ms for interactive element response
    progressTrackingLatency: 50,       // ms for progress updates
    adaptationTime: 200                // ms for difficulty adaptation
  },
  
  worldIntegration: {
    worldEntryTime: 3000,              // ms for world entry preparation
    aiIntroductionTime: 2000,          // ms for AI simulant introduction
    socialIntegrationTime: 1500,       // ms for social feature introduction
    mechanicExplanationTime: 1000,     // ms for world mechanic explanation
    firstInteractionTime: 500          // ms for first interaction setup
  },
  
  accessibility: {
    accessibilityAssessmentTime: 300,  // ms for accessibility assessment
    featureConfigurationTime: 500,     // ms for accessibility configuration
    deviceOptimizationTime: 400,       // ms for device optimization
    networkAdaptationTime: 200,        // ms for network adaptation
    uiPersonalizationTime: 300         // ms for UI personalization
  }
}
```

## ERROR HANDLING STRATEGY
```typescript
const ERROR_HANDLING = {
  registrationFailure: {
    provideClearErrorMessages: true,
    offerAlternativeOptions: true,
    maintainProgressWhenPossible: true,
    enableOfflineRegistration: true
  },
  
  onboardingInterruption: {
    saveProgressAutomatically: true,
    enableSeamlessResumption: true,
    offerSkipOptions: true,
    provideCatchUpSummaries: true
  },
  
  avatarCustomizationError: {
    fallbackToDefaultOptions: true,
    savePartialCustomizations: true,
    enableLaterCustomization: true,
    provideTechnicalSupport: true
  },
  
  worldIntegrationIssues: {
    gracefulDegradation: true,
    alternativeIntroductionPaths: true,
    supportAssistedIntegration: true,
    enableRetryMechanisms: true
  }
}
```

## TESTING VALIDATION

### Unit Tests
- [ ] Authentication flow validation and security testing
- [ ] Onboarding progression logic and adaptation algorithms
- [ ] Avatar customization functionality and data persistence
- [ ] Accessibility feature implementation and compliance
- [ ] User profile management and preference synchronization
- [ ] Performance optimization effectiveness measurement

### Integration Tests
- [ ] End-to-end user registration and onboarding flow
- [ ] World integration and AI simulant introduction sequences
- [ ] Cross-device continuity and preference synchronization
- [ ] Accessibility feature integration with world systems
- [ ] Social integration and connection facilitation
- [ ] Performance impact on existing metaverse systems

### User Experience Tests
- [ ] Usability testing with diverse user groups
- [ ] Accessibility compliance validation with assistive technologies
- [ ] Cross-device and cross-platform experience consistency
- [ ] Onboarding effectiveness and user retention measurement
- [ ] Avatar customization satisfaction and engagement assessment
- [ ] World integration smoothness and learning curve evaluation

## FILES TO CREATE
```
systems/auth/
├── AuthenticationManager.tsx        # Core authentication system
├── RegistrationFlow.tsx            # Registration flow management
├── SessionManager.ts               # Session and security management
├── UserAccountManager.ts           # Account management features
└── __tests__/
    ├── AuthenticationManager.test.tsx
    ├── RegistrationFlow.test.tsx
    └── SessionManager.test.ts

systems/onboarding/
├── OnboardingEngine.tsx            # Progressive onboarding system
├── TutorialSystem.tsx              # Interactive tutorial management
├── ProgressTracker.ts              # Onboarding progress tracking
├── PersonalizationEngine.ts        # Onboarding personalization
└── __tests__/
    ├── OnboardingEngine.test.tsx
    ├── TutorialSystem.test.tsx
    └── ProgressTracker.test.ts

components/onboarding/
├── AvatarCustomizationSystem.tsx   # Avatar customization interface
├── OnboardingWizard.tsx            # Main onboarding wizard
├── TutorialOverlay.tsx             # Tutorial overlay components
├── ProgressIndicator.tsx           # Progress visualization
└── __tests__/
    ├── AvatarCustomizationSystem.test.tsx
    ├── OnboardingWizard.test.tsx
    └── TutorialOverlay.test.tsx

systems/integration/
├── WorldIntegrationManager.ts      # World integration system
├── AIIntroductionSystem.ts         # AI simulant introduction
├── SocialIntegrationManager.ts     # Social feature integration
├── UserJourneyOrchestrator.ts      # User journey management
└── __tests__/
    ├── WorldIntegrationManager.test.ts
    ├── AIIntroductionSystem.test.ts
    └── SocialIntegrationManager.test.ts

systems/accessibility/
├── AccessibilityManager.ts         # Accessibility feature management
├── DeviceOptimization.ts          # Device-specific optimizations
├── UserExperienceOptimizer.ts     # UX optimization system
├── ResponsivenessManager.ts        # Multi-device responsiveness
└── __tests__/
    ├── AccessibilityManager.test.ts
    ├── DeviceOptimization.test.ts
    └── UserExperienceOptimizer.test.ts

systems/user/
├── UserProfileManager.ts           # User profile management
├── PreferenceManager.ts           # User preference system
├── PrivacyManager.ts              # Privacy and data management
├── UserAnalytics.ts               # User behavior analytics
└── __tests__/
    ├── UserProfileManager.test.ts
    ├── PreferenceManager.test.ts
    └── PrivacyManager.test.ts

store/
├── authStore.ts                    # Authentication state management
├── onboardingStore.ts             # Onboarding state management
├── userProfileStore.ts            # User profile state
└── __tests__/
    ├── authStore.test.ts
    ├── onboardingStore.test.ts
    └── userProfileStore.test.ts

types/
├── auth.ts                        # Authentication types
├── onboarding.ts                  # Onboarding types
├── user-profile.ts                # User profile types
├── accessibility.ts               # Accessibility types
└── world-integration.ts           # World integration types

components/auth/
├── RegistrationForm.tsx           # Registration form components
├── LoginForm.tsx                  # Login form components
├── SocialAuthButtons.tsx          # Social authentication buttons
├── PasswordResetForm.tsx          # Password reset interface
└── __tests__/
    ├── RegistrationForm.test.tsx
    ├── LoginForm.test.tsx
    └── SocialAuthButtons.test.tsx

examples/
├── authenticationExample.tsx       # Authentication examples
├── onboardingExample.tsx          # Onboarding examples
├── avatarCustomizationExample.tsx # Avatar customization examples
└── worldIntegrationExample.tsx    # World integration examples
```

## INTEGRATION REQUIREMENTS
- Integrate with existing Supabase authentication infrastructure
- Connect with current AI simulant personality and social systems
- Use existing world store and state management patterns
- Support current communication and interaction systems
- Maintain compatibility with existing UI/UX and Axiom Design System
- Follow established performance monitoring and optimization practices
- Integrate with existing accessibility and multi-device support
- Support existing testing and development workflow

## EXPECTED OUTPUT
A comprehensive user registration and onboarding system that:
1. **Provides seamless account creation** with multiple authentication methods and security
2. **Delivers progressive onboarding experiences** that adapt to user skill and preferences
3. **Enables rich avatar customization** with personality integration and real-time preview
4. **Facilitates smooth world integration** with AI simulant and social feature introduction
5. **Ensures accessibility compliance** with comprehensive support for diverse needs
6. **Optimizes for all devices** with responsive design and performance adaptation
7. **Tracks user journey progress** with intelligent milestone and engagement management
8. **Maintains high performance** with optimized loading and interaction times
9. **Integrates seamlessly** with existing metaverse systems and AI capabilities
10. **Creates exceptional user experiences** that drive engagement and retention

The implementation should establish the foundation for user acquisition and retention in the Descendants metaverse, creating smooth onboarding journeys that transform new visitors into engaged participants in the living digital world with AI simulants and rich social dynamics.
