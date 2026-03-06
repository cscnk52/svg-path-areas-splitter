/**
 * Containment utilities: point-in-polygon test and bounding box helpers.
 *
 * Uses the ray-casting algorithm for point-in-polygon detection.
 * @see https://en.wikipedia.org/wiki/Point_in_polygon#Ray_casting_algorithm
 */

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Compute the axis-aligned bounding box for a polygon.
 *
 * @param points - polygon vertices as [x, y] pairs
 * @returns the bounding box
 */
export function computeBoundingBox(points: Array<[number, number]>): BoundingBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Check whether bounding box `inner` is fully contained within bounding box `outer`.
 *
 * This is a fast pre-check to avoid expensive point-in-polygon tests
 * when the bounding boxes don't even overlap.
 */
export function bboxContains(outer: BoundingBox, inner: BoundingBox): boolean {
  return (
    inner.minX >= outer.minX &&
    inner.minY >= outer.minY &&
    inner.maxX <= outer.maxX &&
    inner.maxY <= outer.maxY
  );
}

/**
 * Determine whether a point lies inside a polygon using the ray-casting algorithm.
 *
 * Casts a horizontal ray from the test point towards +X and counts how many
 * edges of the polygon it crosses. An odd count means the point is inside.
 *
 * @param point - the [x, y] test point
 * @param polygon - polygon vertices as [x, y] pairs (implicitly closed)
 * @returns true if the point is inside the polygon
 */
export function pointInPolygon(point: [number, number], polygon: Array<[number, number]>): boolean {
  const [px, py] = point;
  const n = polygon.length;
  let inside = false;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    // Check if the edge crosses the horizontal ray from (px, py) → +∞
    if (yi > py !== yj > py) {
      // Compute the x-coordinate where the edge intersects y = py
      const intersectX = xj + ((py - yj) / (yi - yj)) * (xi - xj);
      if (px < intersectX) {
        inside = !inside;
      }
    }
  }

  return inside;
}

/**
 * Determine whether polygon `inner` is contained within polygon `outer`.
 *
 * Strategy:
 * 1. Fast reject via bounding box check.
 * 2. Test a sample of points from `inner` — if the majority are inside
 *    `outer`, we consider it contained. Testing multiple points makes this
 *    robust against edge cases where a single vertex might land exactly
 *    on the boundary.
 *
 * @param outer - the candidate container polygon
 * @param outerBBox - precomputed bounding box for `outer`
 * @param inner - the candidate contained polygon
 * @param innerBBox - precomputed bounding box for `inner`
 * @returns true if `inner` is geometrically inside `outer`
 */
export function polygonContains(
  outer: Array<[number, number]>,
  outerBBox: BoundingBox,
  inner: Array<[number, number]>,
  innerBBox: BoundingBox,
): boolean {
  // Fast reject: if the inner bbox isn't even within the outer bbox, skip
  if (!bboxContains(outerBBox, innerBBox)) {
    return false;
  }

  // Sample up to `maxSamples` evenly-spaced points from inner polygon
  const maxSamples = Math.min(inner.length, 8);
  const step = Math.max(1, Math.floor(inner.length / maxSamples));

  let insideCount = 0;
  let testedCount = 0;

  for (let i = 0; i < inner.length && testedCount < maxSamples; i += step) {
    testedCount++;
    if (pointInPolygon(inner[i], outer)) {
      insideCount++;
    }
  }

  // Consider contained if more than half the sampled points are inside
  return insideCount > testedCount / 2;
}
