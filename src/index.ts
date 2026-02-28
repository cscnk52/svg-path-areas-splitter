import { SVGPathData } from "svg-pathdata";

export function SplitPath(d: string): Array<string> {
  const pathData: SVGPathData = new SVGPathData(d);

  // TODO
  return [""];
}

type Point = [number, number];
/**
 * Detect path Direction using Shoelace formula
 * https://en.wikipedia.org/wiki/Shoelace_formula
 * @param d - the path need to be detect
 * @returns "cw" for clockwise, ccw for anticlockwise
 */
export function detectDirection(points: Array<Point>): "ccw" | "cw" {
  if (points.length < 3) {
    throw new Error("At least 3 points required");
  }

  let sum = 0;

  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];

    sum += x1 * y2 - x2 * y1;
  }

  if (sum === 0) {
    throw new Error("Points are collinear");
  }

  return sum > 0 ? "ccw" : "cw";
}
