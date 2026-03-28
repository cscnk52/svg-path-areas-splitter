import type { SVGCommand } from "svg-pathdata";
import { SVGPathData } from "svg-pathdata";
import { match } from "ts-pattern";

import { normalize } from "@/normalize";
import type { Point } from "@/types";

/**
 * Default number of line segments used to approximate curves and arcs.
 *
 * Higher values produce smoother approximations at the cost of more points.
 */
const DEFAULT_SEGMENTS = 20;

/**
 * Flattens an array of SVG path commands into an array of discrete points.
 *
 * The commands are first passed through {@link normalize} to convert all
 * coordinates to absolute and reduce command variety to the canonical set
 * (`M`, `L`, `C`, `Q`, `A`, `Z`). Curves and arcs are then uniformly
 * sampled into line segments (see {@link DEFAULT_SEGMENTS}).
 *
 * @param commands - Raw SVG path commands as parsed by `svg-pathdata`
 * @returns An ordered array of points that approximate the path
 */
export function flatten(commands: SVGCommand[]): Array<Point> {
  const normalized = normalize(commands);
  const points: Array<Point> = [];
  let currentPoint: Point = { x: 0, y: 0 };

  for (const cmd of normalized) {
    const newPoints = match(cmd)
      .returnType<Point[]>()
      .with({ type: SVGPathData.MOVE_TO }, (res) => [{ x: res.x, y: res.y }])
      .with({ type: SVGPathData.LINE_TO }, (res) => [{ x: res.x, y: res.y }])
      .with({ type: SVGPathData.CURVE_TO }, (res) =>
        sampleCubicBezier(
          currentPoint,
          { x: res.x1, y: res.y1 },
          { x: res.x2, y: res.y2 },
          { x: res.x, y: res.y },
        ),
      )
      .with({ type: SVGPathData.QUAD_TO }, (res) =>
        sampleQuadraticBezier(currentPoint, { x: res.x1, y: res.y1 }, { x: res.x, y: res.y }),
      )
      .with({ type: SVGPathData.ARC }, (res) =>
        sampleArc(currentPoint, res.rX, res.rY, res.xRot, res.lArcFlag, res.sweepFlag, {
          x: res.x,
          y: res.y,
        }),
      )
      .with({ type: SVGPathData.CLOSE_PATH }, () => [])
      .exhaustive();

    points.push(...newPoints);

    if (newPoints.length > 0) {
      currentPoint = newPoints[newPoints.length - 1];
    }
  }

  return points;
}

// ---------------------------------------------------------------------------
// Sampling helpers — convert curves and arcs into discrete point sequences
// ---------------------------------------------------------------------------

/**
 * Samples a quadratic Bézier curve into discrete points.
 *
 *     B(t) = (1−t)²·P₀ + 2·(1−t)·t·P₁ + t²·P₂ ,  t ∈ [0, 1]
 *
 * The start point (t = 0) is excluded because it is already produced
 * by the preceding command.
 */
function sampleQuadraticBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  segments: number = DEFAULT_SEGMENTS,
): Point[] {
  const points: Point[] = [];

  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;

    points.push({
      x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    });
  }

  return points;
}

/**
 * Samples a cubic Bézier curve into discrete points.
 *
 *     B(t) = (1−t)³·P₀ + 3·(1−t)²·t·P₁ + 3·(1−t)·t²·P₂ + t³·P₃ ,  t ∈ [0, 1]
 *
 * The start point (t = 0) is excluded because it is already produced
 * by the preceding command.
 */
function sampleCubicBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  segments: number = DEFAULT_SEGMENTS,
): Point[] {
  const points: Point[] = [];

  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;

    points.push({
      x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
      y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
    });
  }

  return points;
}

/**
 * Samples an SVG elliptical arc into discrete points.
 *
 * Converts from SVG endpoint parameterization to center parameterization,
 * then uniformly samples the arc at equal angle increments.
 *
 * Implements the conversion from the W3C SVG specification:
 * {@link https://www.w3.org/TR/SVG/implnote.html#ArcConversionEndpointToCenter | §B.2.4 Conversion from endpoint to center parameterization}
 *
 * Degenerate cases (zero radii or coincident start/end) return just the endpoint.
 *
 * @param xRotDeg - Rotation of the ellipse's X-axis in **degrees**
 * @param largeArcFlag - `1` to choose the larger arc, `0` for the smaller
 * @param sweepFlag - `1` for clockwise (positive-angle), `0` for counter-clockwise
 */
function sampleArc(
  start: Point,
  rx: number,
  ry: number,
  xRotDeg: number,
  largeArcFlag: number,
  sweepFlag: number,
  end: Point,
  segments: number = DEFAULT_SEGMENTS,
): Point[] {
  if ((start.x === end.x && start.y === end.y) || rx === 0 || ry === 0) {
    return [end];
  }

  // Radii must be positive (SVG spec §F.6.6.1)
  rx = Math.abs(rx);
  ry = Math.abs(ry);

  const phi = (xRotDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  // Step 1: Compute (x1', y1') — midpoint in the rotated coordinate system
  const dx = (start.x - end.x) / 2;
  const dy = (start.y - end.y) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;

  // Step 2: Correct radii if the ellipse is too small to bridge the endpoints
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;
  let rxSq = rx * rx;
  let rySq = ry * ry;

  const lambda = x1pSq / rxSq + y1pSq / rySq;
  if (lambda > 1) {
    const sqrtLambda = Math.sqrt(lambda);
    rx *= sqrtLambda;
    ry *= sqrtLambda;
    rxSq = rx * rx;
    rySq = ry * ry;
  }

  // Step 3: Compute center in the rotated frame (cx', cy')
  const num = Math.max(0, rxSq * rySq - rxSq * y1pSq - rySq * x1pSq);
  const den = rxSq * y1pSq + rySq * x1pSq;
  const sq = Math.sqrt(num / den);
  const sign = largeArcFlag === sweepFlag ? -1 : 1;
  const cxp = sign * sq * ((rx * y1p) / ry);
  const cyp = sign * sq * ((-ry * x1p) / rx);

  // Step 4: Transform center back to the original coordinate system (cx, cy)
  const cx = cosPhi * cxp - sinPhi * cyp + (start.x + end.x) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (start.y + end.y) / 2;

  // Step 5: Compute start angle (θ₁) and angular extent (Δθ)
  const theta1 = vectorAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dtheta = vectorAngle(
    (x1p - cxp) / rx,
    (y1p - cyp) / ry,
    (-x1p - cxp) / rx,
    (-y1p - cyp) / ry,
  );

  // Clamp Δθ to the correct half-plane for the chosen sweep direction
  if (sweepFlag === 0 && dtheta > 0) {
    dtheta -= 2 * Math.PI;
  } else if (sweepFlag === 1 && dtheta < 0) {
    dtheta += 2 * Math.PI;
  }

  // For each θ = θ₁ + t·Δθ, rotate (rx·cosθ, ry·sinθ) by φ and translate to (cx, cy)
  const points: Point[] = [];
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const angle = theta1 + t * dtheta;
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);

    points.push({
      x: cosPhi * rx * cosAngle - sinPhi * ry * sinAngle + cx,
      y: sinPhi * rx * cosAngle + cosPhi * ry * sinAngle + cy,
    });
  }

  return points;
}

// ---------------------------------------------------------------------------
// Math utilities
// ---------------------------------------------------------------------------

/**
 * Signed angle from vector **u** to vector **v**.
 *
 * Uses `atan2(u × v, u · v)` rather than `acos` for numerical stability
 * near 0° and 180°.
 *
 * @returns Angle in radians, in the range (−π, π]
 */
function vectorAngle(ux: number, uy: number, vx: number, vy: number): number {
  return Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
}
