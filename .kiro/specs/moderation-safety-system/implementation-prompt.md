# Moderation & Safety System - Comprehensive Development Prompt

## CONTEXT
You are implementing a centralized moderation and safety system for the Descendants metaverse that provides content filtering, safety checks, and automated moderation across all communication channels (AI outputs, chat, voice, user-generated content). This system must protect users while maintaining the creative freedom of the living metaverse experience.

Current Architecture:
- AI simulants powered by Gemini AI with chat-based interaction
- Multi-channel communication system (public, private, spatial)
- Voice communication with real-time audio processing
- User-generated content through block placement and item interactions
- Real-time synchronization via Supabase channels

## OBJECTIVE
Create a comprehensive, real-time moderation system that filters inappropriate content, detects harmful behavior patterns, and provides automated safety responses while maintaining low latency and high accuracy across all communication vectors.

## REQUIREMENTS
- Real-time content filtering for text, audio, and behavioral patterns
- Multi-layer safety checks with escalating responses
- Privacy-preserving moderation that doesn't store sensitive data
- Integration with all communication systems (AI, chat, voice)
- Automated threat detection with human review capabilities
- Audit logging for compliance and appeals processes
- Performance optimization to maintain <100ms response times

## MODERATION SYSTEM ARCHITECTURE
```typescript
interface ModerationSystem {
  // Core filtering engines
  textModerator: TextModerationEngine
  voiceModerator: VoiceModerationEngine
  behaviorAnalyzer: BehaviorAnalysisEngine
  contentValidator: ContentValidationEngine
  
  // Safety management
  safetyPolicyEngine: SafetyPolicyEngine
  threatDetector: ThreatDetectionEngine
  escalationManager: EscalationManager
  
  // Integration points
  aiOutputFilter: AIOutputFilter
  chatMessageFilter: ChatMessageFilter
  voiceContentFilter: VoiceContentFilter
  userActionValidator: UserActionValidator
  
  // Administration
  moderationDashboard: ModerationDashboard
  auditLogger: AuditLogger
  appealManager: AppealManager
}

interface ModerationResult {
  passed: boolean
  confidence: number
  violationType?: ViolationType
  severity: 'low' | 'medium' | 'high' | 'critical'
  action: ModerationAction
  explanation: string
  reviewRequired: boolean
}

type ViolationType = 
  | 'profanity'
  | 'harassment' 
  | 'hate_speech'
  | 'spam'
  | 'inappropriate_content'
  | 'privacy_violation'
  | 'impersonation'
  | 'malicious_behavior'
  | 'excessive_volume'

type ModerationAction =
  | 'allow'
  | 'filter'
  | 'warn'
  | 'temp_mute'
  | 'temp_ban'
  | 'permanent_ban'
  | 'escalate'
```

## IMPLEMENTATION TASKS

### 1. Core Text Moderation Engine
Create `services/moderation/TextModerationEngine.ts` with:
```typescript
interface TextModerationEngineProps {
  enableProfanityFilter: boolean
  enableToxicityDetection: boolean
  enableSpamDetection: boolean
  customWordLists: CustomWordList[]
  languageSupport: string[]
}

interface TextModerationEngine {
  // Core filtering
  moderateText: (text: string, context: ModerationContext) => Promise<ModerationResult>
  validateMessage: (message: ChatMessage) => Promise<ModerationResult>
  filterAIOutput: (output: string, simulantId: string) => Promise<ModerationResult>
  
  // Pattern detection
  detectSpam: (text: string, userId: string) => Promise<SpamAnalysis>
  detectToxicity: (text: string) => Promise<ToxicityScore>
  detectProfanity: (text: string) => Promise<ProfanityResult>
  
  // Context awareness
  analyzeContext: (text: string, conversationHistory: ChatMessage[]) => ContextualRisk
  checkPersonalInfo: (text: string) => PrivacyViolation[]
  
  // Custom policies
  applyCustomPolicies: (text: string, policies: SafetyPolicy[]) => PolicyViolation[]
}

interface ModerationContext {
  userId: string
  channel: string
  messageType: 'public' | 'private' | 'system'
  conversationHistory: ChatMessage[]
  userReputation: number
  timeOfDay: number
}
```

### 2. Voice Content Moderation
Create `services/moderation/VoiceModerationEngine.ts` with:
```typescript
interface VoiceModerationEngine {
  // Real-time analysis
  analyzeVoiceStream: (audioData: ArrayBuffer, userId: string) => Promise<VoiceAnalysisResult>
  transcribeAndModerate: (audioData: ArrayBuffer) => Promise<TranscriptionResult>
  detectVoiceAnomalies: (audioData: ArrayBuffer) => Promise<VoiceAnomalyResult>
  
  // Volume and behavior analysis
  monitorVolumeAbuse: (userId: string, volumeLevel: number) => VolumeViolation
  detectBackgroundNoise: (audioData: ArrayBuffer) => NoiseAnalysis
  analyzeVoicePatterns: (userId: string, duration: number) => BehaviorPattern
  
  // Privacy protection
  filterSensitiveAudio: (audioData: ArrayBuffer) => Promise<ArrayBuffer>
  detectPersonalInfoInSpeech: (transcription: string) => PrivacyViolation[]
}

interface VoiceAnalysisResult {
  transcription: string
  moderationResult: ModerationResult
  audioQuality: AudioQualityMetrics
  speakerIdentification: SpeakerInfo
  backgroundAnalysis: BackgroundAnalysis
}

interface TranscriptionResult {
  text: string
  confidence: number
  language: string
  timestamps: TimeStamp[]
  moderationFlags: ModerationFlag[]
}
```

### 3. Behavioral Analysis Engine
Create `services/moderation/BehaviorAnalysisEngine.ts` with:
```typescript
interface BehaviorAnalysisEngine {
  // Pattern detection
  analyzeUserBehavior: (userId: string, timeWindow: number) => Promise<BehaviorAnalysis>
  detectSuspiciousPatterns: (actions: UserAction[]) => SuspiciousActivityReport
  trackInteractionPatterns: (userId: string, interactions: Interaction[]) => InteractionAnalysis
  
  // Frequency analysis
  monitorMessageFrequency: (userId: string) => FrequencyAnalysis
  detectCoordinatedBehavior: (userIds: string[]) => CoordinationAnalysis
  analyzeWorldInteractions: (userId: string, worldActions: WorldAction[]) => WorldBehaviorAnalysis
  
  // Risk assessment
  calculateUserRiskScore: (userId: string) => Promise<RiskScore>
  predictEscalation: (userId: string, currentBehavior: BehaviorPattern) => EscalationPrediction
  generateBehaviorReport: (userId: string, period: TimePeriod) => BehaviorReport
}

interface BehaviorAnalysis {
  userId: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  patterns: BehaviorPattern[]
  anomalies: Anomaly[]
  recommendations: ModerationRecommendation[]
  nextReviewDate: Date
}

interface BehaviorPattern {
  type: 'messaging' | 'movement' | 'building' | 'social'
  frequency: number
  intensity: number
  consistency: number
  compared_to_baseline: number
}
```

### 4. AI Output Safety Filter
Create `services/moderation/AIOutputFilter.ts` with:
```typescript
interface AIOutputFilter {
  // Pre-response filtering
  validateAIResponse: (response: string, prompt: string, simulantId: string) => Promise<ValidationResult>
  filterHarmfulContent: (response: string) => Promise<FilteredResponse>
  checkResponseConsistency: (response: string, simulantPersonality: Personality) => ConsistencyCheck
  
  // Safety constraints
  enforceTopicBoundaries: (response: string, allowedTopics: Topic[]) => BoundaryViolation[]
  preventInformationLeakage: (response: string, sensitiveData: SensitiveData[]) => LeakageCheck
  validateActionSafety: (proposedAction: AIAction) => ActionSafetyResult
  
  // Quality assurance
  checkResponseQuality: (response: string, context: ConversationContext) => QualityScore
  detectAIHallucination: (response: string, factualContext: FactualContext) => HallucinationCheck
  ensureRoleConsistency: (response: string, simulantRole: SimulantRole) => RoleConsistencyCheck
}

interface ValidationResult {
  isValid: boolean
  confidence: number
  issues: SafetyIssue[]
  suggestedAction: 'allow' | 'modify' | 'reject' | 'escalate'
  modifiedResponse?: string
  explanation: string
}

interface FilteredResponse {
  originalResponse: string
  filteredResponse: string
  removedContent: RemovedContent[]
  safetyScore: number
  requiresHumanReview: boolean
}
```

### 5. Escalation and Response Management
Create `services/moderation/EscalationManager.ts` with:
```typescript
interface EscalationManager {
  // Automated responses
  executeAutomatedAction: (violation: PolicyViolation, userId: string) => Promise<ActionResult>
  applyTemporaryRestrictions: (userId: string, restrictions: Restriction[]) => Promise<void>
  notifyModerators: (incident: ModerationIncident) => Promise<NotificationResult>
  
  // Escalation logic
  determineEscalationLevel: (violations: PolicyViolation[], userHistory: UserHistory) => EscalationLevel
  createModerationTicket: (incident: ModerationIncident) => Promise<ModerationTicket>
  scheduleReview: (ticketId: string, priority: Priority) => Promise<ReviewSchedule>
  
  // User communication
  sendWarning: (userId: string, violation: PolicyViolation) => Promise<WarningResult>
  notifyUser: (userId: string, action: ModerationAction) => Promise<NotificationResult>
  provideAppealProcess: (userId: string, actionId: string) => AppealInstructions
}

interface ModerationIncident {
  id: string
  userId: string
  timestamp: Date
  violationType: ViolationType
  severity: Severity
  evidence: Evidence[]
  context: IncidentContext
  autoActions: AutoAction[]
  humanReviewRequired: boolean
}

interface PolicyViolation {
  type: ViolationType
  severity: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  evidence: string[]
  recommendedAction: ModerationAction
  appealable: boolean
}
```

### 6. Audit and Compliance System
Create `services/moderation/AuditLogger.ts` with:
```typescript
interface AuditLogger {
  // Event logging
  logModerationAction: (action: ModerationAction, context: ActionContext) => Promise<void>
  logPolicyViolation: (violation: PolicyViolation, userId: string) => Promise<void>
  logEscalation: (escalation: EscalationEvent) => Promise<void>
  
  // Compliance reporting
  generateComplianceReport: (period: TimePeriod) => Promise<ComplianceReport>
  exportAuditLogs: (filters: AuditFilters) => Promise<ExportResult>
  trackAppealOutcomes: (appealId: string, outcome: AppealOutcome) => Promise<void>
  
  // Privacy protection
  anonymizePersonalData: (logs: AuditLog[]) => AnonymizedLog[]
  enforceDataRetention: (retentionPolicy: RetentionPolicy) => Promise<CleanupResult>
  validateDataHandling: (dataType: DataType) => ComplianceStatus
}

interface AuditLog {
  id: string
  timestamp: Date
  eventType: 'moderation_action' | 'policy_violation' | 'escalation' | 'appeal'
  userId: string
  moderatorId?: string
  action: string
  details: Record<string, any>
  severity: Severity
  outcome: string
  reviewStatus: 'pending' | 'reviewed' | 'closed'
}
```

### 7. Performance Optimization
Create `utils/moderation/ModerationOptimizer.ts` with:
```typescript
interface ModerationOptimizer {
  // Caching strategies
  cacheUserRiskScores: (userId: string, score: RiskScore, ttl: number) => Promise<void>
  getCachedModerationResult: (contentHash: string) => Promise<ModerationResult | null>
  invalidateModerationCache: (userId: string) => Promise<void>
  
  // Batch processing
  batchModerateMessages: (messages: ChatMessage[]) => Promise<ModerationResult[]>
  prioritizeProcessing: (items: ModerationItem[]) => PriorityQueue
  optimizeFilterChain: (filters: ModerationFilter[]) => OptimizedFilterChain
  
  // Load balancing
  distributeModerationLoad: (requests: ModerationRequest[]) => LoadBalancingResult
  adaptToSystemLoad: (currentLoad: SystemLoad) => AdaptationStrategy
  monitorPerformanceMetrics: () => Promise<PerformanceMetrics>
}
```

## SUCCESS CRITERIA
- [ ] Real-time content filtering with <100ms response time for text
- [ ] Voice moderation with <200ms latency for real-time streams
- [ ] 99.5% accuracy on obvious violations (profanity, hate speech)
- [ ] <0.1% false positive rate on legitimate content
- [ ] Behavioral pattern detection within 5 minutes of suspicious activity
- [ ] Complete audit trail for all moderation actions
- [ ] Privacy-compliant data handling with automatic retention policies
- [ ] Integration with all communication systems without service disruption

## PERFORMANCE SPECIFICATIONS
```typescript
const PERFORMANCE_TARGETS = {
  textModeration: {
    responseTime: 100,        // ms average
    throughput: 1000,         // messages per second
    accuracy: 99.5,           // % for clear violations
    falsePositiveRate: 0.1    // %
  },
  
  voiceModeration: {
    streamingLatency: 200,    // ms for real-time
    transcriptionTime: 1000,  // ms per 10 seconds of audio
    bufferSize: 4096,         // bytes
    compressionRatio: 0.3     // for storage
  },
  
  behaviorAnalysis: {
    analysisWindow: 300,      // seconds for pattern detection
    riskScoreUpdate: 60,      // seconds
    falsePositiveRate: 0.05,  // % for behavior flags
    memoryUsage: 50          // MB per active user
  },
  
  systemPerformance: {
    availability: 99.9,       // % uptime
    maxResponseTime: 500,     // ms worst case
    cacheHitRate: 85,         // % for repeated content
    errorRate: 0.01           // % system errors
  }
}
```

## ERROR HANDLING STRATEGY
```typescript
const ERROR_HANDLING = {
  contentFilteringFailure: {
    fallback: 'conservative_block',
    retryAttempts: 3,
    escalateToHuman: true,
    logForAnalysis: true
  },
  
  voiceProcessingError: {
    fallback: 'mute_temporarily',
    notifyUser: true,
    continueOtherChannels: true,
    maxRetryDelay: 30000 // ms
  },
  
  behaviorAnalysisFailure: {
    useLastKnownScore: true,
    reduceUpdateFrequency: true,
    alertAdministrators: true,
    maintainBasicFiltering: true
  },
  
  systemOverload: {
    prioritizeRealTime: true,
    pauseNonEssential: true,
    useSimplifiedFilters: true,
    scaleAutomatically: true
  }
}
```

## DEBUG SYSTEM IMPLEMENTATION
Create `debug/moderation/ModerationDebugger.ts` with:
```typescript
interface ModerationDebugger {
  // Real-time monitoring
  showModerationFlow: (enable: boolean) => void
  visualizeFilterChain: (contentId: string) => FilterChainVisualization
  trackDecisionPath: (moderationId: string) => DecisionPath
  
  // Performance analysis
  measureFilterPerformance: (filterId: string) => PerformanceMetrics
  analyzeBottlenecks: () => BottleneckAnalysis
  monitorResourceUsage: () => ResourceUsage
  
  // Testing utilities
  simulateViolation: (violationType: ViolationType, severity: Severity) => void
  testFilterAccuracy: (testSet: TestCase[]) => AccuracyReport
  benchmarkSystemLoad: (loadLevel: LoadLevel) => BenchmarkResult
  
  // Audit tools
  exportDebugLogs: (timeRange: TimeRange) => DebugLogExport
  validateComplianceRules: (rules: ComplianceRule[]) => ValidationReport
  generateModerationReport: (period: TimePeriod) => ModerationReport
}
```

## TESTING VALIDATION

### Unit Tests
- [ ] Text filtering accuracy with known positive/negative cases
- [ ] Voice processing with various audio quality levels
- [ ] Behavior pattern recognition with synthetic user data
- [ ] AI output validation with edge cases and boundary conditions
- [ ] Escalation logic with different violation scenarios
- [ ] Audit logging completeness and data integrity

### Integration Tests
- [ ] End-to-end moderation flow from input to action
- [ ] Real-time performance under load with concurrent users
- [ ] Cross-system integration (chat, voice, AI simultaneously)
- [ ] Database consistency during high-volume operations
- [ ] Privacy compliance with data handling requirements

### Security Tests
- [ ] Content injection attempts and filter bypasses
- [ ] Privacy data leakage prevention
- [ ] Authorization checks for moderation actions
- [ ] Rate limiting effectiveness under abuse scenarios
- [ ] Audit trail tampering resistance

## FILES TO CREATE
```
services/moderation/
├── ModerationSystem.ts          # Main orchestration service
├── TextModerationEngine.ts      # Text content filtering
├── VoiceModerationEngine.ts     # Voice/audio processing
├── BehaviorAnalysisEngine.ts    # User behavior monitoring
├── AIOutputFilter.ts            # AI response validation
├── EscalationManager.ts         # Automated response handling
├── AuditLogger.ts              # Compliance and logging
├── SafetyPolicyEngine.ts       # Policy management
└── __tests__/
    ├── TextModerationEngine.test.ts
    ├── VoiceModerationEngine.test.ts
    ├── BehaviorAnalysisEngine.test.ts
    └── EscalationManager.test.ts

utils/moderation/
├── ModerationOptimizer.ts       # Performance optimization
├── ContentHasher.ts            # Content fingerprinting
├── PolicyEvaluator.ts          # Rule evaluation engine
├── ModerationUtils.ts          # Helper functions
└── __tests__/
    ├── ModerationOptimizer.test.ts
    ├── ContentHasher.test.ts
    └── PolicyEvaluator.test.ts

components/moderation/
├── ModerationDashboard.tsx      # Admin interface
├── ModerationAlerts.tsx         # Real-time alerts
├── UserReportForm.tsx          # User reporting interface
├── AppealInterface.tsx         # Appeal process UI
└── __tests__/
    ├── ModerationDashboard.test.tsx
    ├── ModerationAlerts.test.tsx
    └── UserReportForm.test.tsx

store/
├── moderationStore.ts          # Moderation state management
├── auditStore.ts              # Audit log management
└── __tests__/
    ├── moderationStore.test.ts
    └── auditStore.test.ts

types/
├── moderation.ts              # Moderation system types
├── safety.ts                  # Safety policy types
├── audit.ts                   # Audit and compliance types
└── violations.ts              # Violation and action types

debug/moderation/
├── ModerationDebugger.ts      # Debug tools and monitoring
├── ModerationProfiler.ts      # Performance profiling
├── TestDataGenerator.ts      # Test case generation
└── ModerationDebugPanel.tsx   # React debug interface

examples/
├── moderationExample.tsx      # Usage examples
├── policyConfiguration.ts     # Example policies
└── integrationExamples.ts     # Integration patterns
```

## INTEGRATION REQUIREMENTS
- Integrate with existing chat system for message filtering
- Hook into AI response pipeline for output validation
- Connect to voice communication for real-time audio processing
- Integrate with user management for account actions
- Connect to audit system for compliance reporting
- Use existing notification system for user alerts
- Integrate with admin dashboard for moderation controls

## EXPECTED OUTPUT
A comprehensive moderation and safety system that:
1. **Provides real-time content filtering** across all communication channels
2. **Detects behavioral patterns** and prevents abuse before escalation
3. **Maintains user privacy** while ensuring safety and compliance
4. **Scales efficiently** with the platform's growth and user base
5. **Offers transparent processes** for appeals and dispute resolution
6. **Integrates seamlessly** with existing Descendants architecture
7. **Provides comprehensive audit trails** for compliance and analysis
8. **Adapts automatically** to changing safety requirements and threats
9. **Maintains high performance** without impacting user experience
10. **Supports human oversight** while automating routine decisions

The implementation should demonstrate enterprise-grade safety practices with comprehensive testing, monitoring, and compliance capabilities suitable for a public-facing metaverse platform.