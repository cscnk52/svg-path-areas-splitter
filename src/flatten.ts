import { SVGPathData } from "svg-pathdata";
import type { SVGCommand } from "svg-pathdata";

/**
 * Flatten a sequence of absolute SVG path commands into a polyline
 * (array of [x, y] points) by sampling curves at a fixed number of steps.
 *
 * Supported commands: M, L, H, V, C, S, Q, T, A, Z
 *
 * @param commands - absolute path commands belonging to a single subpath
 * @param steps - number of segments to use when approximating each curve (default 64)
 * @returns array of [x, y] sample points
 */
export function flattenSubpath(
  commands: SVGCommand[],
  steps: number = 64,
): Array<[number, number]> {
  const points: Array<[number, number]> = [];

  let curX = 0;
  let curY = 0;
  let startX = 0;
  let startY = 0;

  // For smooth curve reflection
  let lastControlX = 0;
  let lastControlY = 0;
  let lastCommandType = -1;

  function pushPoint(x: number, y: number) {
    const last = points[points.length - 1];
    // avoid exact duplicates
    if (!last || last[0] !== x || last[1] !== y) {
      points.push([x, y]);
    }
  }

  for (const cmd of commands) {
    switch (cmd.type) {
      // M – moveTo
      case SVGPathData.MOVE_TO: {
        curX = cmd.x;
        curY = cmd.y;
        startX = curX;
        startY = curY;
        pushPoint(curX, curY);
        break;
      }

      // Z – closePath
      case SVGPathData.CLOSE_PATH: {
        curX = startX;
        curY = startY;
        // Don't push the start point again; the polygon is implicitly closed
        break;
      }

      // L – lineTo
      case SVGPathData.LINE_TO: {
        curX = cmd.x;
        curY = cmd.y;
        pushPoint(curX, curY);
        break;
      }

      // H – horizontal lineTo
      case SVGPathData.HORIZ_LINE_TO: {
        curX = cmd.x;
        pushPoint(curX, curY);
        break;
      }

      // V – vertical lineTo
      case SVGPathData.VERT_LINE_TO: {
        curY = cmd.y;
        pushPoint(curX, curY);
        break;
      }

      // C – cubic bézier
      case SVGPathData.CURVE_TO: {
        const x0 = curX;
        const y0 = curY;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          pushPoint(
            cubicBezier(t, x0, cmd.x1, cmd.x2, cmd.x),
            cubicBezier(t, y0, cmd.y1, cmd.y2, cmd.y),
          );
        }
        lastControlX = cmd.x2;
        lastControlY = cmd.y2;
        curX = cmd.x;
        curY = cmd.y;
        lastCommandType = cmd.type;
        continue; // skip the default lastCommandType assignment at the end
      }

      // S – smooth cubic bézier
      case SVGPathData.SMOOTH_CURVE_TO: {
        const x0 = curX;
        const y0 = curY;

        // Reflect previous control point, or use current point if no previous C/S
        let cx1: number;
        let cy1: number;
        if (
          lastCommandType === SVGPathData.CURVE_TO ||
          lastCommandType === SVGPathData.SMOOTH_CURVE_TO
        ) {
          cx1 = 2 * curX - lastControlX;
          cy1 = 2 * curY - lastControlY;
        } else {
          cx1 = curX;
          cy1 = curY;
        }

        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          pushPoint(cubicBezier(t, x0, cx1, cmd.x2, cmd.x), cubicBezier(t, y0, cy1, cmd.y2, cmd.y));
        }
        lastControlX = cmd.x2;
        lastControlY = cmd.y2;
        curX = cmd.x;
        curY = cmd.y;
        lastCommandType = cmd.type;
        continue;
      }

      // Q – quadratic bézier
      case SVGPathData.QUAD_TO: {
        const x0 = curX;
        const y0 = curY;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          pushPoint(quadBezier(t, x0, cmd.x1, cmd.x), quadBezier(t, y0, cmd.y1, cmd.y));
        }
        lastControlX = cmd.x1;
        lastControlY = cmd.y1;
        curX = cmd.x;
        curY = cmd.y;
        lastCommandType = cmd.type;
        continue;
      }

      // T – smooth quadratic bézier
      case SVGPathData.SMOOTH_QUAD_TO: {
        const x0 = curX;
        const y0 = curY;

        let cx: number;
        let cy: number;
        if (
          lastCommandType === SVGPathData.QUAD_TO ||
          lastCommandType === SVGPathData.SMOOTH_QUAD_TO
        ) {
          cx = 2 * curX - lastControlX;
          cy = 2 * curY - lastControlY;
        } else {
          cx = curX;
          cy = curY;
        }

        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          pushPoint(quadBezier(t, x0, cx, cmd.x), quadBezier(t, y0, cy, cmd.y));
        }
        lastControlX = cx;
        lastControlY = cy;
        curX = cmd.x;
        curY = cmd.y;
        lastCommandType = cmd.type;
        continue;
      }

      // A – elliptical arc
      case SVGPathData.ARC: {
        const arcPoints = approximateArc(
          curX,
          curY,
          cmd.rX,
          cmd.rY,
          cmd.xRot,
          cmd.lArcFlag,
          cmd.sweepFlag,
          cmd.x,
          cmd.y,
          steps,
        );
        for (const [px, py] of arcPoints) {
          pushPoint(px, py);
        }
        curX = cmd.x;
        curY = cmd.y;
        break;
      }
    }

    lastCommandType = cmd.type;
  }

  return points;
}

/**
 * Evaluate a cubic bézier at parameter t for one axis.
 */
function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

/**
 * Evaluate a quadratic bézier at parameter t for one axis.
 */
function quadBezier(t: number, p0: number, p1: number, p2: number): number {
  const mt = 1 - t;
  return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
}

/**
 * Approximate an elliptical arc as a polyline.
 *
 * Uses the SVG spec's endpoint-to-center parameterisation, then samples
 * the arc at `steps` intervals.
 *
 * @see https://www.w3.org/TR/SVG/implnote.html#ArcImplementationNotes
 */
function approximateArc(
  x1: number,
  y1: number,
  rx: number,
  ry: number,
  xRotationDeg: number,
  largeArcFlag: 0 | 1,
  sweepFlag: 0 | 1,
  x2: number,
  y2: number,
  steps: number,
): Array<[number, number]> {
  // Degenerate: endpoints are the same
  if (x1 === x2 && y1 === y2) {
    return [];
  }

  let arcRx = Math.abs(rx);
  let arcRy = Math.abs(ry);

  // Degenerate: zero radius → treat as line
  if (arcRx === 0 || arcRy === 0) {
    return [[x2, y2]];
  }

  const xRotation = (xRotationDeg * Math.PI) / 180;
  const cosRot = Math.cos(xRotation);
  const sinRot = Math.sin(xRotation);

  // Step 1: Compute (x1', y1') - transformed midpoint
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cosRot * dx + sinRot * dy;
  const y1p = -sinRot * dx + cosRot * dy;

  // Step 1.5: Ensure radii are large enough
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;
  let rxSq = arcRx * arcRx;
  let rySq = arcRy * arcRy;

  const lambda = x1pSq / rxSq + y1pSq / rySq;
  if (lambda > 1) {
    const sqrtLambda = Math.sqrt(lambda);
    arcRx *= sqrtLambda;
    arcRy *= sqrtLambda;
    rxSq = arcRx * arcRx;
    rySq = arcRy * arcRy;
  }

  // Step 2: Compute (cx', cy')
  const num = rxSq * rySq - rxSq * y1pSq - rySq * x1pSq;
  const denom = rxSq * y1pSq + rySq * x1pSq;
  const sq = Math.max(0, num / denom);
  let sc = Math.sqrt(sq);
  if (largeArcFlag === sweepFlag) {
    sc = -sc;
  }

  const cxp = (sc * arcRx * y1p) / arcRy;
  const cyp = (-sc * arcRy * x1p) / arcRx;

  // Step 3: Compute (cx, cy) from (cx', cy')
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const cx = cosRot * cxp - sinRot * cyp + mx;
  const cy = sinRot * cxp + cosRot * cyp + my;

  // Step 4: Compute θ1 and Δθ
  const ux = (x1p - cxp) / arcRx;
  const uy = (y1p - cyp) / arcRy;
  const vx = (-x1p - cxp) / arcRx;
  const vy = (-y1p - cyp) / arcRy;

  const theta1 = vectorAngle(1, 0, ux, uy);
  let dTheta = vectorAngle(ux, uy, vx, vy);

  if (sweepFlag === 0 && dTheta > 0) {
    dTheta -= 2 * Math.PI;
  } else if (sweepFlag === 1 && dTheta < 0) {
    dTheta += 2 * Math.PI;
  }

  // Sample points along the arc
  const result: Array<[number, number]> = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const angle = theta1 + dTheta * t;
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);

    const px = cosRot * arcRx * cosAngle - sinRot * arcRy * sinAngle + cx;
    const py = sinRot * arcRx * cosAngle + cosRot * arcRy * sinAngle + cy;
    result.push([px, py]);
  }

  return result;
}

/**
 * Angle between two vectors (u, v) in radians, respecting sign.
 */
function vectorAngle(ux: number, uy: number, vx: number, vy: number): number {
  const dot = ux * vx + uy * vy;
  const lenU = Math.sqrt(ux * ux + uy * uy);
  const lenV = Math.sqrt(vx * vx + vy * vy);
  let cosVal = dot / (lenU * lenV);

  // Clamp for floating point safety
  cosVal = Math.max(-1, Math.min(1, cosVal));

  let angle = Math.acos(cosVal);
  if (ux * vy - uy * vx < 0) {
    angle = -angle;
  }
  return angle;
}
