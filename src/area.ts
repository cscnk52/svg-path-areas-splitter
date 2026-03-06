/**
 * Compute the signed area of a polygon using the Shoelace formula.
 *
 * Positive → counterclockwise (CCW), negative → clockwise (CW).
 *
 * @link https://en.wikipedia.org/wiki/Shoelace_formula
 * @param points - polygon vertices as [x, y] pairs
 * @returns the signed area (positive for CCW, negative for CW)
 */
export function signedArea(points: Array<[number, number]>): number {
  if (points.length < 3) {
    throw new Error("At least 3 points required");
  }

  let sum = 0;

  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];

    sum += x1 * y2 - x2 * y1;
  }

  return sum / 2;
}
