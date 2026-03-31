import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs";

const dbDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = createClient({
  url: `file:${path.join(dbDir, "simulation_logs.db")}`,
});

let initialized = false;

export async function initDb() {
  if (initialized) return;
  await db.execute(`
    CREATE TABLE IF NOT EXISTS simulation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      perception TEXT NOT NULL,
      response_text TEXT NOT NULL,
      response_tools TEXT NOT NULL,
      verification INTEGER NOT NULL,
      execution_action TEXT NOT NULL,
      execution_outcome TEXT NOT NULL,
      latency_ms INTEGER NOT NULL,
      token_count INTEGER NOT NULL,
      fps INTEGER NOT NULL,
      spatial_language_freq REAL NOT NULL
    );
  `);
  initialized = true;
}

initDb().catch(console.error);
