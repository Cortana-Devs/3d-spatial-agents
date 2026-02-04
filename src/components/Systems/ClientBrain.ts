import * as THREE from 'three';
import { generateAgentThought, AgentContext, NearbyEntity } from '@/app/actions';

export interface BrainState {
    thought: string;
    isThinking: boolean;
    lastThoughtTime: number;
}

import { RateLimiter } from '@/lib/rateLimiter';

export interface AgentDecision {
    action: 'MOVE_TO' | 'WAIT' | 'WANDER' | 'FOLLOW';
    targetId?: string;
    target?: { x: number; y: number; z: number };
    thought: string;
}

import { memoryStream } from '@/lib/memory/MemoryStream';

// ... (BrainState and RateLimiter imports remain)

export class ClientBrain {
    public state: BrainState;
    private rateLimiter: RateLimiter;
    private id: string;
    private sessionId: string;
    private memoryInitialized = false;

    constructor(id: string = 'agent-01') {
        this.id = id;
        this.sessionId = `session-${crypto.randomUUID()}`;
        this.state = {
            thought: "Initializing neural pathways...",
            isThinking: false,
            lastThoughtTime: 0
        };
        // 15 requests per 60 seconds (Limit for Gemini Flash Free Tier)
        this.rateLimiter = new RateLimiter(15, 60);
    }

    public async update(
        position: THREE.Vector3,
        nearbyEntities: NearbyEntity[],
        currentBehavior: string
    ): Promise<AgentDecision | null> {

        // Rate Limiting Check
        if (this.state.isThinking || !this.rateLimiter.tryConsume()) {
            return null;
        }

        this.state.isThinking = true;

        if (!this.memoryInitialized) {
            await memoryStream.init();
            this.memoryInitialized = true;
        }

        // Construct Context
        const context: AgentContext = {
            position: { x: position.x, y: position.y, z: position.z },
            nearbyEntities: nearbyEntities,
            currentBehavior: currentBehavior
        };

        try {
            console.log(`[ClientBrain:${this.id}] Thinking... (Tokens left: ${this.rateLimiter.getTokensRemaining()})`);

            // --- 1. RETRIEVE MEMORIES (Client Side) ---
            const contextTags = nearbyEntities.flatMap(e => {
                const tags = [`entity:${e.type.toLowerCase()}`];
                if (e.id) tags.push(`id:${e.id}`);
                return tags;
            });

            const relevantMemories = await memoryStream.retrieve({
                tags: contextTags,
                limit: 5
            });

            const memoryContextStr = relevantMemories.length > 0
                ? relevantMemories.map(m => `- [${new Date(m.timestamp).toLocaleTimeString()}] ${m.content}`).join('\n')
                : "No relevant past memories.";

            // --- 2. THINK (Server Side) ---
            const responseText = await generateAgentThought(context, memoryContextStr, this.sessionId);

            // Clean the response (remove markdown code blocks if present)
            const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

            let decision: AgentDecision;
            try {
                decision = JSON.parse(cleanText);
            } catch (jsonError) {
                console.warn(`[ClientBrain:${this.id}] Failed to parse JSON, raw text used.`, cleanText);
                decision = {
                    action: 'WAIT',
                    thought: cleanText
                };
            }

            this.state.thought = decision.thought || "Processing...";
            this.state.lastThoughtTime = Date.now();
            this.state.isThinking = false;

            console.log(`[ClientBrain:${this.id}] Decided:`, decision);

            // --- 3. MEMORIZE (Client Side) ---
            if (decision.thought) {
                // Store the thought/action
                memoryStream.add('ACTION', decision.thought, contextTags, this.sessionId).catch(err =>
                    console.error(`[ClientBrain:${this.id}] Memory add failed:`, err)
                );
            }

            return decision;

        } catch (e) {
            console.error(`[ClientBrain:${this.id}] Failed to think:`, e);
            this.state.isThinking = false;
            return null;
        }
    }
}
