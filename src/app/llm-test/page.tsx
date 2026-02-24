"use client";

import React, { useState, useEffect } from "react";
import { parseNaturalCommand } from "@/app/actions";
import { buildParserPrompt } from "@/lib/nlp-parser";
import { ChevronDown, ChevronRight, Code } from "lucide-react";
import "./styles.css";

type MockContext = {
  items: string;
  areas: string;
  agents: string;
};

const DEFAULT_ITEMS = `A=available,C=carried,X=claimed. Only pick (A) items.
ID|Name|Type|Status
laptop-alpha|Manager Laptop|prop|A
red-folder-1|Financial Reports|item|C
cup-3|Coffee Mug|prop|A`;

const DEFAULT_AREAS = `E=empty, O=occupied. Only use IDs marked (E).
Office Desk A: desk-a-0(E), desk-a-1(O)
Conference Table: conf-1(E), conf-2(E), conf-3(O)
Shelf 1: shelf-1-t(E), shelf-1-b(O)`;

const DEFAULT_AGENTS = `ID|Status
agent-assistant|IDLE
agent-intern|BUSY`;

export default function LLMTestingDashboard() {
  const [command, setCommand] = useState(
    "move Manager Laptop to Office Desk A",
  );
  const [items, setItems] = useState(DEFAULT_ITEMS);
  const [areas, setAreas] = useState(DEFAULT_AREAS);
  const [agents, setAgents] = useState(DEFAULT_AGENTS);

  const [activeTab, setActiveTab] = useState<"simulator" | "agent_logs">(
    "simulator",
  );
  const [logFilter, setLogFilter] = useState<string>("all");
  const [logs, setLogs] = useState<any[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Record<number, boolean>>({});

  // Apply filter to logs
  const filteredLogs = React.useMemo(() => {
    if (logFilter === "all") return logs;
    return logs.filter((l) => l.agent_type === logFilter);
  }, [logs, logFilter]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    rawResponse: string;
    serverLatency?: number;
    totalLatency?: number;
    promptUsed?: string;
  } | null>(null);

  useEffect(() => {
    if (activeTab === "agent_logs") {
      fetchLogs();
      const interval = setInterval(fetchLogs, 2000); // Polling every 2s
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const toggleLogExpand = (index: number) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const fetchLogs = async () => {
    try {
      setIsLogsLoading(true);
      const res = await fetch(`/api/logs/json?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLogsLoading(false);
    }
  };

  const handleTestRun = async () => {
    if (!command.trim()) return;
    setIsLoading(true);
    setResults(null);

    const ctx: MockContext = { items, areas, agents };
    const prompt = buildParserPrompt(command, ctx);

    const t0 = performance.now();
    try {
      const { rawResponse, serverLatency } = await parseNaturalCommand(
        command,
        prompt,
        "llm-test-session",
      );
      const t1 = performance.now();

      setResults({
        rawResponse,
        serverLatency,
        totalLatency: Math.round(t1 - t0),
        promptUsed: prompt,
      });
    } catch (err: any) {
      setResults({
        rawResponse: JSON.stringify({ error: err.message }),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="contentWrapper">
        {/* Header */}
        <div
          className="header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1 className="title">
              <span>🚀</span> R&D Testing Dashboard
            </h1>
            <p className="subtitle">
              Monitor real-time agent thoughts or simulate explicit NLP commands
              against isolated datasets.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setActiveTab("simulator")}
              className={`tabBtn ${activeTab === "simulator" ? "active" : ""}`}
            >
              ⚡ NLP Command Simulator
            </button>
            <button
              onClick={() => setActiveTab("agent_logs")}
              className={`tabBtn ${activeTab === "agent_logs" ? "active" : ""}`}
            >
              🧠 Real-Time Agent Stream
            </button>
          </div>
        </div>

        {activeTab === "simulator" && (
          <div className="mainGrid">
            {/* LEFT: Context Editors */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "24px" }}
            >
              <h2 className="panelTitle">
                <span>🗂️</span> Mock Environment State
              </h2>

              <div className="panel">
                <div className="formGroup">
                  <label className="label">Pickable Items</label>
                  <textarea
                    value={items}
                    onChange={(e) => setItems(e.target.value)}
                    className="textarea items"
                  />
                </div>
              </div>

              <div className="panel">
                <div className="formGroup">
                  <label className="label">Placing Areas (Furniture)</label>
                  <textarea
                    value={areas}
                    onChange={(e) => setAreas(e.target.value)}
                    className="textarea areas"
                  />
                </div>
              </div>

              <div className="panel">
                <div className="formGroup">
                  <label className="label">Agents State</label>
                  <textarea
                    value={agents}
                    onChange={(e) => setAgents(e.target.value)}
                    className="textarea agents"
                  />
                </div>
              </div>
            </div>

            {/* RIGHT: Interaction & Logs */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "24px" }}
            >
              {/* Command Input Area */}
              <div className="panel" style={{ padding: "24px" }}>
                <h2 className="panelTitle" style={{ marginBottom: "16px" }}>
                  <span>⚡</span> Interaction Console
                </h2>

                <div className="consoleInputGroup">
                  <input
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleTestRun();
                    }}
                    placeholder="Type simulated user command..."
                    disabled={isLoading}
                    className="commandInput"
                  />
                  <button
                    onClick={handleTestRun}
                    disabled={isLoading}
                    className="simulateBtn"
                  >
                    {isLoading ? <div className="spinner"></div> : "Simulate"}
                  </button>
                </div>
              </div>

              {/* Results Output */}
              {results && (
                <div className="resultsGrid">
                  {/* Result JSON */}
                  <div className="resultBox">
                    <div className="resultHeader">
                      <h3 className="resultTitle">LLM JSON Output</h3>
                      {results.serverLatency && (
                        <span className="badge">
                          API: {results.serverLatency}ms | Total:{" "}
                          {results.totalLatency}ms
                        </span>
                      )}
                    </div>
                    <pre className="preOutput">
                      {(() => {
                        try {
                          return JSON.stringify(
                            JSON.parse(results.rawResponse),
                            null,
                            2,
                          );
                        } catch (e) {
                          return results.rawResponse;
                        }
                      })()}
                    </pre>
                  </div>

                  {/* Final Prompt Output */}
                  <div className="resultBox promptBox">
                    <div className="resultHeader">
                      <h3 className="resultTitle">Compiled Prompt</h3>
                      <span className="badge">
                        Length: {results.promptUsed?.length ?? 0} chars
                      </span>
                    </div>
                    <pre className="preOutput">{results.promptUsed}</pre>
                  </div>
                </div>
              )}

              {!results && !isLoading && (
                <div className="panel emptyState">
                  <p className="emptyStateText">
                    Run a simulation to view LLM response and latency metrics.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AGENTS MONITORING TAB */}
        {activeTab === "agent_logs" && (
          <div className="panel" style={{ minHeight: "600px", padding: "0" }}>
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid rgba(100, 140, 255, 0.2)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 className="panelTitle">
                <span>🧠</span> Agent Subconscious Stream
              </h2>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setLogFilter("all")}
                  className={`tabBtn ${logFilter === "all" ? "active" : ""}`}
                  style={{ padding: "6px 12px", fontSize: "11px" }}
                >
                  All
                </button>
                <button
                  onClick={() => setLogFilter("3d-office-agent")}
                  className={`tabBtn ${logFilter === "3d-office-agent" ? "active" : ""}`}
                  style={{ padding: "6px 12px", fontSize: "11px" }}
                >
                  3D Office Agents
                </button>
                <button
                  onClick={() => setLogFilter("memory-reflector")}
                  className={`tabBtn ${logFilter === "memory-reflector" ? "active" : ""}`}
                  style={{ padding: "6px 12px", fontSize: "11px" }}
                >
                  Memory Compressors
                </button>
                <button
                  onClick={() => setLogFilter("nlp-parser")}
                  className={`tabBtn ${logFilter === "nlp-parser" ? "active" : ""}`}
                  style={{ padding: "6px 12px", fontSize: "11px" }}
                >
                  NLP Parsers
                </button>
              </div>
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                {isLogsLoading && (
                  <div
                    className="spinner"
                    style={{
                      width: "14px",
                      height: "14px",
                      borderWidth: "2px",
                      borderColor: "rgba(100, 140, 255, 0.5)",
                      borderTopColor: "rgba(100, 140, 255, 1)",
                    }}
                  ></div>
                )}
                <span
                  style={{
                    fontSize: "12px",
                    color: "rgba(160, 180, 220, 0.6)",
                  }}
                >
                  Polling every 2s
                </span>
              </div>
            </div>

            <div className="logsList">
              {filteredLogs.length === 0 ? (
                <div
                  className="emptyState"
                  style={{ height: "400px", border: "none" }}
                >
                  <p className="emptyStateText">
                    {isLogsLoading
                      ? "Loading logs..."
                      : "No agent thoughts recorded yet. Interact with agents in the 3D world to populate."}
                  </p>
                </div>
              ) : (
                filteredLogs.map((log, i) => {
                  let parsedReq = null;
                  let parsedRes = null;
                  try {
                    let cleanedContent = log.response_content;
                    const jsonMatch = cleanedContent?.match(
                      /```(?:json)?\s*([\s\S]*?)```/,
                    );
                    if (jsonMatch && jsonMatch[1]) {
                      cleanedContent = jsonMatch[1];
                    }
                    parsedRes = JSON.parse(cleanedContent);
                  } catch (e) {}

                  return (
                    <div key={i} className="logRowContainer">
                      <div
                        className="logRow"
                        style={{
                          borderBottom: expandedLogs[i] ? "none" : undefined,
                        }}
                      >
                        <div className="logTime">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="logAgent">
                          <span
                            className="badge"
                            style={{
                              background: "rgba(128, 176, 255, 0.1)",
                              color: "#80b0ff",
                            }}
                          >
                            {log.agent_type}
                          </span>
                          <span
                            className="badge"
                            style={{
                              background: "rgba(255, 255, 255, 0.05)",
                              color: "#ccc",
                            }}
                          >
                            {log.processing_time_ms}ms
                          </span>
                        </div>
                        <div className="logContent">
                          {parsedRes && parsedRes.thought ? (
                            <div className="thoughtStream">
                              <span className="thoughtAction">
                                [{parsedRes.operation || parsedRes.action}]
                              </span>{" "}
                              "{parsedRes.thought}"
                            </div>
                          ) : log.agent_type === "nlp-parser" &&
                            parsedRes &&
                            parsedRes.tasks ? (
                            <div className="thoughtStream">
                              <span className="thoughtAction">[NLP_TASKS]</span>{" "}
                              assigned {parsedRes.tasks.length} task(s) to{" "}
                              {parsedRes.agentId}
                            </div>
                          ) : log.agent_type === "memory-reflector" ? (
                            <div
                              className="thoughtStream"
                              style={{ color: "#d0b0ff" }}
                            >
                              <span
                                className="thoughtAction"
                                style={{ color: "#b080ff" }}
                              >
                                [MEMORY_COMPRESSION]
                              </span>{" "}
                              {log.response_content?.substring(0, 100) ||
                                log.request_content?.substring(0, 100)}
                              {log.response_status === "error" && (
                                <span
                                  style={{
                                    color: "#ff6060",
                                    marginLeft: "8px",
                                  }}
                                >
                                  FAILED
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="rawContent">
                              {log.request_content?.substring(0, 120)}...
                              {log.response_status === "error" && (
                                <div
                                  style={{
                                    color: "#ff6060",
                                    marginTop: "8px",
                                    fontWeight: "bold",
                                  }}
                                >
                                  FAILED: {log.error_message || "Network Error"}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          className="expandBtn"
                          onClick={() => toggleLogExpand(i)}
                          title="View Log Details"
                        >
                          {expandedLogs[i] ? (
                            <ChevronDown size={16} />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                        </button>
                      </div>

                      {expandedLogs[i] && (
                        <div className="logDetails">
                          {log.request_content && (
                            <div>
                              <strong>Prompt / Input</strong>
                              <pre>{log.request_content}</pre>
                            </div>
                          )}
                          {log.response_content && (
                            <div>
                              <strong>Raw Output</strong>
                              <pre>{log.response_content}</pre>
                            </div>
                          )}
                          {(log.input_tokens || log.output_tokens) && (
                            <div
                              style={{
                                display: "flex",
                                gap: "16px",
                                color: "#607090",
                              }}
                            >
                              <span>
                                Tokens: {log.input_tokens} in /{" "}
                                {log.output_tokens} out
                              </span>
                              <span>Model: {log.model_version}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
