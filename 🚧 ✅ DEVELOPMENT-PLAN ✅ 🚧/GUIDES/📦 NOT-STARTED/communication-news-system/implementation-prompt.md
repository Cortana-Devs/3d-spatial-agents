# Communication Channels & News System - Comprehensive Development Prompt

## CONTEXT
You are implementing a sophisticated communication and news broadcasting system for the Descendants metaverse that provides real-time information sharing, news distribution, and communication channels for both AI simulants and human participants. The system includes premium news broadcasting features, billboard displays using GLB models, world sensitivity monitoring, and multi-channel communication networks that serve as the information backbone of the digital society.

Current Architecture:
- AI simulant system with social dynamics and society formation
- React Three Fiber for 3D rendering and GLB model support
- Gemini AI integration for content generation and analysis
- World store for state management and event tracking
- Communication systems established for basic interaction
- Existing UI components and interface patterns

## OBJECTIVE
Create a comprehensive communication and news ecosystem that enables information flow throughout the metaverse, provides professional-grade news broadcasting, supports multiple communication channels, offers world event monitoring and reporting, and integrates seamlessly with AI society dynamics and human interaction systems.

## REQUIREMENTS
- Multi-channel communication system with different access levels
- Professional news broadcasting with automated content generation
- Billboard displays using GLB models for visual news presentation
- World sensitivity monitoring and event detection systems
- Premium news features with analysis and commentary
- Cross-species communication (human-AI, AI-AI, human-human)
- Real-time information distribution and notification systems
- Integration with AI society dynamics and decision-making

## COMMUNICATION SYSTEM ARCHITECTURE
```typescript
// Core communication infrastructure
interface CommunicationSystem {
  channels: Map<string, CommunicationChannel>
  newsNetwork: NewsNetwork
  billboards: Map<string, NewsBillboard>
  worldMonitor: WorldSensitivityMonitor
  
  // Communication management
  messageRouter: MessageRouter
  contentModerator: ContentModerator
  notificationSystem: NotificationSystem
  
  // Premium features
  analyticsEngine: NewsAnalyticsEngine
  trendingTopics: TrendingTopicsManager
  liveReporting: LiveReportingSystem
}

interface CommunicationChannel {
  id: string
  name: string
  type: ChannelType
  accessLevel: AccessLevel
  participants: Participant[]
  
  // Channel properties
  isPublic: boolean
  isModerated: boolean
  isPersistent: boolean
  isEncrypted: boolean
  
  // Message management
  messages: Message[]
  messageHistory: MessageHistory
  messageFilters: MessageFilter[]
  
  // AI integration
  aiParticipants: AIParticipant[]
  autoTranslation: boolean
  contentSummarization: boolean
  smartNotifications: boolean
}

type ChannelType = 
  | 'public_forum' | 'society_internal' | 'diplomatic'
  | 'emergency' | 'news_broadcast' | 'entertainment'
  | 'trade_commerce' | 'cultural_exchange' | 'scientific'
  | 'private_message' | 'group_chat' | 'announcement'

interface NewsNetwork {
  stations: Map<string, NewsStation>
  journalists: Map<string, AIJournalist>
  editors: Map<string, AIEditor>
  
  // Content management
  stories: NewsStory[]
  breakingNews: BreakingNewsAlert[]
  scheduledBroadcasts: ScheduledBroadcast[]
  
  // Premium features
  liveReporting: LiveReport[]
  investigativeReports: InvestigativeReport[]
  weatherForecasts: WeatherForecast[]
  economicAnalysis: EconomicReport[]
}
```

## IMPLEMENTATION TASKS

### 1. Multi-Channel Communication System
Create `systems/communication/CommunicationManager.tsx` with:
```typescript
interface CommunicationManagerProps {
  enabledChannels: ChannelType[]
  moderationLevel: ModerationLevel
  enableAIParticipation: boolean
  enableRealTimeTranslation: boolean
  onMessageReceived?: (message: Message, channel: string) => void
  onChannelActivity?: (activity: ChannelActivity) => void
}

interface CommunicationManager {
  // Channel management
  createChannel: (config: ChannelConfig) => CommunicationChannel
  joinChannel: (channelId: string, participant: Participant) => JoinResult
  leaveChannel: (channelId: string, participantId: string) => void
  moderateChannel: (channelId: string, action: ModerationAction) => void
  
  // Message handling
  sendMessage: (channelId: string, message: MessageContent, sender: Sender) => void
  broadcastMessage: (channels: string[], message: BroadcastMessage) => void
  scheduleMessage: (channelId: string, message: MessageContent, scheduleTime: number) => void
  
  // AI integration
  enableAIModeration: (channelId: string, rules: ModerationRules) => void
  generateAIResponse: (message: Message, context: ChannelContext) => Promise<AIResponse>
  translateMessage: (message: Message, targetLanguage: string) => Promise<TranslatedMessage>
}

interface Message {
  id: string
  content: MessageContent
  sender: Sender
  channel: string
  timestamp: number
  
  // Message properties
  type: MessageType
  priority: Priority
  mentions: Mention[]
  reactions: Reaction[]
  
  // AI processing
  sentiment: SentimentAnalysis
  topics: Topic[]
  language: string
  translatedVersions: Map<string, string>
  
  // Moderation
  moderationStatus: ModerationStatus
  flaggedContent: FlaggedContent[]
  violationLevel: ViolationLevel
}
```

### 2. News Broadcasting System
Create `systems/news/NewsNetwork.ts` with:
```typescript
interface NewsNetworkManager {
  // News generation
  generateNewsStory: (worldEvents: WorldEvent[]) => Promise<NewsStory>
  createBreakingNews: (urgentEvent: UrgentEvent) => BreakingNewsAlert
  scheduleRegularBroadcast: (content: BroadcastContent, schedule: BroadcastSchedule) => void
  
  // Premium features
  conductInvestigativeReport: (topic: InvestigationTopic) => Promise<InvestigativeReport>
  generateWeatherForecast: (worldData: WeatherData) => WeatherForecast
  analyzeEconomicTrends: (economicData: EconomicData) => EconomicAnalysis
  
  // Live reporting
  startLiveReport: (event: LiveEvent, reporter: AIJournalist) => LiveReportSession
  updateLiveReport: (sessionId: string, update: LiveUpdate) => void
  endLiveReport: (sessionId: string, summary: ReportSummary) => void
  
  // Content distribution
  distributeNews: (story: NewsStory, channels: string[]) => DistributionResult
  updateBillboards: (content: BillboardContent) => void
  sendNewsNotifications: (story: NewsStory, subscribers: Subscriber[]) => void
}

interface NewsStory {
  id: string
  headline: string
  content: StoryContent
  category: NewsCategory
  priority: NewsPriority
  
  // Story metadata
  byline: string
  publishTime: number
  updateTime: number
  sources: NewsSource[]
  tags: string[]
  
  // AI generation
  generatedBy: AIJournalist
  factCheckStatus: FactCheckStatus
  biasAnalysis: BiasAnalysis
  reliabilityScore: number
  
  // Distribution
  channels: string[]
  readership: ReadershippData
  engagement: EngagementMetrics
  comments: NewsComment[]
}

type NewsCategory = 
  | 'breaking_news' | 'society_news' | 'economic_report'
  | 'cultural_events' | 'weather' | 'politics' | 'entertainment'
  | 'science_discovery' | 'construction_update' | 'diplomatic_news'
```

### 3. Billboard Display System
Create `components/news/NewsBillboard.tsx` with:
```typescript
interface NewsBillboardProps {
  billboardModel: string // GLB model path
  position: Vector3
  rotation: Euler
  scale: Vector3
  
  // Content management
  currentContent: BillboardContent
  updateInterval: number
  enableInteraction: boolean
  enableAIReading: boolean
  
  // Display settings
  textSize: number
  displayDuration: number
  transitionEffect: TransitionEffect
  lightingIntegration: boolean
  
  onContentChange?: (content: BillboardContent) => void
  onInteraction?: (interactor: Interactor) => void
}

interface BillboardContent {
  id: string
  type: ContentType
  priority: DisplayPriority
  
  // Visual content
  headline: string
  subheadline?: string
  bodyText: string
  images: BillboardImage[]
  videos: BillboardVideo[]
  
  // Interactive content
  qrCode?: QRCodeData
  callToAction?: CallToAction
  pollData?: PollData
  
  // Display properties
  backgroundColor: Color
  textColor: Color
  fontFamily: string
  layoutTemplate: LayoutTemplate
  
  // Scheduling
  displayStart: number
  displayEnd: number
  repeatInterval?: number
  targetAudience: AudienceFilter[]
}

interface BillboardInteraction {
  // Reading capabilities for AI
  enableAIReading: boolean
  readingSpeed: number
  comprehensionLevel: number
  
  // Human interaction
  enableTouch: boolean
  enableVoiceCommand: boolean
  proximityActivation: number
  
  // Feedback collection
  collectFeedback: boolean
  ratingSystem: boolean
  commentCollection: boolean
}
```

### 4. World Sensitivity Monitoring
Create `systems/monitoring/WorldSensitivityMonitor.ts` with:
```typescript
interface WorldSensitivityMonitor {
  // Event detection
  detectWorldEvents: () => WorldEvent[]
  analyzeEventSignificance: (event: WorldEvent) => SignificanceAnalysis
  predictEventImpact: (event: WorldEvent) => ImpactPrediction
  
  // Monitoring systems
  populationMonitor: PopulationMonitor
  economicMonitor: EconomicActivityMonitor
  socialMonitor: SocialDynamicsMonitor
  environmentMonitor: EnvironmentalMonitor
  
  // Reporting
  generateEventReport: (events: WorldEvent[]) => EventReport
  createTrendAnalysis: (timeRange: TimeRange) => TrendAnalysis
  issueWarnings: (threats: ThreatAssessment[]) => WarningAlert[]
  
  // Real-time updates
  streamEventUpdates: () => EventStream
  notifySubscribers: (event: WorldEvent, subscribers: EventSubscriber[]) => void
  updateNewsNetwork: (significantEvents: WorldEvent[]) => void
}

interface WorldEvent {
  id: string
  type: EventType
  timestamp: number
  location: Vector3
  
  // Event details
  description: string
  participants: EventParticipant[]
  significance: SignificanceLevel
  impact: ImpactAssessment
  
  // Context
  precedingEvents: string[]
  relatedEvents: string[]
  consequences: Consequence[]
  
  // AI analysis
  sentimentImpact: SentimentImpact
  socialImplications: SocialImplication[]
  economicEffects: EconomicEffect[]
  politicalRamifications: PoliticalRamification[]
}

type EventType = 
  | 'society_formation' | 'leadership_change' | 'economic_milestone'
  | 'cultural_innovation' | 'diplomatic_event' | 'conflict_resolution'
  | 'environmental_change' | 'technological_advancement' | 'social_movement'
  | 'celebration' | 'crisis' | 'discovery' | 'construction_completion'
```

### 5. Premium News Features
Create `systems/news/PremiumNewsFeatures.ts` with:
- Advanced analytics and trend analysis
- Investigative reporting with deep research
- Expert commentary and opinion pieces
- Live event coverage and real-time updates
- Weather forecasting and environmental reports
- Economic analysis and market predictions
- Personalized news recommendations
- Multi-perspective reporting on controversial topics

### 6. Notification and Alert System
Create `systems/notifications/NotificationManager.ts` with:
```typescript
interface NotificationManager {
  // Notification types
  sendBreakingNewsAlert: (alert: BreakingNewsAlert, recipients: Recipient[]) => void
  sendSystemNotification: (notification: SystemNotification) => void
  sendPersonalMessage: (message: PersonalMessage, recipient: Recipient) => void
  sendGroupAnnouncement: (announcement: GroupAnnouncement, group: Group) => void
  
  // Smart notifications
  analyzeNotificationImportance: (notification: Notification) => ImportanceScore
  personalizeNotifications: (recipient: Recipient, notifications: Notification[]) => PersonalizedNotification[]
  scheduleNotifications: (notifications: ScheduledNotification[]) => void
  
  // AI integration
  generateNotificationSummary: (notifications: Notification[]) => NotificationSummary
  detectSpamOrIrrelevant: (notification: Notification) => SpamDetectionResult
  enableSmartFiltering: (recipient: Recipient, filters: NotificationFilter[]) => void
}

interface NotificationBoard {
  id: string
  location: Vector3
  type: 'public' | 'society' | 'emergency' | 'trade'
  
  // Content management
  activeNotifications: Notification[]
  archivedNotifications: Notification[]
  pinnedNotifications: Notification[]
  
  // Display properties
  maxDisplayCount: number
  autoScrollSpeed: number
  priorityOrdering: boolean
  categoryFiltering: boolean
  
  // Interaction
  enableAIReading: boolean
  enableHumanInteraction: boolean
  allowComments: boolean
  allowVoting: boolean
}
```

## SUCCESS CRITERIA
- [ ] Multi-channel communication system supports diverse communication needs
- [ ] News broadcasting provides professional-quality content and analysis
- [ ] Billboard displays effectively present information using GLB models
- [ ] World monitoring detects and reports significant events automatically
- [ ] Premium features provide valuable insights and analysis
- [ ] AI participants engage meaningfully in communication channels
- [ ] Performance maintains 60 FPS with active communication systems
- [ ] Integration with existing systems enhances rather than disrupts functionality

## PERFORMANCE SPECIFICATIONS
```typescript
const PERFORMANCE_TARGETS = {
  messaging: {
    messageDeliveryTime: 100,      // ms for message delivery
    maxConcurrentChannels: 50,     // Active channels
    maxMessagesPerChannel: 10000,  // Message history limit
    messageProcessingRate: 1000    // Messages per second
  },
  
  newsGeneration: {
    storyGenerationTime: 3000,     // ms for news story creation
    breakingNewsTime: 500,         // ms for urgent alerts
    investigativeReportTime: 10000, // ms for detailed reports
    factCheckingTime: 2000         // ms for fact verification
  },
  
  billboardSystem: {
    contentUpdateTime: 200,        // ms for billboard content updates
    maxBillboards: 100,           // Concurrent billboards
    renderingImpact: 2,           // Max FPS reduction
    interactionResponseTime: 50    // ms for billboard interaction
  },
  
  worldMonitoring: {
    eventDetectionTime: 500,       // ms for event detection
    significanceAnalysisTime: 1000, // ms for event analysis
    notificationDeliveryTime: 200, // ms for notification delivery
    monitoringUpdateRate: 10       // Hz for world monitoring
  }
}
```

## ERROR HANDLING STRATEGY
```typescript
const ERROR_HANDLING = {
  messageDeliveryFailure: {
    retryWithBackoff: true,
    storeForLaterDelivery: true,
    notifySender: true,
    logFailureReason: true
  },
  
  newsGenerationError: {
    fallbackToTemplate: true,
    useAlternativeSource: true,
    skipProblematicContent: true,
    maintainBroadcastSchedule: true
  },
  
  billboardDisplayError: {
    fallbackToTextOnly: true,
    useDefaultContent: true,
    disableInteraction: true,
    logTechnicalIssues: true
  },
  
  worldMonitoringFailure: {
    useBackupSensors: true,
    reducMonitoringFrequency: true,
    alertTechnicalStaff: true,
    maintainCriticalAlerts: true
  }
}
```

## DEBUG SYSTEM IMPLEMENTATION
Create `debug/communication/CommunicationDebugger.ts` with:
```typescript
interface CommunicationDebugger {
  // Communication monitoring
  showMessageFlow: (enable: boolean) => void
  showChannelActivity: (channelId?: string) => void
  showNotificationDelivery: (enable: boolean) => void
  showBillboardUpdates: (enable: boolean) => void
  
  // News system debugging
  analyzeNewsGeneration: (timeRange: TimeRange) => NewsGenerationAnalysis
  debugFactChecking: (storyId: string) => FactCheckDebugInfo
  monitorBroadcastPerformance: () => BroadcastPerformanceData
  
  // Performance monitoring
  getCommunicationMetrics: () => CommunicationMetrics
  getNewsSystemPerformance: () => NewsSystemMetrics
  getBillboardRenderingStats: () => BillboardRenderingStats
  
  // Testing utilities
  simulateMessageFlood: (channelId: string, messageCount: number) => void
  testNewsGeneration: (eventData: TestEventData) => void
  benchmarkBillboardUpdates: (updateCount: number) => void
  
  // Data export
  exportCommunicationLogs: (timeRange: TimeRange) => CommunicationLogExport
  exportNewsArchive: (dateRange: DateRange) => NewsArchiveExport
  generateCommunicationReport: () => CommunicationAnalysisReport
}
```

## TESTING VALIDATION

### Unit Tests
- [ ] Message routing and delivery systems
- [ ] News story generation and content quality
- [ ] Billboard content management and display
- [ ] World event detection and analysis
- [ ] Notification system reliability and timing
- [ ] Communication channel access control and moderation

### Integration Tests
- [ ] Multi-channel communication with AI and human participants
- [ ] News system integration with world monitoring
- [ ] Billboard display integration with 3D world rendering
- [ ] Cross-system notification and alert distribution
- [ ] Performance impact on existing world systems
- [ ] Real-time communication during high activity periods

### Content Quality Tests
- [ ] News story accuracy and relevance assessment
- [ ] AI-generated content coherence and engagement
- [ ] Billboard content readability and visual appeal
- [ ] Notification timing and importance accuracy
- [ ] Communication moderation effectiveness
- [ ] Cross-cultural and cross-species communication clarity

## FILES TO CREATE
```
systems/communication/
├── CommunicationManager.tsx     # Core communication system
├── ChannelManager.ts           # Channel management
├── MessageRouter.ts            # Message routing and delivery
├── ContentModerator.ts         # Content moderation
└── __tests__/
    ├── CommunicationManager.test.tsx
    ├── ChannelManager.test.ts
    └── MessageRouter.test.ts

systems/news/
├── NewsNetwork.ts              # News broadcasting system
├── NewsGeneration.ts           # AI news generation
├── PremiumNewsFeatures.ts      # Advanced news features
├── LiveReporting.ts            # Live event coverage
└── __tests__/
    ├── NewsNetwork.test.ts
    ├── NewsGeneration.test.ts
    └── LiveReporting.test.ts

components/news/
├── NewsBillboard.tsx           # Billboard display component
├── NewsReader.tsx              # News reading interface
├── NewsSubscription.tsx        # Subscription management
├── LiveNewsStream.tsx          # Live news streaming
└── __tests__/
    ├── NewsBillboard.test.tsx
    ├── NewsReader.test.tsx
    └── LiveNewsStream.test.tsx

systems/monitoring/
├── WorldSensitivityMonitor.ts  # World event monitoring
├── EventDetection.ts           # Event detection algorithms
├── TrendAnalysis.ts            # Trend analysis and prediction
├── ImpactAssessment.ts         # Event impact evaluation
└── __tests__/
    ├── WorldSensitivityMonitor.test.ts
    ├── EventDetection.test.ts
    └── TrendAnalysis.test.ts

systems/notifications/
├── NotificationManager.ts      # Notification system
├── NotificationBoard.tsx       # Notification board component
├── AlertSystem.ts              # Emergency alert system
├── SmartFiltering.ts           # Intelligent notification filtering
└── __tests__/
    ├── NotificationManager.test.ts
    ├── AlertSystem.test.ts
    └── SmartFiltering.test.ts

store/
├── communicationStore.ts       # Communication state management
├── newsStore.ts               # News system state
├── notificationStore.ts        # Notification state
└── __tests__/
    ├── communicationStore.test.ts
    ├── newsStore.test.ts
    └── notificationStore.test.ts

types/
├── communication.ts            # Communication system types
├── news.ts                    # News system types
├── notifications.ts           # Notification types
└── monitoring.ts              # World monitoring types

debug/communication/
├── CommunicationDebugger.ts   # Debug tools
├── NewsAnalyzer.ts            # News system analysis
├── BillboardProfiler.ts       # Billboard performance analysis
└── CommunicationDebugPanel.tsx # React debug interface

examples/
├── communicationExample.tsx    # Communication system usage
├── newsSystemExample.tsx       # News broadcasting examples
├── billboardExample.tsx        # Billboard implementation
└── worldMonitoringExample.tsx  # Event monitoring examples
```

## INTEGRATION REQUIREMENTS
- Integrate with existing AI simulant social dynamics and society systems
- Connect with current Gemini AI services for content generation and analysis
- Use existing world store for event detection and state management
- Support existing player controller for human interaction with billboards
- Maintain compatibility with current 3D rendering and GLB model systems
- Follow established UI/UX patterns and component architecture
- Integrate with existing performance monitoring and optimization systems
- Support existing multiplayer and networking infrastructure

## EXPECTED OUTPUT
A comprehensive communication and news system that:
1. **Enables rich multi-channel communication** for all metaverse participants
2. **Provides professional-grade news broadcasting** with AI-generated content
3. **Displays information effectively** through 3D billboard systems
4. **Monitors world events intelligently** and reports significant developments
5. **Delivers premium news features** with analysis and investigative reporting
6. **Supports cross-species communication** between humans and AI simulants
7. **Maintains high performance** with efficient messaging and content systems
8. **Integrates seamlessly** with existing social and world systems
9. **Provides comprehensive debugging** and monitoring capabilities
10. **Creates an information-rich environment** that enhances the living world experience

The implementation should establish the metaverse as a truly connected digital society with sophisticated information flow, professional news coverage, and meaningful communication that supports both autonomous AI civilization and human participation.
