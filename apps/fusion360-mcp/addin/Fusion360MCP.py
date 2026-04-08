"""
Fusion360MCP — HTTP Bridge Add-in
Exposes Fusion 360's Python API as a local REST endpoint on port 4176.
The companion TypeScript MCP stdio server wraps this into MCP tools for Claude Code.

Architecture:
  Claude Code (MCP stdio) → TypeScript server → HTTP POST localhost:4176 → THIS ADD-IN → adsk.fusion API

IMPORTANT — Threading model:
  All adsk.* calls MUST run on Fusion's main thread.
  The HTTP server runs in a background daemon thread.
  Work is queued via _call_queue and dispatched on the main thread via
  a CustomEvent handler registered in run(context).
"""

import adsk.core
import adsk.fusion
import threading
import queue
import json
import traceback
from http.server import HTTPServer, BaseHTTPRequestHandler

# ── Constants ─────────────────────────────────────────────────────────────
BRIDGE_PORT = 4176
CUSTOM_EVENT_ID = 'Fusion360MCP_Execute'

# ── Global state ──────────────────────────────────────────────────────────
_app: adsk.core.Application = None
_ui: adsk.core.UserInterface = None
_server: HTTPServer = None
_server_thread: threading.Thread = None
_event_handler = None   # holds reference to prevent GC

_call_queue: queue.Queue = queue.Queue()
_result_queue: queue.Queue = queue.Queue()


# ── Main-thread marshal ───────────────────────────────────────────────────

def run_on_main_thread(fn):
    """Execute fn() on Fusion's main thread; return its result or raise."""
    evt = threading.Event()
    _call_queue.put((fn, evt))
    _app.fireCustomEvent(CUSTOM_EVENT_ID)
    if not evt.wait(timeout=30):
        raise TimeoutError('Fusion main thread did not respond within 30 s — close any open dialogs')
    kind, val = _result_queue.get_nowait()
    if kind == 'err':
        raise RuntimeError(val)
    return val


class ExecuteHandler(adsk.core.CustomEventHandler):
    def notify(self, args):
        while not _call_queue.empty():
            try:
                fn, evt = _call_queue.get_nowait()
            except queue.Empty:
                break
            try:
                result = fn()
                _result_queue.put(('ok', result))
            except Exception as exc:
                _result_queue.put(('err', f'{type(exc).__name__}: {exc}'))
            evt.set()


# ── HTTP handler ──────────────────────────────────────────────────────────

class FusionBridgeHandler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # suppress access log spam

    def do_GET(self):
        if self.path == '/health':
            self._respond(200, {'status': 'ok', 'app': 'fusion360-mcp-bridge', 'port': BRIDGE_PORT})
        else:
            self._respond(404, {'error': f'Unknown route: {self.path}'})

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        try:
            body = json.loads(self.rfile.read(length)) if length else {}
        except json.JSONDecodeError as exc:
            self._respond(400, {'error': f'Invalid JSON: {exc}'})
            return

        handler = ROUTES.get(self.path)
        if not handler:
            self._respond(404, {'error': f'Unknown route: {self.path}'})
            return

        try:
            result = handler(body)
            self._respond(200, result)
        except TimeoutError as exc:
            self._respond(503, {'error': str(exc)})
        except Exception as exc:
            self._respond(500, {
                'error': str(exc),
                'type': type(exc).__name__,
                'trace': traceback.format_exc(),
            })

    def _respond(self, code: int, data: dict):
        payload = json.dumps(data).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


# ── Helpers ───────────────────────────────────────────────────────────────

def _root():
    design = _app.activeProduct
    if not design or not isinstance(design, adsk.fusion.Design):
        raise RuntimeError('No active Fusion design. Open or create a design first.')
    return design.rootComponent

def _get_sketch(sketch_id: str) -> adsk.fusion.Sketch:
    sketch = _root().sketches.itemByName(sketch_id)
    if not sketch:
        names = [_root().sketches.item(i).name for i in range(_root().sketches.count)]
        raise ValueError(f'Sketch "{sketch_id}" not found. Available: {names}')
    return sketch

def _plane_for(name: str):
    root = _root()
    planes = {
        'XY': root.xYConstructionPlane,
        'XZ': root.xZConstructionPlane,
        'YZ': root.yZConstructionPlane,
    }
    plane = planes.get(name.upper())
    if not plane:
        raise ValueError(f'Unknown plane "{name}". Use XY, XZ, or YZ.')
    return plane

def _pt(x, y, z=0):
    return adsk.core.Point3D.create(float(x), float(y), float(z))

def _val(v):
    return adsk.core.ValueInput.createByReal(float(v))

OP_MAP = {
    'NewBodyFeatureOperation':      adsk.fusion.FeatureOperations.NewBodyFeatureOperation,
    'JoinFeatureOperation':         adsk.fusion.FeatureOperations.JoinFeatureOperation,
    'CutFeatureOperation':          adsk.fusion.FeatureOperations.CutFeatureOperation,
    'NewComponentFeatureOperation': adsk.fusion.FeatureOperations.NewComponentFeatureOperation,
}


# ── Route handlers ────────────────────────────────────────────────────────

def h_get_design_info(body):
    def _do():
        design = _app.activeProduct
        root = _root()
        dt = design.designType
        return {
            'name': root.name,
            'is_parametric': dt == adsk.fusion.DesignTypes.ParametricDesignType,
            'body_count': root.bRepBodies.count,
            'sketch_count': root.sketches.count,
            'component_count': root.occurrences.count,
            'units': 'centimeters (Fusion API internal unit)',
        }
    return run_on_main_thread(_do)


def h_list_bodies(body):
    def _do():
        root = _root()
        return {
            'bodies': [
                {
                    'name': root.bRepBodies.item(i).name,
                    'volume': root.bRepBodies.item(i).volume,
                    'visible': root.bRepBodies.item(i).isVisible,
                    'face_count': root.bRepBodies.item(i).faces.count,
                    'edge_count': root.bRepBodies.item(i).edges.count,
                }
                for i in range(root.bRepBodies.count)
            ]
        }
    return run_on_main_thread(_do)


def h_list_sketches(body):
    def _do():
        root = _root()
        return {
            'sketches': [
                {
                    'name': root.sketches.item(i).name,
                    'profile_count': root.sketches.item(i).profiles.count,
                    'curve_count': root.sketches.item(i).sketchCurves.count,
                }
                for i in range(root.sketches.count)
            ]
        }
    return run_on_main_thread(_do)


def h_create_sketch(body):
    plane_name = body.get('plane', 'XY')
    def _do():
        plane = _plane_for(plane_name)
        sketch = _root().sketches.add(plane)
        return {'sketch_id': sketch.name, 'name': sketch.name}
    return run_on_main_thread(_do)


def h_add_rectangle(body):
    sketch_id = body['sketch_id']
    w = body['width']
    h_val = body['height']
    ox = body.get('origin_x', 0.0)
    oy = body.get('origin_y', 0.0)
    def _do():
        sketch = _get_sketch(sketch_id)
        p1 = _pt(ox, oy)
        p2 = _pt(float(ox) + float(w), float(oy) + float(h_val))
        lines = sketch.sketchCurves.sketchLines.addTwoPointRectangle(p1, p2)
        return {'ok': True, 'curve_count': lines.count}
    return run_on_main_thread(_do)


def h_add_circle(body):
    sketch_id = body['sketch_id']
    def _do():
        sketch = _get_sketch(sketch_id)
        center = _pt(body.get('cx', 0), body.get('cy', 0))
        sketch.sketchCurves.sketchCircles.addByCenterRadius(center, float(body['radius']))
        return {'ok': True}
    return run_on_main_thread(_do)


def h_add_line(body):
    sketch_id = body['sketch_id']
    def _do():
        sketch = _get_sketch(sketch_id)
        p1 = _pt(body['x1'], body['y1'])
        p2 = _pt(body['x2'], body['y2'])
        sketch.sketchCurves.sketchLines.addByTwoPoints(p1, p2)
        return {'ok': True}
    return run_on_main_thread(_do)


def h_extrude(body):
    sketch_id = body['sketch_id']
    distance = body['distance']
    profile_idx = int(body.get('profile_index', 0))
    op_name = body.get('operation', 'NewBodyFeatureOperation')
    def _do():
        root = _root()
        sketch = _get_sketch(sketch_id)
        if sketch.profiles.count == 0:
            raise ValueError(f'Sketch "{sketch_id}" has no closed profiles to extrude.')
        if profile_idx >= sketch.profiles.count:
            raise ValueError(f'profile_index {profile_idx} out of range (sketch has {sketch.profiles.count} profiles)')
        profile = sketch.profiles.item(profile_idx)
        op = OP_MAP.get(op_name, adsk.fusion.FeatureOperations.NewBodyFeatureOperation)
        inp = root.features.extrudeFeatures.createInput(profile, op)
        inp.setDistanceExtent(False, _val(distance))
        feat = root.features.extrudeFeatures.add(inp)
        return {
            'feature_name': feat.name,
            'body_count': root.bRepBodies.count,
            'note': 'distance is in centimeters',
        }
    return run_on_main_thread(_do)


def h_revolve(body):
    sketch_id = body['sketch_id']
    profile_idx = int(body.get('profile_index', 0))
    axis_name = body.get('axis', 'Y').upper()
    angle = float(body.get('angle', 6.2831853))  # 2π = full revolution
    def _do():
        root = _root()
        sketch = _get_sketch(sketch_id)
        if sketch.profiles.count == 0:
            raise ValueError(f'Sketch "{sketch_id}" has no profiles to revolve.')
        profile = sketch.profiles.item(profile_idx)
        ax_map = {
            'X': root.xConstructionAxis,
            'Y': root.yConstructionAxis,
            'Z': root.zConstructionAxis,
        }
        axis = ax_map.get(axis_name)
        if not axis:
            raise ValueError(f'Unknown axis "{axis_name}". Use X, Y, or Z.')
        inp = root.features.revolveFeatures.createInput(
            profile, axis, adsk.fusion.FeatureOperations.NewBodyFeatureOperation
        )
        inp.setAngleExtent(False, _val(angle))
        feat = root.features.revolveFeatures.add(inp)
        return {'feature_name': feat.name, 'body_count': root.bRepBodies.count}
    return run_on_main_thread(_do)


def h_fillet(body):
    edge_refs = body['edge_refs']  # [{body: str, edge_index: int}]
    radius = float(body['radius'])
    def _do():
        root = _root()
        edges = adsk.core.ObjectCollection.create()
        for ref in edge_refs:
            b = root.bRepBodies.itemByName(ref['body'])
            if not b:
                raise ValueError(f'Body "{ref["body"]}" not found')
            idx = int(ref['edge_index'])
            if idx >= b.edges.count:
                raise ValueError(f'edge_index {idx} out of range for body "{ref["body"]}" ({b.edges.count} edges)')
            edges.add(b.edges.item(idx))
        inp = root.features.filletFeatures.createInput()
        inp.addConstantRadiusEdgeSet(edges, _val(radius), True)
        feat = root.features.filletFeatures.add(inp)
        return {'feature_name': feat.name}
    return run_on_main_thread(_do)


def h_chamfer(body):
    edge_refs = body['edge_refs']
    distance = float(body['distance'])
    def _do():
        root = _root()
        edges = adsk.core.ObjectCollection.create()
        for ref in edge_refs:
            b = root.bRepBodies.itemByName(ref['body'])
            if not b:
                raise ValueError(f'Body "{ref["body"]}" not found')
            edges.add(b.edges.item(int(ref['edge_index'])))
        inp = root.features.chamferFeatures.createInput(
            edges, True
        )
        inp.setToEqualDistance(_val(distance))
        feat = root.features.chamferFeatures.add(inp)
        return {'feature_name': feat.name}
    return run_on_main_thread(_do)


def h_create_component(body):
    name = body['name']
    def _do():
        root = _root()
        occ = root.occurrences.addNewComponent(adsk.core.Matrix3D.create())
        occ.component.name = name
        return {'component_name': occ.component.name}
    return run_on_main_thread(_do)


def h_export_stl(body):
    body_name = body['body_name']
    output_path = body['output_path']
    def _do():
        design = _app.activeProduct
        root = _root()
        b = root.bRepBodies.itemByName(body_name)
        if not b:
            raise ValueError(f'Body "{body_name}" not found')
        em = design.exportManager
        opts = em.createSTLExportOptions(b, output_path)
        opts.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementMedium
        em.execute(opts)
        return {'exported': output_path, 'body': body_name}
    return run_on_main_thread(_do)


def h_export_step(body):
    output_path = body['output_path']
    def _do():
        design = _app.activeProduct
        em = design.exportManager
        opts = em.createSTEPExportOptions(output_path)
        em.execute(opts)
        return {'exported': output_path}
    return run_on_main_thread(_do)


def h_undo(body):
    def _do():
        _app.executeTextCommand('Commands.Undo')
        return {'ok': True}
    return run_on_main_thread(_do)


# ── Route table ───────────────────────────────────────────────────────────

ROUTES = {
    '/fusion/get_design_info':  h_get_design_info,
    '/fusion/list_bodies':      h_list_bodies,
    '/fusion/list_sketches':    h_list_sketches,
    '/fusion/create_sketch':    h_create_sketch,
    '/fusion/add_rectangle':    h_add_rectangle,
    '/fusion/add_circle':       h_add_circle,
    '/fusion/add_line':         h_add_line,
    '/fusion/extrude':          h_extrude,
    '/fusion/revolve':          h_revolve,
    '/fusion/fillet':           h_fillet,
    '/fusion/chamfer':          h_chamfer,
    '/fusion/create_component': h_create_component,
    '/fusion/export_stl':       h_export_stl,
    '/fusion/export_step':      h_export_step,
    '/fusion/undo':             h_undo,
}


# ── Add-in lifecycle ──────────────────────────────────────────────────────

def run(context):
    global _app, _ui, _server, _server_thread, _event_handler

    _app = adsk.core.Application.get()
    _ui = _app.userInterface

    # Register CustomEvent for main-thread dispatch
    custom_event = _app.registerCustomEvent(CUSTOM_EVENT_ID)
    _event_handler = ExecuteHandler()
    custom_event.add(_event_handler)

    # Start HTTP bridge on background thread
    _server = HTTPServer(('127.0.0.1', BRIDGE_PORT), FusionBridgeHandler)
    _server_thread = threading.Thread(target=_server.serve_forever, daemon=True)
    _server_thread.name = 'Fusion360MCP-HTTP'
    _server_thread.start()


def stop(context):
    global _server, _server_thread

    if _server:
        _server.shutdown()
        _server = None
        _server_thread = None

    try:
        _app.unregisterCustomEvent(CUSTOM_EVENT_ID)
    except Exception:
        pass
