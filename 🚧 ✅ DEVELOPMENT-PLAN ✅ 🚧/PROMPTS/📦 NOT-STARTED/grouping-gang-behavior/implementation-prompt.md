# Grouping & Gang Behavior - Comprehensive Development Prompt

## CONTEXT
You are implementing a sophisticated grouping and gang behavior system for the Descendants metaverse that enables AI simulants to form dynamic groups, develop gang-like behaviors, coordinate collective actions, and display complex group dynamics. The system includes notification board integration for group announcements, memory-efficient data structures for managing group relationships, and advanced algorithms for emergent group behavior patterns that create realistic social dynamics and conflicts.

Current Architecture:
- AI simulant system with advanced personality and social dynamics
- Society formation and governance systems established
- Communication channels and news system implemented
- Notification board system for public announcements
- Complex social dynamics and relationship management
- AI personality engineering with diverse character types

## OBJECTIVE
Create a comprehensive group behavior system that enables realistic gang formation, group dynamics, collective decision-making, territorial behaviors, loyalty systems, and inter-group conflicts while providing efficient memory management and seamless integration with notification systems for group announcements and activities.

## REQUIREMENTS
- Dynamic group formation with emergent leadership structures
- Gang behavior patterns with territorial and loyalty dynamics
- Notification board integration for group announcements
- Memory-efficient data structures for group relationship management
- Collective decision-making and group coordination systems
- Inter-group conflict and alliance mechanisms
- Recruitment and membership management systems
- Integration with existing AI personality and social systems

## GROUP BEHAVIOR ARCHITECTURE
```typescript
// Core group behavior system
interface GroupBehaviorSystem {
  groupFormation: GroupFormationEngine
  gangBehavior: GangBehaviorManager
  notificationBoard: GroupNotificationBoard
  memoryOptimizer: GroupMemoryOptimizer
  
  // Group dynamics
  leadershipDynamics: LeadershipDynamicsManager
  loyaltySystem: LoyaltyManagementSystem
  territorialBehavior: TerritorialBehaviorEngine
  
  // Inter-group relations
  conflictManager: InterGroupConflictManager
  allianceSystem: GroupAllianceSystem
  competitionEngine: GroupCompetitionEngine
}

interface Group {
  id: string
  name: string
  type: GroupType
  formationDate: number
  
  // Membership
  members: Map<string, GroupMember>
  leadership: GroupLeadership
  recruitmentCriteria: RecruitmentCriteria
  membershipRequirements: MembershipRequirement[]
  
  // Group identity
  identity: GroupIdentity
  culture: GroupCulture
  values: GroupValue[]
  goals: GroupGoal[]
  
  // Behavioral patterns
  behaviorPatterns: GroupBehaviorPattern[]
  activities: GroupActivity[]
  rituals: GroupRitual[]
  traditions: GroupTradition[]
  
  // Territorial and resource management
  territory: Territory
  resources: GroupResource[]
  claims: TerritorialClaim[]
  
  // Social dynamics
  cohesion: GroupCohesion
  loyalty: LoyaltyLevel
  reputation: GroupReputation
  relationships: InterGroupRelationship[]
  
  // Communication and coordination
  communicationChannels: GroupCommunicationChannel[]
  decisionMaking: GroupDecisionMaking
  coordination: GroupCoordination
}

interface GroupMember {
  simulantId: string
  joinDate: number
  role: GroupRole
  rank: GroupRank
  
  // Membership status
  status: MembershipStatus
  loyalty: LoyaltyScore
  commitment: CommitmentLevel
  contributions: GroupContribution[]
  
  // Social position
  influence: InfluenceLevel
  reputation: MemberReputation
  relationships: MemberRelationship[]
  mentorship: MentorshipRelation[]
  
  // Behavioral patterns
  participation: ParticipationLevel
  reliability: ReliabilityScore
  leadership: LeadershipPotential
  specializations: MemberSpecialization[]
}

type GroupType = 
  | 'informal_friend_group' | 'interest_based_club' | 'work_collective'
  | 'activist_organization' | 'criminal_gang' | 'protective_militia'
  | 'cultural_society' | 'religious_congregation' | 'academic_circle'
  | 'sports_team' | 'artistic_collective' | 'trade_union'
  | 'political_faction' | 'vigilante_group' | 'rebel_movement'
```

## IMPLEMENTATION TASKS

### 1. Dynamic Group Formation Engine
Create `systems/groups/GroupFormationEngine.ts` with:
```typescript
interface GroupFormationEngineProps {
  formationTriggers: FormationTrigger[]
  minimumGroupSize: number
  maximumGroupSize: number
  enableGangBehavior: boolean
  notificationBoardId: string
  memoryOptimization: boolean
}

interface GroupFormationEngine {
  // Formation detection
  detectFormationOpportunities: (simulants: AISimulant[]) => FormationOpportunity[]
  analyzeFormationPotential: (opportunity: FormationOpportunity) => FormationAnalysis
  evaluateGroupCompatibility: (members: AISimulant[]) => CompatibilityAnalysis
  
  // Formation facilitation
  facilitateGroupFormation: (opportunity: FormationOpportunity) => GroupFormationResult
  establishGroupIdentity: (members: AISimulant[], purpose: GroupPurpose) => GroupIdentity
  selectInitialLeadership: (members: AISimulant[], leadershipStyle: LeadershipStyle) => GroupLeadership
  
  // Natural emergence
  trackSocialClusters: (interactions: SocialInteraction[]) => SocialCluster[]
  identifyGroupSeeds: (clusters: SocialCluster[]) => GroupSeed[]
  nurtureSpontaneousGroups: (seeds: GroupSeed[]) => SpontaneousGroup[]
  
  // Notification integration
  announceGroupFormation: (group: Group, board: NotificationBoard) => AnnouncementResult
  inviteMembers: (group: Group, candidates: AISimulant[]) => InvitationResult[]
  publishGroupGoals: (group: Group, goals: GroupGoal[]) => PublicationResult
}

interface FormationOpportunity {
  potentialMembers: AISimulant[]
  commonInterests: SharedInterest[]
  proximityFactor: ProximityFactor
  socialConnections: SocialConnection[]
  
  // Formation drivers
  formationTrigger: FormationTrigger
  urgency: UrgencyLevel
  feasibility: FeasibilityScore
  sustainability: SustainabilityProjection
  
  // Group characteristics
  proposedType: GroupType
  suggestedPurpose: GroupPurpose
  leadershipCandidates: LeadershipCandidate[]
  potentialConflicts: PotentialConflict[]
}

interface FormationTrigger {
  type: TriggerType
  stimulus: TriggerStimulus
  threshold: TriggerThreshold
  
  // Context
  socialPressure: SocialPressure
  externalThreat: ExternalThreat
  opportunityPresent: Opportunity
  sharedExperience: SharedExperience
}

type TriggerType = 
  | 'mutual_interest' | 'common_threat' | 'shared_goal'
  | 'social_pressure' | 'resource_opportunity' | 'ideological_alignment'
  | 'protection_need' | 'status_seeking' | 'rebellion_impulse'
  | 'cultural_affinity' | 'economic_necessity' | 'adventure_seeking'
```

### 2. Gang Behavior Management System
Create `systems/groups/GangBehaviorManager.ts` with:
```typescript
interface GangBehaviorManager {
  // Gang evolution
  evolveToGangBehavior: (group: Group, triggers: GangEvolutionTrigger[]) => GangEvolutionResult
  establishGangHierarchy: (gang: Gang) => GangHierarchy
  developGangCulture: (gang: Gang, influences: CulturalInfluence[]) => GangCulture
  
  // Behavioral patterns
  implementGangBehaviors: (gang: Gang) => GangBehaviorImplementation
  manageTerritorialBehavior: (gang: Gang, territory: Territory) => TerritorialManagement
  coordinateGangActivities: (gang: Gang, activities: GangActivity[]) => ActivityCoordination
  
  // Loyalty and recruitment
  buildLoyaltySystem: (gang: Gang) => LoyaltySystem
  manageRecruitment: (gang: Gang, candidates: RecruitmentCandidate[]) => RecruitmentResult
  handleDefection: (gang: Gang, defector: GroupMember) => DefectionResponse
  
  // Conflict and rivalry
  establishRivalries: (gang: Gang, rivals: Group[]) => RivalrySystem
  manageGangConflicts: (conflict: InterGangConflict) => ConflictManagement
  negotiateGangPeace: (gangs: Gang[], mediator?: AISimulant) => PeaceNegotiation
}

interface Gang extends Group {
  // Gang-specific properties
  gangType: GangType
  hierarchy: GangHierarchy
  codeOfConduct: GangCode
  initiation: InitiationProcess
  
  // Criminal/territorial behavior
  territory: GangTerritory
  operations: GangOperation[]
  rivalries: GangRivalry[]
  alliances: GangAlliance[]
  
  // Loyalty and discipline
  loyaltyOaths: LoyaltyOath[]
  disciplinaryActions: DisciplinaryAction[]
  rewardSystems: GangRewardSystem[]
  
  // Gang culture
  symbols: GangSymbol[]
  slang: GangSlang
  rituals: GangRitual[]
  reputation: GangReputation
}

interface GangHierarchy {
  // Leadership structure
  leader: GangLeader
  lieutenants: GangLieutenant[]
  enforcers: GangEnforcer[]
  specialists: GangSpecialist[]
  members: RegularMember[]
  recruits: GangRecruit[]
  
  // Power dynamics
  chainOfCommand: CommandChain
  decisionMaking: GangDecisionMaking
  powerStruggles: PowerStruggle[]
  successionPlans: SuccessionPlan[]
}

interface TerritorialBehavior {
  // Territory management
  territoryMapping: TerritoryMap
  boundaryPatrolling: PatrolSchedule
  territoryDefense: DefenseStrategy
  territoryExpansion: ExpansionPlan
  
  // Territorial conflicts
  boundaryDisputes: BoundaryDispute[]
  invasionResponses: InvasionResponse[]
  territoryNegotiations: TerritoryNegotiation[]
  
  // Resource control
  resourceClaims: ResourceClaim[]
  accessControl: AccessControlSystem
  resourceSharing: SharingAgreement[]
}

type GangType = 
  | 'street_gang' | 'organized_crime' | 'vigilante_group'
  | 'rebel_faction' | 'mercenary_band' | 'protection_racket'
  | 'smuggling_ring' | 'activist_cell' | 'tribal_clan'
```

### 3. Group Notification Board Integration
Create `components/groups/GroupNotificationBoard.tsx` with:
```typescript
interface GroupNotificationBoardProps {
  boardId: string
  position: Vector3
  groups: Group[]
  enableGangAnnouncements: boolean
  enableRecruitment: boolean
  enableTerritorialClaims: boolean
  maxNotifications: number
  updateInterval: number
  
  onNotificationPosted?: (notification: GroupNotification) => void
  onGroupInteraction?: (groupId: string, interactor: AISimulant) => void
}

interface GroupNotificationBoard {
  // Notification management
  postGroupAnnouncement: (group: Group, announcement: GroupAnnouncement) => PostResult
  postRecruitmentNotice: (group: Group, recruitment: RecruitmentNotice) => PostResult
  postTerritorialClaim: (group: Group, claim: TerritorialClaim) => PostResult
  postGangWarning: (gang: Gang, warning: GangWarning) => PostResult
  
  // Content organization
  categorizeNotifications: (notifications: GroupNotification[]) => CategorizedNotifications
  prioritizeNotifications: (notifications: GroupNotification[]) => PrioritizedNotifications
  filterByRelevance: (notifications: GroupNotification[], viewer: AISimulant) => FilteredNotifications
  
  // AI interaction
  enableAIReading: (enable: boolean) => void
  processAIResponse: (notification: GroupNotification, reader: AISimulant) => AIResponse
  trackNotificationImpact: (notification: GroupNotification) => ImpactAnalysis
}

interface GroupNotification {
  id: string
  groupId: string
  type: NotificationType
  timestamp: number
  expirationTime: number
  
  // Content
  title: string
  content: NotificationContent
  urgency: UrgencyLevel
  visibility: VisibilityLevel
  
  // Targeting
  targetAudience: AudienceFilter[]
  exclusions: ExclusionFilter[]
  geographicScope: GeographicScope
  
  // Interaction
  responses: NotificationResponse[]
  readCount: number
  interactionCount: number
  effectiveness: EffectivenessScore
}

type NotificationType = 
  | 'group_formation' | 'recruitment_open' | 'territorial_claim'
  | 'gang_warning' | 'alliance_announcement' | 'conflict_declaration'
  | 'event_invitation' | 'resource_sharing' | 'leadership_change'
  | 'achievement_celebration' | 'memorial_notice' | 'emergency_alert'

interface RecruitmentNotice {
  groupId: string
  position: string
  requirements: RecruitmentRequirement[]
  benefits: MembershipBenefit[]
  applicationProcess: ApplicationProcess
  contactMethod: ContactMethod
  deadline: number
}

interface TerritorialClaim {
  groupId: string
  territory: Territory
  claimType: ClaimType
  justification: ClaimJustification
  disputeResolution: DisputeResolutionMethod
  enforcementMethod: EnforcementMethod
}
```

### 4. Memory-Efficient Group Data Management
Create `optimization/groups/GroupMemoryOptimizer.ts` with:
```typescript
interface GroupMemoryOptimizer {
  // Data structure optimization
  optimizeGroupStorage: (groups: Group[]) => OptimizedGroupStorage
  compressRelationshipData: (relationships: GroupRelationship[]) => CompressedRelationships
  implementHierarchicalCaching: (groups: Group[]) => HierarchicalCache
  
  // Memory management
  manageGroupMemory: (activeGroups: Group[]) => MemoryManagement
  streamLargeGroups: (largeGroups: LargeGroup[]) => GroupStreamingSystem
  cacheFrequentlyAccessedData: (accessPatterns: AccessPattern[]) => CachingStrategy
  
  // Relationship optimization
  optimizeRelationshipGraph: (relationships: Relationship[]) => OptimizedGraph
  implementSpatialIndexing: (groups: Group[]) => SpatialIndex
  compressHistoricalData: (groupHistory: GroupHistory[]) => CompressedHistory
  
  // Performance optimization
  implementLazyLoading: (groups: Group[]) => LazyLoadingSystem
  batchGroupOperations: (operations: GroupOperation[]) => BatchedOperations
  optimizeQueryPerformance: (queries: GroupQuery[]) => QueryOptimization
}

interface OptimizedGroupStorage {
  // Hierarchical storage
  primaryIndex: GroupPrimaryIndex
  relationshipIndex: RelationshipIndex
  activityIndex: ActivityIndex
  territoryIndex: TerritoryIndex
  
  // Compression strategies
  membershipCompression: MembershipCompressionStrategy
  historyCompression: HistoryCompressionStrategy
  communicationCompression: CommunicationCompressionStrategy
  
  // Caching systems
  hotDataCache: HotDataCache
  recentActivityCache: RecentActivityCache
  frequentQueryCache: FrequentQueryCache
  
  // Memory pools
  groupObjectPool: GroupObjectPool
  memberObjectPool: MemberObjectPool
  relationshipObjectPool: RelationshipObjectPool
}

interface AdvancedGroupDataStructures {
  // Graph structures for relationships
  relationshipGraph: AdjacencyListGraph<GroupRelationship>
  influenceNetwork: WeightedGraph<InfluenceRelation>
  conflictGraph: ConflictGraph<InterGroupConflict>
  
  // Spatial structures for territory
  territorialQuadTree: QuadTree<Territory>
  proximityIndex: KDTree<GroupLocation>
  spatialClusters: ClusteringIndex<GroupCluster>
  
  // Temporal structures for activities
  activityTimeline: SegmentTree<GroupActivity>
  eventSequence: FenwickTree<GroupEvent>
  historicalIndex: BTreeIndex<HistoricalEvent>
  
  // Hierarchical structures for organization
  groupHierarchy: TreapTree<GroupHierarchy>
  leadershipTree: RedBlackTree<LeadershipStructure>
  membershipTrie: RadixTrie<MembershipData>
}
```

### 5. Inter-Group Conflict and Alliance Systems
Create `systems/groups/InterGroupDynamics.ts` with:
```typescript
interface InterGroupDynamicsManager {
  // Conflict management
  detectConflictPotential: (groups: Group[]) => ConflictPotential[]
  escalateConflicts: (conflicts: GroupConflict[]) => ConflictEscalation[]
  mediateConflicts: (conflicts: GroupConflict[], mediators: AISimulant[]) => MediationResult[]
  resolveConflicts: (conflicts: GroupConflict[]) => ConflictResolution[]
  
  // Alliance formation
  identifyAllianceOpportunities: (groups: Group[]) => AllianceOpportunity[]
  negotiateAlliances: (opportunity: AllianceOpportunity) => AllianceNegotiation
  formalizeAlliances: (negotiation: AllianceNegotiation) => Alliance
  maintainAlliances: (alliances: Alliance[]) => AllianceMaintenance[]
  
  // Competition dynamics
  manageCompetition: (competitors: Group[], resources: Resource[]) => CompetitionManagement
  facilitateCooperation: (groups: Group[], sharedGoals: SharedGoal[]) => CooperationFacilitation
  balancePowerDynamics: (groups: Group[]) => PowerBalancing
  
  // Diplomatic relations
  establishDiplomacy: (groups: Group[]) => DiplomaticRelations
  conductNegotiations: (parties: Group[], issues: DiplomaticIssue[]) => Negotiation
  manageTreaties: (treaties: InterGroupTreaty[]) => TreatyManagement
}

interface InterGroupConflict {
  id: string
  participants: ConflictParticipant[]
  conflictType: ConflictType
  origins: ConflictOrigin[]
  
  // Conflict dynamics
  intensity: ConflictIntensity
  scope: ConflictScope
  duration: ConflictDuration
  escalationPattern: EscalationPattern
  
  // Stakes and issues
  disputedResources: DisputedResource[]
  territorialDisputes: TerritorialDispute[]
  ideologicalDifferences: IdeologicalDifference[]
  personalGrievances: PersonalGrievance[]
  
  // Resolution mechanisms
  resolutionAttempts: ResolutionAttempt[]
  mediationEfforts: MediationEffort[]
  ceasefires: Ceasefire[]
  peaceTerms: PeaceTerms
}

interface GroupAlliance {
  id: string
  members: AllianceMember[]
  allianceType: AllianceType
  formationDate: number
  
  // Alliance structure
  leadership: AllianceLeadership
  governance: AllianceGovernance
  obligations: MutualObligation[]
  benefits: AllianceBenefit[]
  
  // Operational aspects
  sharedResources: SharedResource[]
  jointActivities: JointActivity[]
  coordinatedActions: CoordinatedAction[]
  informationSharing: InformationSharing
  
  // Stability factors
  cohesion: AllianceCohesion
  trust: TrustLevel
  commitment: CommitmentLevel
  effectiveness: AllianceEffectiveness
}

type ConflictType = 
  | 'resource_competition' | 'territorial_dispute' | 'ideological_conflict'
  | 'personal_vendetta' | 'power_struggle' | 'cultural_clash'
  | 'economic_rivalry' | 'reputation_contest' | 'succession_dispute'

type AllianceType = 
  | 'defensive_pact' | 'economic_partnership' | 'cultural_exchange'
  | 'mutual_assistance' | 'joint_venture' | 'strategic_alliance'
  | 'confederation' | 'coalition' | 'federation'
```

### 6. Collective Decision-Making and Coordination
Create `systems/groups/GroupCoordination.ts` with:
- Distributed decision-making algorithms for group choices
- Task coordination and work distribution systems
- Information sharing and communication protocols
- Collective goal setting and achievement tracking
- Group learning and adaptation mechanisms
- Crisis response and emergency coordination

## SUCCESS CRITERIA
- [ ] Groups form dynamically based on natural social interactions
- [ ] Gang behaviors emerge authentically with realistic patterns
- [ ] Notification board integration provides effective group communication
- [ ] Memory optimization handles complex group relationships efficiently
- [ ] Inter-group conflicts and alliances create meaningful dynamics
- [ ] Collective decision-making produces coherent group actions
- [ ] Performance remains optimal with multiple active groups
- [ ] Integration enhances existing social and communication systems

## PERFORMANCE SPECIFICATIONS
```typescript
const PERFORMANCE_TARGETS = {
  groupFormation: {
    formationDetectionTime: 500,     // ms for formation opportunity analysis
    groupCreationTime: 1000,         // ms for group establishment
    maxActiveGroups: 50,             // Concurrent active groups
    membershipProcessingTime: 200    // ms for membership decisions
  },
  
  gangBehavior: {
    behaviorCalculationTime: 300,    // ms for gang behavior decisions
    territorialUpdateTime: 400,      // ms for territorial calculations
    conflictProcessingTime: 800,     // ms for conflict resolution
    loyaltyUpdateRate: 5             // Hz for loyalty system updates
  },
  
  notificationBoard: {
    postingTime: 100,                // ms for notification posting
    maxNotifications: 200,           // Notifications per board
    readingTime: 50,                 // ms for AI notification reading
    impactAnalysisTime: 300          // ms for notification impact analysis
  },
  
  memoryOptimization: {
    relationshipCompressionRatio: 0.4, // 60% memory reduction
    groupDataCompressionRatio: 0.3,    // 70% memory reduction
    cacheHitRate: 0.85,                // Cache efficiency
    memoryUsagePerGroup: 2              // MB per active group
  }
}
```

## ERROR HANDLING STRATEGY
```typescript
const ERROR_HANDLING = {
  groupFormationFailure: {
    fallbackToSmallerGroup: true,
    retryWithDifferentMembers: true,
    simplifyGroupStructure: true,
    logFormationIssues: true
  },
  
  gangConflictEscalation: {
    implementCoolingOff: true,
    involveNeutralMediator: true,
    preventViolence: true,
    documentConflictHistory: true
  },
  
  notificationOverload: {
    prioritizeUrgentMessages: true,
    implementRateLimiting: true,
    archiveOldNotifications: true,
    notifySystemAdministrators: true
  },
  
  memoryPressure: {
    archiveInactiveGroups: true,
    compressHistoricalData: true,
    streamLargeGroupData: true,
    alertPerformanceMonitor: true
  }
}
```

## DEBUG SYSTEM IMPLEMENTATION
Create `debug/groups/GroupBehaviorDebugger.ts` with:
```typescript
interface GroupBehaviorDebugger {
  // Group analysis
  analyzeGroupDynamics: (groupId: string) => GroupDynamicsAnalysis
  showLoyaltyNetworks: (groupId: string) => LoyaltyNetworkVisualization
  trackGroupEvolution: (groupId: string, timeRange: TimeRange) => EvolutionAnalysis
  showTerritorialBehavior: (groupId: string) => TerritorialBehaviorAnalysis
  
  // Conflict analysis
  analyzeInterGroupConflicts: () => ConflictAnalysisReport
  showAllianceNetworks: () => AllianceNetworkVisualization
  trackPowerDynamics: (timeRange: TimeRange) => PowerDynamicsAnalysis
  
  // Performance monitoring
  getGroupPerformanceMetrics: () => GroupPerformanceMetrics
  getMemoryOptimizationStats: () => MemoryOptimizationStats
  getNotificationBoardMetrics: () => NotificationBoardMetrics
  
  // Testing utilities
  simulateGroupFormation: (parameters: GroupFormationParameters) => SimulationResult
  stressTestGroupSystem: (groupCount: number) => StressTestResults
  benchmarkGroupOperations: () => BenchmarkResults
  
  // Data export
  exportGroupData: (groupIds: string[]) => GroupDataExport
  exportConflictHistory: (timeRange: TimeRange) => ConflictHistoryExport
  generateGroupBehaviorReport: () => ComprehensiveGroupReport
}
```

## TESTING VALIDATION

### Unit Tests
- [ ] Group formation logic and criteria validation
- [ ] Gang behavior pattern implementation and consistency
- [ ] Notification board posting and reading functionality
- [ ] Memory optimization effectiveness and data integrity
- [ ] Inter-group conflict detection and resolution
- [ ] Alliance formation and maintenance systems

### Integration Tests
- [ ] Group system integration with existing AI social dynamics
- [ ] Notification board integration with communication systems
- [ ] Memory optimization impact on system performance
- [ ] Multi-group interaction and relationship management
- [ ] Gang behavior integration with territorial and navigation systems
- [ ] Collective decision-making integration with AI personalities

### Behavioral Tests
- [ ] Natural group formation from social interactions
- [ ] Realistic gang behavior evolution and patterns
- [ ] Effective notification system usage by AI simulants
- [ ] Meaningful inter-group conflicts and alliances
- [ ] Coherent collective decision-making and coordination
- [ ] Appropriate loyalty and membership dynamics

## FILES TO CREATE
```
systems/groups/
├── GroupFormationEngine.ts     # Dynamic group formation
├── GangBehaviorManager.ts      # Gang behavior patterns
├── InterGroupDynamics.ts       # Inter-group relations
├── GroupCoordination.ts        # Collective coordination
└── __tests__/
    ├── GroupFormationEngine.test.ts
    ├── GangBehaviorManager.test.ts
    └── InterGroupDynamics.test.ts

components/groups/
├── GroupNotificationBoard.tsx  # Notification board UI
├── GroupManagementPanel.tsx    # Group management interface
├── TerritorialMap.tsx         # Territory visualization
├── ConflictResolutionUI.tsx   # Conflict resolution interface
└── __tests__/
    ├── GroupNotificationBoard.test.tsx
    ├── GroupManagementPanel.test.tsx
    └── TerritorialMap.test.tsx

optimization/groups/
├── GroupMemoryOptimizer.ts     # Memory optimization
├── RelationshipGraphManager.ts # Relationship data structures
├── GroupDataCompression.ts     # Data compression systems
├── PerformanceOptimizer.ts     # Group performance optimization
└── __tests__/
    ├── GroupMemoryOptimizer.test.ts
    ├── RelationshipGraphManager.test.ts
    └── GroupDataCompression.test.ts

ai/groups/
├── GroupDecisionMaking.ts      # Collective decision systems
├── LoyaltyManager.ts          # Loyalty and commitment systems
├── TerritorialBehavior.ts     # Territorial behavior modeling
├── RecruitmentEngine.ts       # Recruitment and membership
└── __tests__/
    ├── GroupDecisionMaking.test.ts
    ├── LoyaltyManager.test.ts
    └── TerritorialBehavior.test.ts

store/
├── groupStore.ts              # Group state management
├── gangBehaviorStore.ts       # Gang behavior state
├── territoryStore.ts          # Territorial data management
└── __tests__/
    ├── groupStore.test.ts
    ├── gangBehaviorStore.test.ts
    └── territoryStore.test.ts

types/
├── groups.ts                  # Group system types
├── gang-behavior.ts           # Gang behavior types
├── territories.ts             # Territorial behavior types
└── inter-group.ts             # Inter-group relation types

debug/groups/
├── GroupBehaviorDebugger.ts   # Debug tools
├── TerritorialVisualizer.ts   # Territory visualization
├── ConflictAnalyzer.ts        # Conflict analysis tools
└── GroupDebugPanel.tsx        # React debug interface

examples/
├── groupFormationExample.tsx  # Group formation examples
├── gangBehaviorExample.tsx    # Gang behavior examples
├── territorialExample.tsx     # Territorial behavior examples
└── notificationBoardExample.tsx # Notification board usage
```

## INTEGRATION REQUIREMENTS
- Integrate with existing AI personality and social dynamics systems
- Connect with current communication channels and news systems
- Use existing notification board infrastructure for group announcements
- Support current AI society formation and governance systems
- Maintain compatibility with existing world navigation and territorial systems
- Follow established performance monitoring and memory optimization patterns
- Integrate with existing multiplayer and networking infrastructure
- Support existing debug and development tool systems

## EXPECTED OUTPUT
A comprehensive grouping and gang behavior system that:
1. **Enables dynamic group formation** with natural emergence from social interactions
2. **Creates realistic gang behaviors** with territorial, loyalty, and conflict dynamics
3. **Provides effective notification systems** for group communication and announcements
4. **Optimizes memory usage** through advanced data structures and algorithms
5. **Manages inter-group relations** with conflicts, alliances, and diplomatic mechanisms
6. **Supports collective decision-making** and coordinated group actions
7. **Maintains high performance** with multiple active groups and complex relationships
8. **Integrates seamlessly** with existing AI social and communication systems
9. **Creates emergent social dynamics** that enhance the living world experience
10. **Provides comprehensive tools** for monitoring and debugging group behaviors

The implementation should create a rich social ecosystem where groups form naturally, develop unique cultures and behaviors, and interact meaningfully with each other, contributing to the emergence of a complex and engaging digital society within the Descendants metaverse.
