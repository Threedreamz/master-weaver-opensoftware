/**
 * Infill Pattern Generation
 *
 * Generates 2D toolpaths for various infill patterns used in FDM printing.
 * Each function returns an array of paths (polylines) that a print head follows.
 */

export type Point2D = { x: number; y: number };
export type Path = Point2D[];

/**
 * Generate grid infill: parallel lines at a given angle.
 * Two sets of parallel lines crossing at 90 degrees, rotated by `angle`.
 *
 * @param width - Infill area width in mm
 * @param height - Infill area height in mm
 * @param spacing - Line spacing in mm (derived from infill density)
 * @param angle - Rotation angle in degrees
 */
export function generateGridInfill(width: number, height: number, spacing: number, angle: number): Path[] {
  const paths: Path[] = [];
  const rad = (angle * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);

  // Diagonal of the bounding box — ensures lines cover full area when rotated
  const diagonal = Math.sqrt(width * width + height * height);
  const halfDiag = diagonal / 2;
  const cx = width / 2;
  const cy = height / 2;

  // Generate lines in both directions (0 and 90 degrees relative to angle)
  for (const extraAngle of [0, Math.PI / 2]) {
    const cos = Math.cos(rad + extraAngle);
    const sin = Math.sin(rad + extraAngle);

    for (let offset = -halfDiag; offset <= halfDiag; offset += spacing) {
      // Line perpendicular to direction at this offset
      const px = cx + offset * (-sin);
      const py = cy + offset * cos;

      // Extend line far enough to cover entire area
      const start: Point2D = {
        x: px - halfDiag * cos,
        y: py - halfDiag * sin,
      };
      const end: Point2D = {
        x: px + halfDiag * cos,
        y: py + halfDiag * sin,
      };

      // Clip to bounds
      const clipped = clipLineToRect(start, end, 0, 0, width, height);
      if (clipped) {
        paths.push(clipped);
      }
    }
  }

  return paths;
}

/**
 * Generate gyroid cross-section at a given Z height.
 *
 * The gyroid is defined by: sin(x)cos(y) + sin(y)cos(z) + sin(z)cos(x) = 0
 * At a fixed Z, we find the 2D contour by marching squares.
 *
 * @param width - Area width in mm
 * @param height - Area height in mm
 * @param spacing - Cell size in mm (period = spacing * 2pi)
 * @param z - Current Z height in mm
 */
export function generateGyroidCrossSection(width: number, height: number, spacing: number, z: number): Path[] {
  const paths: Path[] = [];
  const resolution = spacing / 4; // Sample every quarter-spacing
  const period = spacing * 2 * Math.PI;
  const cols = Math.ceil(width / resolution);
  const rows = Math.ceil(height / resolution);

  // Evaluate gyroid field: f(x,y,z) = sin(x/s*2pi)*cos(y/s*2pi) + sin(y/s*2pi)*cos(z/s*2pi) + sin(z/s*2pi)*cos(x/s*2pi)
  function field(px: number, py: number): number {
    const sx = (px / spacing) * 2 * Math.PI;
    const sy = (py / spacing) * 2 * Math.PI;
    const sz = (z / spacing) * 2 * Math.PI;
    return Math.sin(sx) * Math.cos(sy) + Math.sin(sy) * Math.cos(sz) + Math.sin(sz) * Math.cos(sx);
  }

  // Marching squares to extract zero-crossing contours
  const visited = new Set<string>();

  for (let row = 0; row < rows - 1; row++) {
    for (let col = 0; col < cols - 1; col++) {
      const x0 = col * resolution;
      const y0 = row * resolution;
      const x1 = x0 + resolution;
      const y1 = y0 + resolution;

      const v00 = field(x0, y0);
      const v10 = field(x1, y0);
      const v11 = field(x1, y1);
      const v01 = field(x0, y1);

      // Check if zero-crossing exists in this cell
      const signs = [v00 >= 0, v10 >= 0, v11 >= 0, v01 >= 0];
      const allSame = signs.every((s) => s === signs[0]);
      if (allSame) continue;

      // Interpolate edge crossings
      const edges: Point2D[] = [];

      // Bottom edge (v00 -> v10)
      if ((v00 >= 0) !== (v10 >= 0)) {
        const t = v00 / (v00 - v10);
        edges.push({ x: x0 + t * resolution, y: y0 });
      }
      // Right edge (v10 -> v11)
      if ((v10 >= 0) !== (v11 >= 0)) {
        const t = v10 / (v10 - v11);
        edges.push({ x: x1, y: y0 + t * resolution });
      }
      // Top edge (v01 -> v11)
      if ((v01 >= 0) !== (v11 >= 0)) {
        const t = v01 / (v01 - v11);
        edges.push({ x: x0 + t * resolution, y: y1 });
      }
      // Left edge (v00 -> v01)
      if ((v00 >= 0) !== (v01 >= 0)) {
        const t = v00 / (v00 - v01);
        edges.push({ x: x0, y: y0 + t * resolution });
      }

      // Connect pairs of edge crossings as line segments
      if (edges.length >= 2) {
        paths.push([edges[0], edges[1]]);
      }
      if (edges.length === 4) {
        paths.push([edges[2], edges[3]]);
      }
    }
  }

  return paths;
}

/**
 * Generate honeycomb infill: hexagonal pattern.
 *
 * @param width - Area width in mm
 * @param height - Area height in mm
 * @param spacing - Hex cell size (center to vertex) in mm
 */
export function generateHoneycombInfill(width: number, height: number, spacing: number): Path[] {
  const paths: Path[] = [];
  const hexHeight = spacing * Math.sqrt(3);
  const hexWidth = spacing * 2;

  const cols = Math.ceil(width / (hexWidth * 0.75)) + 1;
  const rows = Math.ceil(height / hexHeight) + 1;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = col * hexWidth * 0.75;
      const cy = row * hexHeight + (col % 2 === 1 ? hexHeight / 2 : 0);

      // Generate hexagon vertices
      const hex: Point2D[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const vx = cx + spacing * Math.cos(angle);
        const vy = cy + spacing * Math.sin(angle);
        hex.push({ x: vx, y: vy });
      }

      // Connect edges that fall within bounds
      for (let i = 0; i < 6; i++) {
        const a = hex[i];
        const b = hex[(i + 1) % 6];

        // Only add edges within bounds (rough check)
        if (
          a.x >= -spacing && a.x <= width + spacing &&
          a.y >= -spacing && a.y <= height + spacing &&
          b.x >= -spacing && b.x <= width + spacing &&
          b.y >= -spacing && b.y <= height + spacing
        ) {
          const clipped = clipLineToRect(a, b, 0, 0, width, height);
          if (clipped) {
            paths.push(clipped);
          }
        }
      }
    }
  }

  return paths;
}

/**
 * Clip a line segment to a rectangle using Cohen-Sutherland algorithm.
 * Returns the clipped segment as [start, end] or null if fully outside.
 */
function clipLineToRect(
  p1: Point2D,
  p2: Point2D,
  xmin: number,
  ymin: number,
  xmax: number,
  ymax: number,
): Path | null {
  const INSIDE = 0;
  const LEFT = 1;
  const RIGHT = 2;
  const BOTTOM = 4;
  const TOP = 8;

  function outcode(x: number, y: number): number {
    let code = INSIDE;
    if (x < xmin) code |= LEFT;
    else if (x > xmax) code |= RIGHT;
    if (y < ymin) code |= BOTTOM;
    else if (y > ymax) code |= TOP;
    return code;
  }

  let x0 = p1.x, y0 = p1.y;
  let x1 = p2.x, y1 = p2.y;
  let code0 = outcode(x0, y0);
  let code1 = outcode(x1, y1);

  for (let i = 0; i < 20; i++) {
    if ((code0 | code1) === 0) {
      return [{ x: x0, y: y0 }, { x: x1, y: y1 }];
    }
    if ((code0 & code1) !== 0) {
      return null;
    }

    const codeOut = code0 !== 0 ? code0 : code1;
    let x = 0, y = 0;

    if (codeOut & TOP) {
      x = x0 + ((x1 - x0) * (ymax - y0)) / (y1 - y0);
      y = ymax;
    } else if (codeOut & BOTTOM) {
      x = x0 + ((x1 - x0) * (ymin - y0)) / (y1 - y0);
      y = ymin;
    } else if (codeOut & RIGHT) {
      y = y0 + ((y1 - y0) * (xmax - x0)) / (x1 - x0);
      x = xmax;
    } else if (codeOut & LEFT) {
      y = y0 + ((y1 - y0) * (xmin - x0)) / (x1 - x0);
      x = xmin;
    }

    if (codeOut === code0) {
      x0 = x; y0 = y;
      code0 = outcode(x0, y0);
    } else {
      x1 = x; y1 = y;
      code1 = outcode(x1, y1);
    }
  }

  return null;
}
