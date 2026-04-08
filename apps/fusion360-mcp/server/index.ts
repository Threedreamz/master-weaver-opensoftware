/**
 * Fusion 360 MCP Server
 *
 * Minimal MCP server over stdio (JSON-RPC 2.0).
 * Bridges Claude Code tool calls to the Fusion 360 Python add-in
 * HTTP bridge running on localhost:4176.
 *
 * Protocol:
 *   Claude → stdin  (JSON-RPC request, one line)
 *   Server → stdout (JSON-RPC response, one line)
 *   Logs   → stderr
 */

import { createInterface } from 'readline';
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  McpToolCallParams,
  McpInitializeResult,
} from './types.js';
import {
  RPC_PARSE_ERROR,
  RPC_METHOD_NOT_FOUND,
  RPC_INTERNAL_ERROR,
  RPC_INVALID_PARAMS,
} from './types.js';
import { getAllToolDefinitions, getToolHandler } from './tools.js';

const SERVER_NAME = 'fusion360-mcp';
const SERVER_VERSION = '1.0.0';
const PROTOCOL_VERSION = '2024-11-05';

// ── MCP Error ─────────────────────────────────────────────────────────────

class McpError extends Error {
  code: number;
  data?: unknown;
  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = 'McpError';
    this.code = code;
    this.data = data;
  }
}

// ── Server ────────────────────────────────────────────────────────────────

function log(msg: string): void { process.stderr.write(`[fusion360-mcp] ${msg}\n`); }
function logErr(msg: string): void { process.stderr.write(`[fusion360-mcp ERROR] ${msg}\n`); }

function sendResult(id: string | number, result: unknown): void {
  const response: JsonRpcResponse = { jsonrpc: '2.0', id, result };
  process.stdout.write(JSON.stringify(response) + '\n');
}

function sendError(id: string | number, code: number, message: string, data?: unknown): void {
  const error: JsonRpcError = { code, message };
  if (data !== undefined) error.data = data;
  const response: JsonRpcResponse = { jsonrpc: '2.0', id, error };
  process.stdout.write(JSON.stringify(response) + '\n');
}

function handleInitialize(): McpInitializeResult {
  return {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: { tools: {} },
    serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
  };
}

async function handleToolCall(params: unknown): Promise<unknown> {
  if (!params || typeof params !== 'object') {
    throw new McpError(RPC_INVALID_PARAMS, 'params must be an object with "name" field');
  }
  const { name, arguments: args } = params as McpToolCallParams;
  if (!name || typeof name !== 'string') {
    throw new McpError(RPC_INVALID_PARAMS, 'Tool name is required');
  }
  const handler = getToolHandler(name);
  if (!handler) {
    throw new McpError(RPC_METHOD_NOT_FOUND, `Unknown tool: ${name}`);
  }
  log(`tool: ${name}`);
  return handler((args ?? {}) as Record<string, unknown>);
}

async function dispatch(method: string, params: unknown): Promise<unknown> {
  switch (method) {
    case 'initialize':             return handleInitialize();
    case 'tools/list':             return { tools: getAllToolDefinitions() };
    case 'tools/call':             return handleToolCall(params);
    case 'ping':                   return {};
    default:
      throw new McpError(RPC_METHOD_NOT_FOUND, `Unknown method: ${method}`);
  }
}

async function handleLine(line: string): Promise<void> {
  const trimmed = line.trim();
  if (!trimmed) return;

  let request: JsonRpcRequest;
  try {
    request = JSON.parse(trimmed) as JsonRpcRequest;
  } catch {
    sendError(null as unknown as string, RPC_PARSE_ERROR, 'Parse error: invalid JSON');
    return;
  }

  if (request.jsonrpc !== '2.0' || !request.method) {
    sendError(request.id ?? (null as unknown as string), RPC_PARSE_ERROR, 'Invalid JSON-RPC 2.0 request');
    return;
  }

  // Notifications (no id) — no response
  if (request.id === undefined || request.id === null) {
    if (request.method === 'notifications/initialized') log('Client initialized');
    return;
  }

  try {
    const result = await dispatch(request.method, request.params);
    sendResult(request.id, result);
  } catch (err) {
    if (err instanceof McpError) {
      sendError(request.id, err.code, err.message, err.data);
    } else {
      sendError(request.id, RPC_INTERNAL_ERROR,
        `Internal error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

// ── Entry point ───────────────────────────────────────────────────────────

const rl = createInterface({ input: process.stdin, terminal: false });

rl.on('line', (line) => {
  handleLine(line).catch((err) => logErr(`Unhandled: ${err}`));
});

rl.on('close', () => process.exit(0));

log(`MCP server started (stdio, protocol ${PROTOCOL_VERSION}) — bridge: localhost:4176`);
