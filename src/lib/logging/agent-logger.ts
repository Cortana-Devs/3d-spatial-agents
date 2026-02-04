import fs from 'fs/promises';
import path from 'path';

export interface AgentLogEntry {
    timestamp: string;
    session_id: string;
    conversation_id?: string;
    request_id: string;
    agent_type: string;
    request_type: string;
    request_content: string;
    response_content: string;
    response_status: 'success' | 'error' | 'partial';
    processing_time_ms: number;
    input_tokens?: number;
    output_tokens?: number;
    model_version?: string;
    tools_used?: string;
    error_code?: string;
    error_message?: string;
    user_id?: string;
}

const LOG_DIR = 'logs';
const LOG_FILE = 'groq_interactions.csv';

const COLUMNS: (keyof AgentLogEntry)[] = [
    'timestamp',
    'session_id',
    'conversation_id',
    'request_id',
    'agent_type',
    'request_type',
    'request_content',
    'response_content',
    'response_status',
    'processing_time_ms',
    'input_tokens',
    'output_tokens',
    'model_version',
    'tools_used',
    'error_code',
    'error_message',
    'user_id'
];

function escapeCsv(field: string | number | undefined | null): string {
    if (field === undefined || field === null) return '';
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

export async function logAgentInteraction(entry: AgentLogEntry) {
    try {
        const row = COLUMNS.map(col => escapeCsv(entry[col])).join(',');
        const logPath = path.join(process.cwd(), LOG_DIR, LOG_FILE);
        
        // Ensure directory exists
        await fs.mkdir(path.join(process.cwd(), LOG_DIR), { recursive: true });

        // Check if file exists to add header
        try {
            await fs.access(logPath);
        } catch {
            const header = COLUMNS.join(',');
            await fs.writeFile(logPath, header + '\n', 'utf-8');
        }

        await fs.appendFile(logPath, row + '\n', 'utf-8');
    } catch (error) {
        console.error("Failed to write to agent log:", error);
    }
}
