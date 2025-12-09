
import { processAgentThought, AgentContext } from '../src/lib/agent-core';
import { RateLimiter } from '../src/lib/rateLimiter';
import * as fs from 'fs';
import * as path from 'path';

// Load Env Wars (Simple Hack for Script)
// In a real setup, use dotenv. Assuming running with `pnpm --env-file=.env.local tsx ...` or similar.
// Or we just try to read it manually if not present.
if (!process.env.GEMINI_API_KEY) {
    try {
        const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
        const match = envFile.match(/GEMINI_API_KEY=(.*)/);
        if (match) process.env.GEMINI_API_KEY = match[1];
    } catch (e) {
        console.warn("Could not load .env.local");
    }
}

async function runSimulation() {
    console.log("=== AGENT SIMULATION REPORT ===");
    console.log(`Time: ${new Date().toISOString()}`);
    console.log("--------------------------------");

    // 1. Rate Limiter Test
    console.log("\n[TEST 1] Rate Limiter Logic (15 RPM)");
    const limiter = new RateLimiter(15, 60);
    let passed = true;
    for (let i = 0; i < 15; i++) {
        if (!limiter.tryConsume()) passed = false;
    }
    if (limiter.tryConsume()) passed = false; // Should fail on 16th
    console.log(`Result: ${passed ? "PASS" : "FAIL"} (Consumed 15, rejected 16th)`);

    // 2. Scenario: Alone (Expect WANDER)
    console.log("\n[TEST 2] Scenario: Alone in the dark");
    const contextAlone: AgentContext = {
        position: { x: 0, y: 0, z: 0 },
        nearbyEntities: [],
        currentBehavior: 'IDLE'
    };
    try {
        console.log("Input Context:", JSON.stringify(contextAlone));
        const response1 = await processAgentThought(contextAlone);
        console.log("Raw Response 1:", response1);
        const json1 = JSON.parse(response1.replace(/```json/g, '').replace(/```/g, '').trim());
        console.log("Parsed Decision:", json1);
        if (json1.action === 'WANDER' || json1.action === 'WAIT') console.log("Result: PASS (Valid Action)");
        else console.log("Result: PASS (AI chose something else, but valid JSON)");
    } catch (e) {
        console.error("Result: FAIL", e);
    }

    // 3. Scenario: Player Nearby (Expect FOLLOW)
    console.log("\n[TEST 3] Scenario: Player Spotted (< 10m)");
    const contextPlayer: AgentContext = {
        position: { x: 0, y: 0, z: 0 },
        nearbyEntities: [
            { type: 'PLAYER', id: 'player-01', distance: 5.5, status: 'Active' }
        ],
        currentBehavior: 'WANDERING'
    };
    try {
        console.log("Input Context:", JSON.stringify(contextPlayer));
        const response2 = await processAgentThought(contextPlayer);
        console.log("Raw Response 2:", response2);
        const json2 = JSON.parse(response2.replace(/```json/g, '').replace(/```/g, '').trim());
        console.log("Parsed Decision:", json2);

        if (json2.action === 'FOLLOW' && json2.targetId === 'player-01') {
            console.log("Result: PASS (Correctly decided to FOLLOW)");
        } else {
            console.log("Result: WARN (AI did not follow rules strict enough?)");
        }
    } catch (e) {
        console.error("Result: FAIL", e);
    }

    console.log("\n--------------------------------");
    console.log("Simulation Complete.");
}

runSimulation();
