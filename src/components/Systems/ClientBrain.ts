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

export class ClientBrain {
    public state: BrainState;
    private rateLimiter: RateLimiter;
    private id: string;

    constructor(id: string = 'agent-01') {
        this.id = id;
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

        // Construct Context
        const context: AgentContext = {
            position: { x: position.x, y: position.y, z: position.z },
            nearbyEntities: nearbyEntities,
            currentBehavior: currentBehavior
        };

        try {
            console.log(`[ClientBrain:${this.id}] Thinking... (Tokens left: ${this.rateLimiter.getTokensRemaining()})`);
            const responseText = await generateAgentThought(context);

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

            return decision;

        } catch (e) {
            console.error(`[ClientBrain:${this.id}] Failed to think:`, e);
            this.state.isThinking = false;
            return null;
        }
    }
}
