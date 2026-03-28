import { encodeSVGPath, SVGCommand, SVGPathData } from "svg-pathdata";

import { flatten } from "@/flatten";
import { normalize } from "@/normalize";
import type { FillRule, NormalizeSVGCommand, Point } from "@/types";

export type { FillRule };

/**
 * Splits a compound SVG path `d` string into individual fill-area sub-paths.
 *
 * Each sub-path is returned as a standalone `d` string. If the original path
 * contained a relative `m` at the start of a sub-path, it is converted to an
 * absolute `M` so the returned strings are self-contained; all other commands
 * are preserved exactly as written.
 *
 * Sub-paths that are holes (cut-outs) under the given fill rule are excluded
 * from the result.
 *
 * @param d - SVG path `d` attribute string
 * @param fillRule - SVG fill rule used to distinguish areas from holes
 * @returns One `d` string per fill-area sub-path
 */
export function split(d: string, fillRule: FillRule = "nonzero"): string[] {
  const original = SVGPathData.parse(d);
  const normalized = normalize(original);
  const groups = buildGroups(original, normalized);

  return groups.filter((group, _, all) => isArea(group, all, fillRule)).map(encodeSVGPath);
}

// ---------------------------------------------------------------------------
// Sub-path grouping
// ---------------------------------------------------------------------------

/**
 * Splits a flat command array into per-sub-path groups at every `M` boundary.
 *
 * `normalize` and the original commands share a strict 1-to-1 index mapping
 * (every input command produces exactly one output command), so we use the
 * normalized version solely to obtain the absolute `M` coordinates for each
 * sub-path start, while keeping all other commands from the original parse.
 * This ensures that the only modification made to the returned paths is
 * converting a relative opening `m` to its absolute equivalent.
 */
function buildGroups(original: SVGCommand[], normalized: NormalizeSVGCommand[]): SVGCommand[][] {
  const groups: SVGCommand[][] = [];
  let current: SVGCommand[] = [];

  for (let i = 0; i < original.length; i++) {
    const norm = normalized[i];

    if (norm.type === SVGPathData.MOVE_TO) {
      if (current.length > 0) groups.push(current);
      // Fix opening m → M using the absolutized coordinate from normalize;
      // every other command in the sub-path is taken from the original parse.
      current = [{ type: SVGPathData.MOVE_TO, relative: false, x: norm.x, y: norm.y }];
    } else {
      current.push(original[i]);
    }
  }

  if (current.length > 0) groups.push(current);
  return groups;
}

// ---------------------------------------------------------------------------
// Fill-rule classification
// ---------------------------------------------------------------------------

function isArea(group: SVGCommand[], all: SVGCommand[][], fillRule: FillRule): boolean {
  const points = flatten(group);

  if (fillRule === "nonzero") {
    // In SVG screen coordinates (y-axis pointing down), a clockwise path has
    // positive signed area and represents a fill region; a counter-clockwise
    // path has negative signed area and represents a hole.
    return signedArea(points) > 0;
  }

  // evenodd: a sub-path is a fill area when it is contained by an even number
  // of other sub-paths (depth 0, 2, 4, …). Containment is tested with a
  // single point from the sub-path against every other sub-path's outline.
  const testPoint = points[0];
  const depth = all.filter(
    (other) => other !== group && pointInPolygon(testPoint, flatten(other)),
  ).length;
  return depth % 2 === 0;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/**
 * Signed area of a polygon via the Shoelace (Gauss) formula:
 *
 *     A = (1/2) · Σ (xᵢ · yᵢ₊₁ − xᵢ₊₁ · yᵢ)
 *
 * In SVG screen coordinates positive area means clockwise orientation.
 */
function signedArea(points: Point[]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const { x: x0, y: y0 } = points[i];
    const { x: x1, y: y1 } = points[(i + 1) % n];
    area += x0 * y1 - x1 * y0;
  }
  return area / 2;
}

/**
 * Point-in-polygon test using the ray casting algorithm.
 *
 * Casts a horizontal ray from `point` to +∞ and counts how many edges of
 * `polygon` it crosses. An odd count means the point is inside.
 */
function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const { x: xi, y: yi } = polygon[i];
    const { x: xj, y: yj } = polygon[j];
    if (yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
