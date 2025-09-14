# Feature Flags & Experimentation System - Comprehensive Development Prompt

## CONTEXT
You are implementing a comprehensive feature flags and experimentation system for the Descendants metaverse that enables progressive feature rollouts, A/B testing, and real-time configuration management across all system components. This system must support dynamic feature toggling, user segmentation, and experimentation analytics while maintaining performance and reliability.

Current Architecture:
- Next.js 15 with React 19 and TypeScript 5
- Zustand state management with real-time synchronization
- AI simulants with configurable behaviors and capabilities
- Multi-user collaborative world building with performance optimization
- Modular component architecture with cross-system integrations

## OBJECTIVE
Create a robust, performant feature flag system that enables safe feature deployment, sophisticated experimentation, and real-time configuration management while providing comprehensive analytics and maintaining sub-millisecond flag evaluation performance.

## REQUIREMENTS
- Real-time feature flag evaluation with <1ms response time
- User segmentation with demographic, behavioral, and geographic targeting
- A/B testing framework with statistical significance testing
- Progressive rollout capabilities with automated rollback
- Integration with all system components (AI, 3D rendering, UI, etc.)
- Analytics dashboard for experiment tracking and results
- Configuration management with validation and approval workflows
- Performance monitoring and impact measurement

## FEATURE FLAGS ARCHITECTURE
```typescript
interface FeatureFlagSystem {
  // Core flag management
  flagEvaluator: FlagEvaluator
  segmentationEngine: SegmentationEngine
  configurationManager: ConfigurationManager
  
  // Experimentation
  experimentManager: ExperimentManager
  analyticsEngine: AnalyticsEngine
  statisticalAnalyzer: StatisticalAnalyzer
  
  // Progressive delivery
  rolloutManager: RolloutManager
  safetyMonitor: SafetyMonitor
  rollbackManager: RollbackManager
  
  // Integration
  componentIntegrator: ComponentIntegrator
  performanceMonitor: PerformanceMonitor
  auditLogger: AuditLogger
}

interface FeatureFlag {
  id: string
  name: string
  description: string
  type: FlagType
  status: FlagStatus
  defaultValue: FlagValue
  variations: FlagVariation[]
  targeting: TargetingRules
  rollout: RolloutConfiguration
  metadata: FlagMetadata
}

type FlagType = 'boolean' | 'string' | 'number' | 'json' | 'percentage'
type FlagStatus = 'active' | 'inactive' | 'archived' | 'experiment'
type FlagValue = boolean | string | number | object

interface FlagVariation {
  id: string
  name: string
  value: FlagValue
  weight: number
  description?: string
}

interface TargetingRules {
  segments: SegmentRule[]
  individuals: IndividualRule[]
  conditions: ConditionRule[]
  fallback: FallbackRule
}
```

## IMPLEMENTATION TASKS

### 1. Core Flag Evaluation Engine
Create `services/flags/FlagEvaluator.ts` with:
```typescript
interface FlagEvaluatorProps {
  cacheSize: number
  cacheTTL: number
  enableRealTimeUpdates: boolean
  performanceMode: 'speed' | 'accuracy' | 'balanced'
}

interface FlagEvaluator {
  // Core evaluation
  evaluateFlag: (flagId: string, context: EvaluationContext) => Promise<FlagResult>
  evaluateFlags: (flagIds: string[], context: EvaluationContext) => Promise<FlagResults>
  evaluateAllFlags: (context: EvaluationContext) => Promise<FlagResults>
  
  // Synchronous evaluation (cached)
  evaluateFlagSync: (flagId: string, context: EvaluationContext) => FlagResult | null
  
  // Batch operations
  batchEvaluate: (requests: EvaluationRequest[]) => Promise<BatchEvaluationResult>
  preloadFlags: (flagIds: string[], contexts: EvaluationContext[]) => Promise<void>
  
  // Performance optimization
  warmCache: (flagIds: string[]) => Promise<void>
  clearCache: (flagIds?: string[]) => void
  getCacheStats: () => CacheStatistics
  
  // Real-time updates
  subscribeToFlagChanges: (flagIds: string[], callback: FlagChangeCallback) => Unsubscribe
  refreshFlags: (flagIds?: string[]) => Promise<RefreshResult>
}

interface EvaluationContext {
  userId?: string
  sessionId: string
  userAgent: string
  location: GeographicLocation
  deviceInfo: DeviceInfo
  customAttributes: Record<string, any>
  timestamp: Date
}

interface FlagResult {
  flagId: string
  value: FlagValue
  variation: string
  reason: EvaluationReason
  metadata: EvaluationMetadata
  cacheable: boolean
  ttl: number
}

type EvaluationReason = 
  | 'targeting_match'
  | 'fallback'
  | 'default'
  | 'experiment'
  | 'rollout'
  | 'individual_override'
  | 'error'
```

### 2. User Segmentation Engine
Create `services/flags/SegmentationEngine.ts` with:
```typescript
interface SegmentationEngine {
  // Segment evaluation
  evaluateSegments: (context: EvaluationContext) => Promise<SegmentMembership[]>
  checkSegmentMembership: (segmentId: string, context: EvaluationContext) => Promise<boolean>
  calculateSegmentScore: (segmentId: string, context: EvaluationContext) => Promise<number>
  
  // Segment management
  createSegment: (segment: SegmentDefinition) => Promise<string>
  updateSegment: (segmentId: string, updates: Partial<SegmentDefinition>) => Promise<void>
  deleteSegment: (segmentId: string) => Promise<void>
  
  // Analytics and optimization
  analyzeSegmentPerformance: (segmentId: string, timeRange: TimeRange) => Promise<SegmentAnalysis>
  optimizeSegmentRules: (segmentId: string) => Promise<OptimizationSuggestions>
  validateSegmentRules: (rules: SegmentRules) => ValidationResult
  
  // Population analysis
  estimateSegmentSize: (rules: SegmentRules) => Promise<SizeEstimate>
  analyzeSegmentOverlap: (segmentIds: string[]) => Promise<OverlapAnalysis>
  getSegmentInsights: (segmentId: string) => Promise<SegmentInsights>
}

interface SegmentDefinition {
  id: string
  name: string
  description: string
  rules: SegmentRules
  metadata: SegmentMetadata
  status: 'active' | 'inactive' | 'draft'
}

interface SegmentRules {
  conditions: SegmentCondition[]
  operator: 'AND' | 'OR'
  nested?: SegmentRules[]
}

interface SegmentCondition {
  attribute: string
  operator: ConditionOperator
  value: any
  weight?: number
}

type ConditionOperator = 
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'in'
  | 'not_in'
  | 'regex'
  | 'exists'
  | 'not_exists'
```

### 3. Experiment Management System
Create `services/flags/ExperimentManager.ts` with:
```typescript
interface ExperimentManager {
  // Experiment lifecycle
  createExperiment: (experiment: ExperimentDefinition) => Promise<string>
  startExperiment: (experimentId: string) => Promise<ExperimentStartResult>
  pauseExperiment: (experimentId: string) => Promise<void>
  resumeExperiment: (experimentId: string) => Promise<void>
  stopExperiment: (experimentId: string) => Promise<ExperimentStopResult>
  
  // Participant management
  enrollParticipant: (experimentId: string, context: EvaluationContext) => Promise<EnrollmentResult>
  getParticipantVariation: (experimentId: string, participantId: string) => Promise<string>
  excludeParticipant: (experimentId: string, participantId: string) => Promise<void>
  
  // Results and analysis
  getExperimentResults: (experimentId: string) => Promise<ExperimentResults>
  calculateStatisticalSignificance: (experimentId: string) => Promise<SignificanceTest>
  generateResultsReport: (experimentId: string) => Promise<ResultsReport>
  
  // Optimization
  suggestExperimentOptimizations: (experimentId: string) => Promise<OptimizationSuggestions>
  estimateExperimentDuration: (experiment: ExperimentDefinition) => Promise<DurationEstimate>
  validateExperimentDesign: (experiment: ExperimentDefinition) => ValidationResult
}

interface ExperimentDefinition {
  id: string
  name: string
  description: string
  hypothesis: string
  flagId: string
  variations: ExperimentVariation[]
  targetingRules: TargetingRules
  trafficAllocation: number
  successMetrics: SuccessMetric[]
  guardrailMetrics: GuardrailMetric[]
  duration: ExperimentDuration
  metadata: ExperimentMetadata
}

interface ExperimentVariation {
  id: string
  name: string
  flagValue: FlagValue
  allocation: number
  description?: string
}

interface SuccessMetric {
  id: string
  name: string
  type: MetricType
  aggregation: AggregationType
  goal: 'increase' | 'decrease' | 'maintain'
  significance: number
  minimumDetectableEffect: number
}

type MetricType = 'conversion' | 'revenue' | 'engagement' | 'retention' | 'custom'
type AggregationType = 'sum' | 'average' | 'count' | 'unique' | 'percentile'
```

### 4. Progressive Rollout Manager
Create `services/flags/RolloutManager.ts` with:
```typescript
interface RolloutManager {
  // Rollout control
  startRollout: (rolloutPlan: RolloutPlan) => Promise<RolloutExecution>
  pauseRollout: (rolloutId: string) => Promise<void>
  resumeRollout: (rolloutId: string) => Promise<void>
  accelerateRollout: (rolloutId: string, newSchedule: RolloutSchedule) => Promise<void>
  
  // Safety monitoring
  monitorRolloutHealth: (rolloutId: string) => Promise<HealthStatus>
  checkSafetyConstraints: (rolloutId: string) => Promise<SafetyCheck>
  triggerAutomaticRollback: (rolloutId: string, reason: string) => Promise<RollbackResult>
  
  // Progress tracking
  getRolloutProgress: (rolloutId: string) => Promise<RolloutProgress>
  getRolloutMetrics: (rolloutId: string) => Promise<RolloutMetrics>
  generateRolloutReport: (rolloutId: string) => Promise<RolloutReport>
  
  // Configuration
  createRolloutPlan: (config: RolloutConfiguration) => Promise<RolloutPlan>
  validateRolloutPlan: (plan: RolloutPlan) => ValidationResult
  optimizeRolloutSchedule: (plan: RolloutPlan, constraints: RolloutConstraints) => Promise<OptimizedSchedule>
}

interface RolloutPlan {
  id: string
  name: string
  flagId: string
  targetValue: FlagValue
  schedule: RolloutSchedule
  segments: RolloutSegment[]
  safetyRules: SafetyRule[]
  rollbackTriggers: RollbackTrigger[]
  metadata: RolloutMetadata
}

interface RolloutSchedule {
  type: 'linear' | 'exponential' | 'custom'
  duration: number
  stages: RolloutStage[]
  pauseBetweenStages: number
}

interface RolloutStage {
  name: string
  percentage: number
  duration: number
  waitForApproval?: boolean
  successCriteria: SuccessCriteria[]
}

interface SafetyRule {
  metric: string
  threshold: number
  comparison: 'greater_than' | 'less_than' | 'equals'
  action: 'pause' | 'rollback' | 'alert'
  window: number
}
```

### 5. Component Integration System
Create `utils/flags/ComponentIntegrator.ts` with:
```typescript
interface ComponentIntegrator {
  // React integration
  createFlagHook: (flagId: string) => React.Hook<FlagResult>
  createFlagProvider: (flags: string[]) => React.ComponentType
  createFlagBoundary: (fallbackFlags: Record<string, FlagValue>) => React.ComponentType
  
  // HOC patterns
  withFlags: (flags: string[]) => <P>(Component: React.ComponentType<P>) => React.ComponentType<P>
  withExperiment: (experimentId: string) => <P>(variants: Record<string, React.ComponentType<P>>) => React.ComponentType<P>
  
  // Rendering utilities
  renderIfEnabled: (flagId: string, component: React.ReactNode) => React.ReactNode
  switchOnFlag: (flagId: string, variants: Record<string, React.ReactNode>) => React.ReactNode
  
  // Performance optimization
  preloadFlags: (flags: string[], context: EvaluationContext) => Promise<void>
  batchFlagRequests: (requests: FlagRequest[]) => Promise<BatchFlagResponse>
  optimizeRenderPath: (flagIds: string[]) => OptimizedRenderPath
}

// React Hooks
function useFlagValue(flagId: string, defaultValue?: FlagValue): FlagResult
function useFlagEnabled(flagId: string): boolean
function useExperimentVariation(experimentId: string): ExperimentVariation
function useFlagLoading(flagIds: string[]): boolean

// React Components
interface FlagSwitchProps {
  flagId: string
  when: Record<string, React.ReactNode>
  fallback?: React.ReactNode
}

interface ExperimentProviderProps {
  experimentId: string
  children: React.ReactNode
  onVariationAssigned?: (variation: string) => void
}
```

### 6. Analytics and Reporting Engine
Create `services/flags/AnalyticsEngine.ts` with:
```typescript
interface AnalyticsEngine {
  // Event tracking
  trackFlagEvaluation: (evaluation: FlagEvaluation) => Promise<void>
  trackExperimentEnrollment: (enrollment: ExperimentEnrollment) => Promise<void>
  trackMetricEvent: (event: MetricEvent) => Promise<void>
  
  // Real-time analytics
  getFlagUsageStats: (flagId: string, timeRange: TimeRange) => Promise<UsageStats>
  getExperimentProgress: (experimentId: string) => Promise<ExperimentProgress>
  getLiveMetrics: (metricIds: string[]) => Promise<LiveMetrics>
  
  // Reporting
  generateFlagReport: (flagId: string, timeRange: TimeRange) => Promise<FlagReport>
  generateExperimentReport: (experimentId: string) => Promise<ExperimentReport>
  generateSystemReport: (timeRange: TimeRange) => Promise<SystemReport>
  
  // Insights and recommendations
  analyzeFlagPerformance: (flagId: string) => Promise<PerformanceAnalysis>
  detectAnomalies: (metricIds: string[], timeRange: TimeRange) => Promise<Anomaly[]>
  generateOptimizationSuggestions: () => Promise<OptimizationSuggestion[]>
}

interface FlagEvaluation {
  flagId: string
  userId: string
  sessionId: string
  variation: string
  value: FlagValue
  reason: EvaluationReason
  timestamp: Date
  context: EvaluationContext
  responseTime: number
}

interface MetricEvent {
  id: string
  userId: string
  sessionId: string
  experimentId?: string
  variation?: string
  metricName: string
  metricValue: number
  timestamp: Date
  attributes: Record<string, any>
}

interface UsageStats {
  flagId: string
  totalEvaluations: number
  uniqueUsers: number
  variationBreakdown: VariationStats[]
  performanceMetrics: PerformanceStats
  errorRate: number
}
```

## SUCCESS CRITERIA
- [ ] Flag evaluation response time <1ms for cached flags
- [ ] 99.99% uptime for flag evaluation service
- [ ] Support for 10,000+ concurrent flag evaluations
- [ ] A/B test statistical power >80% with configurable significance levels
- [ ] Progressive rollout with <5 minute rollback capability
- [ ] Real-time analytics with <10s data freshness
- [ ] Zero deployment downtime for flag configuration changes
- [ ] Integration with all major system components

## PERFORMANCE SPECIFICATIONS
```typescript
const PERFORMANCE_TARGETS = {
  flagEvaluation: {
    cachedResponseTime: 1,        // ms average
    uncachedResponseTime: 50,     // ms average
    throughput: 10000,            // evaluations per second
    cacheHitRate: 95,            // % for active flags
  },
  
  experimentation: {
    enrollmentTime: 100,          // ms average
    resultCalculation: 5000,      // ms for complex experiments
    statisticalAccuracy: 99,      // % confidence in results
    participantCapacity: 100000   // concurrent experiment participants
  },
  
  rolloutManagement: {
    rolloutInitiation: 1000,      // ms to start rollout
    safetyCheckInterval: 30,      // seconds between checks
    rollbackTime: 300,            // seconds for complete rollback
    healthMonitoring: 10          // seconds between health checks
  },
  
  analytics: {
    dataFreshness: 10,           // seconds for real-time metrics
    reportGeneration: 30,        // seconds for complex reports
    queryResponseTime: 2,        // seconds for dashboard queries
    dataRetention: 365           // days for historical data
  }
}
```

## ERROR HANDLING STRATEGY
```typescript
const ERROR_HANDLING = {
  flagEvaluationFailure: {
    fallback: 'default_value',
    cacheStaleData: true,
    retryAttempts: 3,
    circuitBreakerThreshold: 50 // % error rate
  },
  
  experimentEnrollmentError: {
    excludeFromExperiment: true,
    logForAnalysis: true,
    notifyAdministrators: false,
    maintainControlGroup: true
  },
  
  rolloutFailure: {
    automaticPause: true,
    alertOperators: true,
    preserveCurrentState: true,
    requireManualResumption: true
  },
  
  analyticsServiceDown: {
    bufferEvents: true,
    bufferCapacity: 10000,
    bufferTTL: 3600, // seconds
    degradeGracefully: true
  }
}
```

## TESTING VALIDATION

### Unit Tests
- [ ] Flag evaluation logic with various targeting rules
- [ ] Segment evaluation with complex conditions
- [ ] Statistical significance calculations
- [ ] Rollout progression and safety checks
- [ ] Cache performance and invalidation
- [ ] React component integration

### Integration Tests
- [ ] End-to-end experiment lifecycle
- [ ] Cross-system flag propagation
- [ ] Real-time analytics data flow
- [ ] Progressive rollout automation
- [ ] Performance under load conditions

### A/B Testing Validation
- [ ] Statistical power calculations
- [ ] Sample size requirements
- [ ] False discovery rate control
- [ ] Multi-armed bandit algorithms
- [ ] Bayesian inference accuracy

## FILES TO CREATE
```
services/flags/
├── FeatureFlagSystem.ts         # Main system orchestrator
├── FlagEvaluator.ts            # Core evaluation engine
├── SegmentationEngine.ts       # User segmentation
├── ExperimentManager.ts        # A/B testing management
├── RolloutManager.ts           # Progressive rollout
├── AnalyticsEngine.ts          # Analytics and reporting
├── ConfigurationManager.ts     # Flag configuration
└── __tests__/
    ├── FlagEvaluator.test.ts
    ├── SegmentationEngine.test.ts
    ├── ExperimentManager.test.ts
    └── RolloutManager.test.ts

utils/flags/
├── ComponentIntegrator.ts       # React integration utilities
├── FlagCache.ts                # Caching strategies
├── StatisticalAnalyzer.ts      # Statistical methods
├── PerformanceOptimizer.ts     # Performance optimization
└── __tests__/
    ├── ComponentIntegrator.test.ts
    ├── FlagCache.test.ts
    └── StatisticalAnalyzer.test.ts

hooks/flags/
├── useFlagValue.ts             # Core flag hook
├── useExperiment.ts            # Experiment participation hook
├── useFlagLoading.ts           # Loading state hook
├── useFlagAnalytics.ts         # Analytics hooks
└── __tests__/
    ├── useFlagValue.test.tsx
    ├── useExperiment.test.tsx
    └── useFlagLoading.test.tsx

components/flags/
├── FlagProvider.tsx            # Context provider
├── FlagSwitch.tsx              # Conditional rendering
├── ExperimentProvider.tsx      # Experiment context
├── FlagBoundary.tsx            # Error boundary
└── __tests__/
    ├── FlagProvider.test.tsx
    ├── FlagSwitch.test.tsx
    └── ExperimentProvider.test.tsx

admin/flags/
├── FlagDashboard.tsx           # Admin dashboard
├── ExperimentDashboard.tsx     # Experiment management
├── RolloutDashboard.tsx        # Rollout monitoring
├── AnalyticsDashboard.tsx      # Analytics visualization
└── __tests__/
    ├── FlagDashboard.test.tsx
    ├── ExperimentDashboard.test.tsx
    └── RolloutDashboard.test.tsx

store/
├── flagStore.ts                # Flag state management
├── experimentStore.ts          # Experiment state
└── __tests__/
    ├── flagStore.test.ts
    └── experimentStore.test.ts

types/
├── flags.ts                    # Core flag types
├── experiments.ts              # Experiment types
├── segmentation.ts             # Segmentation types
└── analytics.ts                # Analytics types
```

## INTEGRATION REQUIREMENTS
- Integrate with existing Zustand stores for state management
- Connect to Supabase for flag configuration persistence
- Use existing real-time channels for flag updates
- Integrate with moderation system for safety constraints
- Connect to audit system for change tracking
- Use existing performance monitoring infrastructure
- Integrate with user management for segmentation
- Connect to analytics pipeline for experiment data

## EXPECTED OUTPUT
A comprehensive feature flags and experimentation system that:
1. **Provides real-time flag evaluation** with sub-millisecond performance
2. **Enables sophisticated A/B testing** with statistical rigor
3. **Supports progressive rollouts** with automated safety monitoring
4. **Offers powerful segmentation** for targeted feature delivery
5. **Integrates seamlessly** with React components and hooks
6. **Provides comprehensive analytics** for data-driven decisions
7. **Maintains high availability** with graceful degradation
8. **Supports experimentation** across all system components
9. **Offers intuitive management** interfaces for operators
10. **Scales efficiently** with user growth and feature complexity

The implementation should demonstrate production-grade feature management with comprehensive testing, monitoring, and safety mechanisms suitable for a dynamic metaverse platform.