import { SVGPathData } from "svg-pathdata";
import { describe, it, expect } from "vitest";

import { flatten } from "@/flatten";

function parse(d: string) {
  return SVGPathData.parse(d);
}

describe("flatten", () => {
  describe("empty input", () => {
    it("returns an empty array for no commands", () => {
      expect(flatten([])).toEqual([]);
    });
  });

  describe("MoveTo", () => {
    it("absolute M produces the target point", () => {
      const commands = parse("M 10 20");
      expect(flatten(commands)).toEqual([{ x: 10, y: 20 }]);
    });

    it("relative m offsets from the current point (origin)", () => {
      const commands = parse("m 5 7");
      expect(flatten(commands)).toEqual([{ x: 5, y: 7 }]);
    });

    it("multiple absolute M commands produce independent points", () => {
      const commands = parse("M 1 2 M 3 4");
      expect(flatten(commands)).toEqual([
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ]);
    });

    it("relative m after absolute M offsets from the previous point", () => {
      const commands = parse("M 10 10 m 5 5");
      expect(flatten(commands)).toEqual([
        { x: 10, y: 10 },
        { x: 15, y: 15 },
      ]);
    });
  });

  describe("LineTo", () => {
    it("absolute L produces the target point", () => {
      const commands = parse("M 0 0 L 10 20");
      expect(flatten(commands)).toEqual([
        { x: 0, y: 0 },
        { x: 10, y: 20 },
      ]);
    });

    it("relative l offsets from the current point", () => {
      const commands = parse("M 5 5 l 3 4");
      expect(flatten(commands)).toEqual([
        { x: 5, y: 5 },
        { x: 8, y: 9 },
      ]);
    });

    it("chained relative l commands accumulate offsets", () => {
      const commands = parse("M 0 0 l 1 1 l 2 2 l 3 3");
      expect(flatten(commands)).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 3, y: 3 },
        { x: 6, y: 6 },
      ]);
    });
  });

  describe("HorizLineTo", () => {
    it("absolute H moves x while keeping current y", () => {
      const commands = parse("M 0 5 H 10");
      expect(flatten(commands)).toEqual([
        { x: 0, y: 5 },
        { x: 10, y: 5 },
      ]);
    });

    it("relative h offsets x from the current point", () => {
      const commands = parse("M 3 7 h 4");
      expect(flatten(commands)).toEqual([
        { x: 3, y: 7 },
        { x: 7, y: 7 },
      ]);
    });

    it("chained H commands each produce a point with the same y", () => {
      const commands = parse("M 0 10 H 5 H 15");
      expect(flatten(commands)).toEqual([
        { x: 0, y: 10 },
        { x: 5, y: 10 },
        { x: 15, y: 10 },
      ]);
    });
  });

  describe("VertLineTo", () => {
    it("absolute V moves y while keeping current x", () => {
      const commands = parse("M 5 0 V 10");
      expect(flatten(commands)).toEqual([
        { x: 5, y: 0 },
        { x: 5, y: 10 },
      ]);
    });

    it("relative v offsets y from the current point", () => {
      const commands = parse("M 7 3 v 4");
      expect(flatten(commands)).toEqual([
        { x: 7, y: 3 },
        { x: 7, y: 7 },
      ]);
    });

    it("chained v commands accumulate y offset", () => {
      const commands = parse("M 2 0 v 3 v 3 v 3");
      expect(flatten(commands)).toEqual([
        { x: 2, y: 0 },
        { x: 2, y: 3 },
        { x: 2, y: 6 },
        { x: 2, y: 9 },
      ]);
    });
  });

  describe("ClosePath", () => {
    it("Z commands are skipped and produce no points", () => {
      const commands = parse("M 0 0 L 10 0 L 10 10 Z");
      expect(flatten(commands)).toEqual([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ]);
    });

    it("z (lowercase) is also skipped", () => {
      const commands = parse("M 0 0 L 5 5 z");
      expect(flatten(commands)).toEqual([
        { x: 0, y: 0 },
        { x: 5, y: 5 },
      ]);
    });

    it("only Z command yields empty result", () => {
      // Z alone isn't valid SVG but the parser may still emit CLOSE_PATH
      const commands = parse("Z");
      expect(flatten(commands)).toEqual([]);
    });
  });

  describe("mixed commands", () => {
    it("triangle: M, L, L, Z", () => {
      const commands = parse("M 0 0 L 10 0 L 5 10 Z");
      expect(flatten(commands)).toEqual([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 10 },
      ]);
    });

    it("rectangle using H and V", () => {
      const commands = parse("M 0 0 H 10 V 5 H 0 V 0 Z");
      expect(flatten(commands)).toEqual([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 5 },
        { x: 0, y: 5 },
        { x: 0, y: 0 },
      ]);
    });

    it("relative path building a square", () => {
      const commands = parse("M 0 0 l 10 0 l 0 10 l -10 0 z");
      expect(flatten(commands)).toEqual([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ]);
    });

    it("mix of relative and absolute with H and V", () => {
      const commands = parse("M 2 3 h 5 V 10 l -5 0 Z");
      expect(flatten(commands)).toEqual([
        { x: 2, y: 3 },
        { x: 7, y: 3 },
        { x: 7, y: 10 },
        { x: 2, y: 10 },
      ]);
    });

    it("multiple sub-paths separated by M", () => {
      const commands = parse("M 0 0 L 1 1 Z M 5 5 L 6 6 Z");
      expect(flatten(commands)).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 5, y: 5 },
        { x: 6, y: 6 },
      ]);
    });

    it("complex path with many command types", () => {
      const commands = parse("M 0 0 h 4 v 3 H 2 V 1 l 1 1 L 0 0 Z");
      const result = flatten(commands);
      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 3 },
        { x: 2, y: 3 },
        { x: 2, y: 1 },
        { x: 3, y: 2 },
        { x: 0, y: 0 },
      ]);
    });
  });

  describe("currentPoint tracking", () => {
    it("currentPoint starts at origin when no M is given first", () => {
      // L without preceding M should offset from (0,0)
      const commands = parse("L 5 5");
      expect(flatten(commands)).toEqual([{ x: 5, y: 5 }]);
    });

    it("relative commands after Z offset from startPoint per SVG spec", () => {
      // Per SVG spec, Z resets currentPoint to startPoint (the last M target).
      // So after "M 10 10 L 20 20 Z", currentPoint = (10,10), and l 1 1 => (11,11).
      const commands = parse("M 10 10 L 20 20 Z l 1 1");
      const result = flatten(commands);
      expect(result).toEqual([
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        { x: 11, y: 11 },
      ]);
    });
  });

  describe("Quadratic Bézier (Q)", () => {
    it("absolute Q produces sampled points ending at the target", () => {
      // Q with control point (50,0) and endpoint (100,0) from (0,0)
      // This is a straight-ish parabola; the last sampled point must equal the endpoint.
      const commands = parse("M 0 0 Q 50 100 100 0");
      const result = flatten(commands);
      // First point is from M
      expect(result[0]).toEqual({ x: 0, y: 0 });
      // Last point must be the curve endpoint
      const last = result[result.length - 1];
      expect(last.x).toBeCloseTo(100, 5);
      expect(last.y).toBeCloseTo(0, 5);
      // Should have more than 2 points (M + sampled curve points)
      expect(result.length).toBeGreaterThan(2);
    });

    it("relative q offsets control point and endpoint from currentPoint", () => {
      const commands = parse("M 10 10 q 25 50 50 0");
      const result = flatten(commands);
      expect(result[0]).toEqual({ x: 10, y: 10 });
      const last = result[result.length - 1];
      expect(last.x).toBeCloseTo(60, 5);
      expect(last.y).toBeCloseTo(10, 5);
    });

    it("midpoint of a symmetric quadratic is at the expected height", () => {
      // Q from (0,0) with cp (50,100) to (100,0)
      // At t=0.5 the De Casteljau result is (50, 50): average of control polygon
      const commands = parse("M 0 0 Q 50 100 100 0");
      const result = flatten(commands);
      // With 20 segments (default), t=0.5 is at index 10 in the curve samples,
      // which is result[10+1] = result[11] counting the M point at [0].
      // Instead of relying on exact index, find the point closest to x=50.
      const mid = result.reduce((best, p) =>
        Math.abs(p.x - 50) < Math.abs(best.x - 50) ? p : best,
      );
      expect(mid.x).toBeCloseTo(50, -1);
      expect(mid.y).toBeCloseTo(50, -1);
    });

    it("degenerate Q where control point equals start and end is a straight line", () => {
      const commands = parse("M 0 0 Q 0 0 10 0");
      const result = flatten(commands);
      const last = result[result.length - 1];
      expect(last.x).toBeCloseTo(10, 5);
      expect(last.y).toBeCloseTo(0, 5);
      // All y values should be 0 (straight line on x-axis)
      for (const p of result) {
        expect(p.y).toBeCloseTo(0, 5);
      }
    });
  });

  describe("Cubic Bézier (C)", () => {
    it("absolute C produces sampled points ending at the target", () => {
      const commands = parse("M 0 0 C 0 100 100 100 100 0");
      const result = flatten(commands);
      expect(result[0]).toEqual({ x: 0, y: 0 });
      const last = result[result.length - 1];
      expect(last.x).toBeCloseTo(100, 5);
      expect(last.y).toBeCloseTo(0, 5);
      expect(result.length).toBeGreaterThan(2);
    });

    it("relative c offsets all control points and endpoint from currentPoint", () => {
      const commands = parse("M 10 10 c 0 50 50 50 50 0");
      const result = flatten(commands);
      expect(result[0]).toEqual({ x: 10, y: 10 });
      const last = result[result.length - 1];
      expect(last.x).toBeCloseTo(60, 5);
      expect(last.y).toBeCloseTo(10, 5);
    });

    it("midpoint of a symmetric cubic is at the expected height", () => {
      // C from (0,0) with cp1 (0,100), cp2 (100,100) to (100,0)
      // At t=0.5 the De Casteljau result is (50, 75)
      const commands = parse("M 0 0 C 0 100 100 100 100 0");
      const result = flatten(commands);
      const mid = result.reduce((best, p) =>
        Math.abs(p.x - 50) < Math.abs(best.x - 50) ? p : best,
      );
      expect(mid.x).toBeCloseTo(50, -1);
      expect(mid.y).toBeCloseTo(75, -1);
    });

    it("degenerate C where all control points are collinear is a straight line", () => {
      const commands = parse("M 0 0 C 33 0 66 0 100 0");
      const result = flatten(commands);
      const last = result[result.length - 1];
      expect(last.x).toBeCloseTo(100, 5);
      expect(last.y).toBeCloseTo(0, 5);
      for (const p of result) {
        expect(p.y).toBeCloseTo(0, 5);
      }
    });
  });

  describe("Arc (A)", () => {
    it("absolute A produces sampled points ending at the target", () => {
      // Semicircle from (0,0) to (100,0) with radius 50
      const commands = parse("M 0 0 A 50 50 0 1 1 100 0");
      const result = flatten(commands);
      expect(result[0]).toEqual({ x: 0, y: 0 });
      const last = result[result.length - 1];
      expect(last.x).toBeCloseTo(100, 5);
      expect(last.y).toBeCloseTo(0, 5);
      expect(result.length).toBeGreaterThan(2);
    });

    it("relative a offsets the endpoint from currentPoint", () => {
      const commands = parse("M 10 10 a 25 25 0 1 1 50 0");
      const result = flatten(commands);
      expect(result[0]).toEqual({ x: 10, y: 10 });
      const last = result[result.length - 1];
      expect(last.x).toBeCloseTo(60, 5);
      expect(last.y).toBeCloseTo(10, 5);
    });

    it("degenerate arc with zero radius returns the endpoint directly", () => {
      const commands = parse("M 0 0 A 0 0 0 0 1 10 10");
      const result = flatten(commands);
      const last = result[result.length - 1];
      expect(last.x).toBeCloseTo(10, 5);
      expect(last.y).toBeCloseTo(10, 5);
    });

    it("degenerate arc where start equals end returns the endpoint directly", () => {
      const commands = parse("M 5 5 A 10 10 0 0 1 5 5");
      const result = flatten(commands);
      // M produces (5,5), arc from (5,5) to (5,5) is degenerate
      const last = result[result.length - 1];
      expect(last.x).toBeCloseTo(5, 5);
      expect(last.y).toBeCloseTo(5, 5);
    });

    it("semicircle peaks at the expected height", () => {
      // Arc from (0,0) to (100,0) with r=50, large-arc=0, sweep=1
      // In SVG coords (y-down), sweep=1 traces the upper arc (negative y)
      const commands = parse("M 0 0 A 50 50 0 0 1 100 0");
      const result = flatten(commands);
      const peak = result.reduce((best, p) => (p.y < best.y ? p : best));
      expect(peak.y).toBeCloseTo(-50, 0);
    });

    it("arc with sweep=0 traces the opposite arc and peaks at positive y", () => {
      // sweep=0 with the same geometry as the semicircle test above but mirrored:
      // the Δθ clamping branch (sweepFlag===0 && dtheta>0) subtracts 2π,
      // making the arc traverse through positive y instead of negative y.
      const commands = parse("M 0 0 A 50 50 0 0 0 100 0");
      const result = flatten(commands);
      const last = result[result.length - 1];
      expect(last.x).toBeCloseTo(100, 5);
      expect(last.y).toBeCloseTo(0, 5);
      const peak = result.reduce((best, p) => (p.y > best.y ? p : best));
      expect(peak.y).toBeCloseTo(50, 0);
    });

    it("arc with radii too small to span the endpoints are scaled up", () => {
      // rx=ry=1 cannot bridge (0,0) to (100,0); Step 2 of the W3C algorithm
      // scales them up (lambda >> 1) so the arc still reaches the endpoint.
      const commands = parse("M 0 0 A 1 1 0 0 1 100 0");
      const result = flatten(commands);
      expect(result[0]).toEqual({ x: 0, y: 0 });
      const last = result[result.length - 1];
      expect(last.x).toBeCloseTo(100, 5);
      expect(last.y).toBeCloseTo(0, 5);
      expect(result.length).toBeGreaterThan(2);
    });

    it("large arc with sweep=1 traverses the long way around", () => {
      // A 60 60 0 1 1 100 0: rx > (endpoint distance / 2), so two distinct
      // arcs exist. With large-arc=1 and sweep=1 the raw vectorAngle result
      // for Δθ is negative, triggering the dtheta += 2π correction.
      const commands = parse("M 0 0 A 60 60 0 1 1 100 0");
      const result = flatten(commands);
      const last = result[result.length - 1];
      expect(last.x).toBeCloseTo(100, 5);
      expect(last.y).toBeCloseTo(0, 5);
      // The large arc dips well below y=0, proving it went the long way around
      const lowestY = Math.min(...result.map((p) => p.y));
      expect(lowestY).toBeLessThan(-50);
    });

    it("large arc with sweep=0 traverses the long way around", () => {
      // A 60 60 0 1 0 100 0: large-arc=1, sweep=0, rx > endpoint distance / 2.
      // vectorAngle gives dtheta ≈ +1.97 rad (positive), but sweep=0 requires a
      // negative sweep, so the dtheta -= 2π branch fires, making dtheta ≈ -4.31 rad.
      const commands = parse("M 0 0 A 60 60 0 1 0 100 0");
      const result = flatten(commands);
      const last = result[result.length - 1];
      expect(last.x).toBeCloseTo(100, 5);
      expect(last.y).toBeCloseTo(0, 5);
      // The large arc peaks well above y=0, proving it went the long way around
      const highestY = Math.max(...result.map((p) => p.y));
      expect(highestY).toBeGreaterThan(50);
    });
  });
});
