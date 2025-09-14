# CRITICAL ANALYSIS & CORRECTION PROMPT FOR FEATURES 6-10 SEQUENCE REORDERING

## EXECUTIVE SUMMARY
Critical architectural dependency inversion and logical sequence violations detected in features 6-10. Immediate reordering required to prevent downstream development blocking and integration failures.

## CRITICAL ISSUES IDENTIFIED

### 1. DEPENDENCY INVERSION CRISIS
**Issue**: F10-ADVANCED-DATA-STRUCTURES positioned LAST but contains foundational primitives required by F04-RATE-GOVERNOR and F05-BEHAVIOR-ORCHESTRATOR.

**Evidence**:
- F04 Rate Governor requires `TokenBucketMap`, `PriorityQueue`, `BoundedRingBuffer`
- F05 Behavior Orchestrator requires `WeightedScorer`, `StructuralDigest`, `RingBuffer`
- F10 provides ALL these primitives but comes after consumers

**Impact**: BLOCKING - Cannot implement F04/F05 without F10 primitives

### 2. UI FEEDBACK LOOP PLACEMENT ERROR
**Issue**: F08-UI-ENHANCEMENTS positioned too late in sequence (position 8/10).

**Evidence**:
- Early features (F02-Engine, F04-RateGovernor) generate events needing visualization
- Debugging complex systems without UI telemetry creates blind development
- Current sequence forces building 6 complex systems before basic observability

**Impact**: HIGH - Development velocity and debugging capability severely impacted

### 3. MEMORY-BEHAVIOR DEPENDENCY VIOLATION
**Issue**: F09-MEMORY-SYSTEM comes after F05-BEHAVIOR-ORCHESTRATOR despite being a dependency.

**Evidence**:
- F05 Behavior Orchestrator MASTER_PROMPT references: "memory integration", "perception cache", "memory summarization"
- F09 provides the memory APIs that F05 behavior strategies consume
- Circular reference: F05 depends on F09 memory, but F09 positioned after F05

**Impact**: BLOCKING - Cannot implement agent memory-based reasoning

### 4. PHYSICS INTEGRATION TIMING MISMATCH
**Issue**: F06-PHYSICS positioned after F05-BEHAVIOR-ORCHESTRATOR but behavior needs physics for world interaction.

**Evidence**:
- F05 mentions "spatial queries", "world mutations", "perception diff"
- F06 provides physics bodies, collision detection, spatial queries
- F07 builds collision sensors needed for F05 perception

**Impact**: MEDIUM-HIGH - Agent behavior planning lacks world physics context

## CORRECTED SEQUENCE (PROPOSED)

```
ORIGINAL SEQUENCE          →    CORRECTED SEQUENCE
F01: Female Avatar         →    F01: Female Avatar (unchanged)
F02: Engine               →    F02: Engine (unchanged)  
F03: Gemini Integration   →    F03: Advanced Data Structures (was F10)
F04: Rate Governor        →    F04: UI Enhancements (was F08)
F05: Behavior Orchestrator →    F05: Physics Integration (was F06)
F06: Physics              →    F06: Collision System (was F07)
F07: Collision System     →    F07: Memory System (was F09)
F08: UI Enhancements      →    F08: Gemini Integration (was F03)
F09: Memory System        →    F09: Rate Governor (was F04)
F10: Advanced Data Struct →    F10: Behavior Orchestrator (was F05)
```

## JUSTIFICATION FOR REORDERING

### Wave 1 Foundation (F01-F02)
- F01: Assets ready for testing
- F02: Core authority & event system

### Wave 2 Infrastructure (F03-F04)  
- F03: Data structures provide primitives for all subsequent features
- F04: UI enables early feedback loops & debugging of complex systems

### Wave 3 World Simulation (F05-F06)
- F05: Physics provides world reality layer
- F06: Collision adds sensor/trigger abstraction for AI perception

### Wave 4 Cognition Support (F07-F08)
- F07: Memory provides episodic/semantic storage for agents
- F08: Gemini connects LLM reasoning (depends on memory context)

### Wave 5 Resource & Behavior Management (F09-F10)
- F09: Rate Governor manages LLM resource consumption  
- F10: Behavior Orchestrator synthesizes all prior systems for autonomous agents

## INTEGRATION FIXES REQUIRED

### Cross-Reference Updates Needed:
1. **F04 Rate Governor** → Update references to use F03 TokenBucketMap, TimeWheelScheduler
2. **F05 Physics** → Update Engine integration examples to use F02 event patterns
3. **F07 Memory** → Update LLM integration to reference F08 Gemini adapters (not F03)
4. **F08 Gemini** → Update memory context loading to use F07 Memory System APIs
5. **F09 Rate Governor** → Update LLM throttling integration to use F08 Gemini adapters
6. **F10 Behavior** → Update all subsystem references to match new numbering

### Event Taxonomy Conflicts:
- **CONFLICT**: F06 Collision & F05 Physics both emit `physics:*` events
- **FIX**: Namespace as `physics:core:*` vs `collision:*` events

### Environment Variable Conflicts:
- **CONFLICT**: Both F08 Gemini & F09 Rate Governor define `GEMINI_*` variables
- **FIX**: Consolidate in F08, reference from F09

### Performance Target Inconsistencies:
- **ISSUE**: F03 Data Structures claims `>5M ops/sec` but F09 Rate Governor targets `<0.05ms`
- **CHECK**: Verify mathematical consistency of performance claims

## CRITICAL PROMPT CONTENT FIXES

### 1. Master Prompt Template Inconsistencies
**Issue**: Sub-prompt templates vary between features
**Fix Required**: Standardize template structure across all 10 features

### 2. Acceptance Criteria Gaps
**Issue**: Some features lack determinism requirements others specify
**Fix Required**: Add determinism AC to F06, F07, F08 where missing

### 3. Error Taxonomy Overlaps
**Issue**: Multiple features define similar error codes (e.g., `*_CONFIG_INVALID`)
**Fix Required**: Consolidate into shared error taxonomy or namespace properly

### 4. Sub-Prompt Count Inconsistencies
**Issue**: Feature complexity doesn't match sub-prompt count (F10 has 25, F01 has 10)
**Fix Required**: Rebalance sub-prompt distribution based on actual complexity

## EXECUTION PLAN FOR CODING AGENT

### Phase 1: File Reorganization (IMMEDIATE)
```bash
# Rename directories to correct sequence
mv 03-GEMINI-INTEGRATION 08-GEMINI-INTEGRATION-TEMP
mv 04-RATE-GOVERNOR 09-RATE-GOVERNOR-TEMP  
mv 05-BEHAVIOR-ORCHESTRATOR 10-BEHAVIOR-ORCHESTRATOR-TEMP
mv 06-PHYSICS 05-PHYSICS-TEMP
mv 07-COLLISION-SYSTEM 06-COLLISION-SYSTEM-TEMP
mv 08-UI-ENHANCEMENTS 04-UI-ENHANCEMENTS-TEMP
mv 09-MEMORY-SYSTEM 07-MEMORY-SYSTEM-TEMP
mv 10-ADVANCED-DATA-STRUCTURES 03-ADVANCED-DATA-STRUCTURES-TEMP

# Remove -TEMP suffixes
for dir in *-TEMP; do mv "$dir" "${dir%-TEMP}"; done
```

### Phase 2: Content Updates (SYSTEMATIC)
1. **Update Feature IDs**: Change all `F0X-*` references to match new sequence
2. **Update Cross-References**: Fix all "Feature X depends on Feature Y" statements  
3. **Update Integration Sections**: Rewrite integration touchpoints for new sequence
4. **Update Execution Triggers**: Change `GENERATE_F0X_SUB_PROMPTS_v1` to match new numbers

### Phase 3: Content Quality Fixes (COMPREHENSIVE)
1. **Standardize Templates**: Apply single template format to all sub-prompt generation sections
2. **Consolidate Error Codes**: Create shared error taxonomy file, reference from features
3. **Unify Event Naming**: Establish event naming convention, update all features
4. **Reconcile ENV Variables**: Merge overlapping config variables, update references
5. **Validate Performance Targets**: Check mathematical consistency of all performance claims

### Phase 4: Integration Verification (VALIDATION)
1. **Dependency Check**: Verify each feature only references prior features in sequence
2. **API Compatibility**: Ensure interface definitions don't conflict between features  
3. **Event Flow Validation**: Trace event emission/consumption across feature boundaries
4. **Test Strategy Alignment**: Ensure test strategies don't assume wrong feature ordering

## SPECIFIC FILES TO MODIFY

### Master Prompt Files (Content Updates):
- `03-ADVANCED-DATA-STRUCTURES/MASTER_PROMPT.md` (was F10)
- `04-UI-ENHANCEMENTS/MASTER_PROMPT.md` (was F08)  
- `05-PHYSICS/MASTER_PROMPT.md` (was F06)
- `06-COLLISION-SYSTEM/MASTER_PROMPT.md` (was F07)
- `07-MEMORY-SYSTEM/MASTER_PROMPT.md` (was F09)
- `08-GEMINI-INTEGRATION/MASTER_PROMPT.md` (was F03)
- `09-RATE-GOVERNOR/MASTER_PROMPT.md` (was F04)
- `10-BEHAVIOR-ORCHESTRATOR/MASTER_PROMPT.md` (was F05)

### Sequence Plan File (Major Rewrite):
- `FEATURES_SEQUENCE_PLAN.md` - Update feature list, dependencies, parallel lanes

### Cross-Reference Updates:
Search and replace ALL instances of:
- `F03-GEMINI` → `F08-GEMINI`
- `F04-RATE` → `F09-RATE`  
- `F05-BEHAVIOR` → `F10-BEHAVIOR`
- `F06-PHYSICS` → `F05-PHYSICS`
- `F07-COLLISION` → `F06-COLLISION`
- `F08-UI` → `F04-UI`
- `F09-MEMORY` → `F07-MEMORY`
- `F10-ADVANCED` → `F03-ADVANCED`

## VALIDATION CRITERIA (POST-FIX)

### Dependency Flow Validation:
✅ F03 (Data Structures) provides primitives used by F09 (Rate Governor)
✅ F04 (UI) can visualize events from F02 (Engine) onward  
✅ F05 (Physics) integrates with F02 (Engine) authority
✅ F06 (Collision) builds upon F05 (Physics) foundation
✅ F07 (Memory) provides context for F08 (Gemini) reasoning
✅ F08 (Gemini) LLM calls are governed by F09 (Rate Governor)
✅ F10 (Behavior) orchestrates all prior systems for autonomous agents

### Integration Validation:
✅ No circular dependencies between features
✅ All cross-feature API references point to prior features only
✅ Event emission/consumption flows logically through sequence
✅ Environment variables consolidated without conflicts
✅ Performance targets mathematically consistent

## PRIORITY: CRITICAL 🔴
**This reordering MUST be completed before ANY sub-prompt generation or implementation begins. The current sequence will cause development deadlock.**

## ESTIMATED EFFORT
- **File Reorganization**: 30 minutes
- **Content Updates**: 2-4 hours  
- **Quality Fixes**: 4-6 hours
- **Integration Verification**: 2-3 hours
- **Total**: 8.5-13.5 hours

## SUCCESS METRICS
1. ✅ All features reference only prior features in dependency statements
2. ✅ All trigger phrases match corrected feature numbers  
3. ✅ No environment variable or event name conflicts
4. ✅ Dependency flow validation passes for all 10 features
5. ✅ Performance targets mathematically consistent across features

**EXECUTE IMMEDIATELY TO PREVENT DOWNSTREAM BLOCKING**