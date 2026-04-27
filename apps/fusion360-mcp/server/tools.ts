/**
 * Fusion 360 MCP tool definitions and handlers.
 * Each tool POSTs to the Fusion 360 Python add-in HTTP bridge on port 4176.
 *
 * UNIT NOTE: Fusion 360 API uses centimeters internally.
 * All distance/radius/height parameters are in centimeters.
 */

import type { McpToolDefinition, McpToolResult } from './types.js';

const FUSION_BASE = 'http://localhost:4176';

// ── Helpers ───────────────────────────────────────────────────────────────

function textResult(data: unknown): McpToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function errorResult(message: string): McpToolResult {
  return { content: [{ type: 'text', text: JSON.stringify({ error: message }) }], isError: true };
}

function fusionOfflineError(): McpToolResult {
  return {
    isError: true,
    content: [{
      type: 'text',
      text: 'Fusion 360 is not running or the Fusion360MCP add-in is not active.\n' +
            'Fix: Start Fusion 360 → Tools > Add-Ins > Fusion360MCP > Run.',
    }],
  };
}

async function fusionPost<T = unknown>(path: string, body: unknown = {}): Promise<T> {
  const res = await fetch(`${FUSION_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} from ${path}: ${txt}`);
  }
  return res.json() as Promise<T>;
}

async function fusionGet<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${FUSION_BASE}${path}`);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} from ${path}: ${txt}`);
  }
  return res.json() as Promise<T>;
}

function isOffline(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('ENOTFOUND');
}

// ── Tool Handler Map ───────────────────────────────────────────────────────

export type ToolHandler = (args: Record<string, unknown>) => Promise<McpToolResult>;
const toolHandlers = new Map<string, ToolHandler>();

// ── Tool: fusion_get_design_info ──────────────────────────────────────────
toolHandlers.set('fusion_get_design_info', async (_args) => {
  try {
    const data = await fusionGet('/fusion/get_design_info');
    return textResult(data);
  } catch (err) {
    if (isOffline(err)) return fusionOfflineError();
    return errorResult(String(err));
  }
});

// ── Tool: fusion_list_bodies ──────────────────────────────────────────────
toolHandlers.set('fusion_list_bodies', async (_args) => {
  try {
    const data = await fusionGet('/fusion/list_bodies');
    return textResult(data);
  } catch (err) {
    if (isOffline(err)) return fusionOfflineError();
    return errorResult(String(err));
  }
});

// ── Tool: fusion_list_sketches ────────────────────────────────────────────
toolHandlers.set('fusion_list_sketches', async (_args) => {
  try {
    const data = await fusionGet('/fusion/list_sketches');
    return textResult(data);
  } catch (err) {
    if (isOffline(err)) return fusionOfflineError();
    return errorResult(String(err));
  }
});

// ── Tool: fusion_create_sketch ────────────────────────────────────────────
toolHandlers.set('fusion_create_sketch', async (args) => {
  try {
    const data = await fusionPost('/fusion/create_sketch', { plane: args.plane ?? 'XY' });
    return textResult(data);
  } catch (err) {
    if (isOffline(err)) return fusionOfflineError();
    return errorResult(String(err));
  }
});

// ── Tool: fusion_add_rectangle ────────────────────────────────────────────
toolHandlers.set('fusion_add_rectangle', async (args) => {
  try {
    const data = await fusionPost('/fusion/add_rectangle', {
      sketch_id: args.sketch_id,
      width: args.width,
      height: args.height,
      origin_x: args.origin_x ?? 0,
      origin_y: args.origin_y ?? 0,
    });
    return textResult(data);
  } catch (err) {
    if (isOffline(err)) return fusionOfflineError();
    return errorResult(String(err));
  }
});

// ── Tool: fusion_add_circle ───────────────────────────────────────────────
toolHandlers.set('fusion_add_circle', async (args) => {
  try {
    const data = await fusionPost('/fusion/add_circle', {
      sketch_id: args.sketch_id,
      cx: args.cx ?? 0,
      cy: args.cy ?? 0,
      radius: args.radius,
    });
    return textResult(data);
  } catch (err) {
    if (isOffline(err)) return fusionOfflineError();
    return errorResult(String(err));
  }
});

// ── Tool: fusion_add_line ─────────────────────────────────────────────────
toolHandlers.set('fusion_add_line', async (args) => {
  try {
    const data = await fusionPost('/fusion/add_line', {
      sketch_id: args.sketch_id,
      x1: args.x1, y1: args.y1,
      x2: args.x2, y2: args.y2,
    });
    return textResult(data);
  } catch (err) {
    if (isOffline(err)) return fusionOfflineError();
    return errorResult(String(err));
  }
});

// ── Tool: fusion_extrude ──────────────────────────────────────────────────
toolHandlers.set('fusion_extrude', async (args) => {
  try {
    const data = await fusionPost('/fusion/extrude', {
      sketch_id: args.sketch_id,
      distance: args.distance,
      profile_index: args.profile_index ?? 0,
      operation: args.operation ?? 'NewBodyFeatureOperation',
    });
    return textResult(data);
  } catch (err) {
    if (isOffline(err)) return fusionOfflineError();
    return errorResult(String(err));
  }
});

// ── Tool: fusion_revolve ──────────────────────────────────────────────────
toolHandlers.set('fusion_revolve', async (args) => {
  try {
    const data = await fusionPost('/fusion/revolve', {
      sketch_id: args.sketch_id,
      profile_index: args.profile_index ?? 0,
      axis: args.axis ?? 'Y',
      angle: args.angle ?? 6.2831853,
    });
    return textResult(data);
  } catch (err) {
    if (isOffline(err)) return fusionOfflineError();
    return errorResult(String(err));
  }
});

// ── Tool: fusion_fillet ───────────────────────────────────────────────────
toolHandlers.set('fusion_fillet', async (args) => {
  try {
    const data = await fusionPost('/fusion/fillet', {
      edge_refs: args.edge_refs,
      radius: args.radius,
    });
    return textResult(data);
  } catch (err) {
    if (isOffline(err)) return fusionOfflineError();
    return errorResult(String(err));
  }
});

// ── Tool: fusion_chamfer ──────────────────────────────────────────────────
toolHandlers.set('fusion_chamfer', async (args) => {
  try {
    const data = await fusionPost('/fusion/chamfer', {
      edge_refs: args.edge_refs,
      distance: args.distance,
    });
    return textResult(data);
  } catch (err) {
    if (isOffline(err)) return fusionOfflineError();
    return errorResult(String(err));
  }
});

// ── Tool: fusion_create_component ─────────────────────────────────────────
toolHandlers.set('fusion_create_component', async (args) => {
  try {
    const data = await fusionPost('/fusion/create_component', { name: args.name });
    return textResult(data);
  } catch (err) {
    if (isOffline(err)) return fusionOfflineError();
    return errorResult(String(err));
  }
});

// ── Tool: fusion_export_stl ───────────────────────────────────────────────
toolHandlers.set('fusion_export_stl', async (args) => {
  try {
    const data = await fusionPost('/fusion/export_stl', {
      body_name: args.body_name,
      output_path: args.output_path,
    });
    return textResult(data);
  } catch (err) {
    if (isOffline(err)) return fusionOfflineError();
    return errorResult(String(err));
  }
});

// ── Tool: fusion_export_step ──────────────────────────────────────────────
toolHandlers.set('fusion_export_step', async (args) => {
  try {
    const data = await fusionPost('/fusion/export_step', { output_path: args.output_path });
    return textResult(data);
  } catch (err) {
    if (isOffline(err)) return fusionOfflineError();
    return errorResult(String(err));
  }
});

// ── Tool: fusion_undo ─────────────────────────────────────────────────────
toolHandlers.set('fusion_undo', async (_args) => {
  try {
    const data = await fusionPost('/fusion/undo');
    return textResult(data);
  } catch (err) {
    if (isOffline(err)) return fusionOfflineError();
    return errorResult(String(err));
  }
});

// ── Tool: fusion_import_stl ───────────────────────────────────────────────
toolHandlers.set('fusion_import_stl', async (args) => {
  try {
    const data = await fusionPost('/fusion/import_stl', {
      stl_path: args.stl_path,
      body_name: args.body_name ?? '',
    });
    return textResult(data);
  } catch (err) {
    if (isOffline(err)) return fusionOfflineError();
    return errorResult(String(err));
  }
});

// ── Tool: fusion_import_scad ──────────────────────────────────────────────
toolHandlers.set('fusion_import_scad', async (args) => {
  try {
    const data = await fusionPost('/fusion/import_scad', {
      scad_path: args.scad_path,
      body_name: args.body_name ?? '',
      parameter_overrides: args.parameter_overrides ?? {},
      timeout: args.timeout ?? 60,
    });
    return textResult(data);
  } catch (err) {
    if (isOffline(err)) return fusionOfflineError();
    return errorResult(String(err));
  }
});

// ── Public API ────────────────────────────────────────────────────────────

export function getToolHandler(name: string): ToolHandler | undefined {
  return toolHandlers.get(name);
}

export function getAllToolDefinitions(): McpToolDefinition[] {
  return [
    {
      name: 'fusion_get_design_info',
      description: 'Get information about the active Fusion 360 design (name, body count, sketch count, units).',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'fusion_list_bodies',
      description: 'List all solid bodies in the active design with their names, volumes, and face/edge counts.',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'fusion_list_sketches',
      description: 'List all sketches in the active design with their names and profile counts.',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'fusion_create_sketch',
      description: 'Create a new empty sketch on a construction plane. Returns the sketch_id (name) to use in subsequent sketch operations.',
      inputSchema: {
        type: 'object',
        properties: {
          plane: { type: 'string', enum: ['XY', 'XZ', 'YZ'], description: 'Construction plane to sketch on. Default: XY' },
        },
        required: [],
      },
    },
    {
      name: 'fusion_add_rectangle',
      description: 'Add a rectangle to a sketch. All dimensions in CENTIMETERS.',
      inputSchema: {
        type: 'object',
        properties: {
          sketch_id: { type: 'string', description: 'Sketch name from fusion_create_sketch or fusion_list_sketches' },
          width: { type: 'number', description: 'Width in centimeters' },
          height: { type: 'number', description: 'Height in centimeters' },
          origin_x: { type: 'number', description: 'X of bottom-left corner in centimeters. Default: 0' },
          origin_y: { type: 'number', description: 'Y of bottom-left corner in centimeters. Default: 0' },
        },
        required: ['sketch_id', 'width', 'height'],
      },
    },
    {
      name: 'fusion_add_circle',
      description: 'Add a circle to a sketch. All dimensions in CENTIMETERS.',
      inputSchema: {
        type: 'object',
        properties: {
          sketch_id: { type: 'string', description: 'Sketch name' },
          cx: { type: 'number', description: 'Center X in centimeters. Default: 0' },
          cy: { type: 'number', description: 'Center Y in centimeters. Default: 0' },
          radius: { type: 'number', description: 'Radius in centimeters' },
        },
        required: ['sketch_id', 'radius'],
      },
    },
    {
      name: 'fusion_add_line',
      description: 'Add a line to a sketch. All coordinates in CENTIMETERS.',
      inputSchema: {
        type: 'object',
        properties: {
          sketch_id: { type: 'string' },
          x1: { type: 'number' }, y1: { type: 'number' },
          x2: { type: 'number' }, y2: { type: 'number' },
        },
        required: ['sketch_id', 'x1', 'y1', 'x2', 'y2'],
      },
    },
    {
      name: 'fusion_extrude',
      description: 'Extrude a sketch profile into a 3D solid. Distance is in CENTIMETERS.',
      inputSchema: {
        type: 'object',
        properties: {
          sketch_id: { type: 'string', description: 'Sketch containing the profile to extrude' },
          distance: { type: 'number', description: 'Extrusion distance in centimeters' },
          profile_index: { type: 'integer', description: 'Which profile to use if sketch has multiple (0 = outermost). Default: 0' },
          operation: {
            type: 'string',
            enum: ['NewBodyFeatureOperation', 'JoinFeatureOperation', 'CutFeatureOperation', 'NewComponentFeatureOperation'],
            description: 'Feature operation type. Default: NewBodyFeatureOperation',
          },
        },
        required: ['sketch_id', 'distance'],
      },
    },
    {
      name: 'fusion_revolve',
      description: 'Revolve a sketch profile around a construction axis to create a 3D solid.',
      inputSchema: {
        type: 'object',
        properties: {
          sketch_id: { type: 'string' },
          profile_index: { type: 'integer', description: 'Profile index. Default: 0' },
          axis: { type: 'string', enum: ['X', 'Y', 'Z'], description: 'Revolution axis. Default: Y' },
          angle: { type: 'number', description: 'Revolution angle in radians. Default: 6.2831853 (full 360°)' },
        },
        required: ['sketch_id'],
      },
    },
    {
      name: 'fusion_fillet',
      description: 'Apply a constant-radius fillet to edges. Radius in CENTIMETERS. Use fusion_list_bodies to get body names; edge_index starts at 0.',
      inputSchema: {
        type: 'object',
        properties: {
          edge_refs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                body: { type: 'string', description: 'Body name' },
                edge_index: { type: 'integer', description: 'Edge index (0-based)' },
              },
              required: ['body', 'edge_index'],
            },
          },
          radius: { type: 'number', description: 'Fillet radius in centimeters' },
        },
        required: ['edge_refs', 'radius'],
      },
    },
    {
      name: 'fusion_chamfer',
      description: 'Apply an equal-distance chamfer to edges. Distance in CENTIMETERS.',
      inputSchema: {
        type: 'object',
        properties: {
          edge_refs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                body: { type: 'string' },
                edge_index: { type: 'integer' },
              },
              required: ['body', 'edge_index'],
            },
          },
          distance: { type: 'number', description: 'Chamfer distance in centimeters' },
        },
        required: ['edge_refs', 'distance'],
      },
    },
    {
      name: 'fusion_create_component',
      description: 'Create a new empty component (sub-assembly) in the design.',
      inputSchema: {
        type: 'object',
        properties: { name: { type: 'string', description: 'Component name' } },
        required: ['name'],
      },
    },
    {
      name: 'fusion_export_stl',
      description: 'Export a specific body to an STL file on disk.',
      inputSchema: {
        type: 'object',
        properties: {
          body_name: { type: 'string', description: 'Body name from fusion_list_bodies' },
          output_path: { type: 'string', description: 'Absolute path for the output .stl file' },
        },
        required: ['body_name', 'output_path'],
      },
    },
    {
      name: 'fusion_export_step',
      description: 'Export the entire active design to a STEP file on disk.',
      inputSchema: {
        type: 'object',
        properties: {
          output_path: { type: 'string', description: 'Absolute path for the output .step file' },
        },
        required: ['output_path'],
      },
    },
    {
      name: 'fusion_undo',
      description: 'Undo the last operation in Fusion 360.',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'fusion_import_stl',
      description: 'Import an STL file from disk into the active Fusion 360 design as a mesh body.',
      inputSchema: {
        type: 'object',
        properties: {
          stl_path: { type: 'string', description: 'Absolute path to the .stl file to import' },
          body_name: { type: 'string', description: 'Optional name to assign the imported mesh body' },
        },
        required: ['stl_path'],
      },
    },
    {
      name: 'fusion_import_scad',
      description: 'Render an OpenSCAD (.scad) file to an STL mesh via the OpenSCAD CLI, then import it into the active Fusion 360 design. OpenSCAD must be installed.',
      inputSchema: {
        type: 'object',
        properties: {
          scad_path: { type: 'string', description: 'Absolute path to the .scad file' },
          body_name: { type: 'string', description: 'Optional name for the imported mesh body (defaults to the .scad filename)' },
          parameter_overrides: {
            type: 'object',
            description: 'Optional OpenSCAD parameter overrides (e.g. {"wall_thickness": 2.5, "height": 10}). These are prepended as top-level variable assignments, shadowing values in the .scad file.',
            additionalProperties: { type: 'number' },
          },
          timeout: { type: 'number', description: 'OpenSCAD render timeout in seconds. Default: 60' },
        },
        required: ['scad_path'],
      },
    },
  ];
}
