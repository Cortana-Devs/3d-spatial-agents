import { NextResponse } from "next/server";
import { db } from "@/lib/logging/db";
import type { SimulationLog } from "@/lib/logging/logger";

export async function POST(req: Request) {
  try {
    const log: SimulationLog = await req.json();

    await db.execute({
      sql: `
        INSERT INTO simulation_logs (
          timestamp, agent_id, run_id, perception, 
          response_text, response_tools, verification,
          execution_action, execution_outcome, latency_ms,
          token_count, fps, spatial_language_freq
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        log.timestamp,
        log.agent_id,
        log.run_id,
        log.perception,
        log.response.text,
        JSON.stringify(log.response.tool_calls),
        log.verification ? 1 : 0,
        log.execution.action,
        log.execution.outcome,
        log.metrics.latency_ms,
        log.metrics.token_count,
        log.metrics.fps,
        log.metrics.spatial_language_freq
      ],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API POST DB Log Error:", error);
    return NextResponse.json({ error: "Failed to persist log" }, { status: 500 });
  }
}
