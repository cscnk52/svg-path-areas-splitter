import { describe, it, expect } from "vitest";
import { SVGPathData } from "svg-pathdata";
import { flattenSubpath } from "@/flatten";

/**
 * Helper: parse a path `d` string, normalize to absolute, and return the commands
 * for the first (and presumably only) subpath.
 */
function parseCommands(d: string) {
  return new SVGPathData(d).toAbs().normalizeHVZ().commands;
}

/**
 * Helper: flatten a path string and return the points.
 */
function flatten(d: string, steps?: number) {
  const cmds = parseCommands(d);
  return flattenSubpath(cmds, steps);
}

/**
 * Helper: compute distance between two points.
 */
function dist(a: [number, number], b: [number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}

// ---------------------------------------------------------------------------
// MoveTo (M)
// ---------------------------------------------------------------------------
describe("flattenSubpath – MoveTo (M)", () => {
  it("should produce a single point for a bare M command", () => {
    const points = flatten("M10,20");
    expect(points).toHaveLength(1);
    expect(points[0]).toEqual([10, 20]);
  });

  it("should use the correct starting point from M", () => {
    const points = flatten("M42,99 L50,99");
    expect(points[0]).toEqual([42, 99]);
  });
});

// ---------------------------------------------------------------------------
// LineTo (L)
// ---------------------------------------------------------------------------
describe("flattenSubpath – LineTo (L)", () => {
  it("should produce correct points for a simple line", () => {
    const points = flatten("M0,0 L10,0");
    expect(points).toHaveLength(2);
    expect(points[0]).toEqual([0, 0]);
    expect(points[1]).toEqual([10, 0]);
  });

  it("should produce correct points for a polyline", () => {
    const points = flatten("M0,0 L10,0 L10,10 L0,10");
    expect(points).toHaveLength(4);
    expect(points[0]).toEqual([0, 0]);
    expect(points[1]).toEqual([10, 0]);
    expect(points[2]).toEqual([10, 10]);
    expect(points[3]).toEqual([0, 10]);
  });

  it("should produce the correct number of points for a closed rectangle", () => {
    const points = flatten("M0,0 L100,0 L100,100 L0,100 Z");
    // normalizeHVZ converts Z to LINE_TO back to start, so:
    // M(0,0), L(100,0), L(100,100), L(0,100), L(0,0) = 5 points
    // The last L(0,0) is NOT a consecutive duplicate of L(0,100)
    expect(points).toHaveLength(5);
  });

  it("should not produce duplicate points when line ends at the same place", () => {
    const points = flatten("M5,5 L5,5");
    // pushPoint de-duplicates exact matches
    expect(points).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// HorizontalLineTo (H) and VerticalLineTo (V)
// ---------------------------------------------------------------------------
describe("flattenSubpath – HLineTo / VLineTo (H, V)", () => {
  it("should handle H command (horizontal line)", () => {
    // normalizeHVZ converts H/V to L, but let's make sure flattenSubpath
    // still deals with whatever comes out of the normalization pipeline.
    const points = flatten("M0,0 H10");
    expect(points).toHaveLength(2);
    expect(points[1][0]).toBeCloseTo(10);
    expect(points[1][1]).toBeCloseTo(0);
  });

  it("should handle V command (vertical line)", () => {
    const points = flatten("M0,0 V10");
    expect(points).toHaveLength(2);
    expect(points[1][0]).toBeCloseTo(0);
    expect(points[1][1]).toBeCloseTo(10);
  });

  it("should handle a mix of H and V commands forming a staircase", () => {
    const points = flatten("M0,0 H10 V10 H20 V20");
    expect(points).toHaveLength(5);
    expect(points[0]).toEqual([0, 0]);
    expect(points[4][0]).toBeCloseTo(20);
    expect(points[4][1]).toBeCloseTo(20);
  });
});

// ---------------------------------------------------------------------------
// ClosePath (Z)
// ---------------------------------------------------------------------------
describe("flattenSubpath – ClosePath (Z)", () => {
  it("should add a line-to-start when closing (normalizeHVZ converts Z to L)", () => {
    const points = flatten("M0,0 L10,0 L10,10 Z");
    // normalizeHVZ turns Z into L(0,0), which is not a consecutive dup of (10,10)
    expect(points).toHaveLength(4);
    expect(points[3]).toEqual([0, 0]);
  });

  it("should reset current position to start after Z", () => {
    // After Z, currentX/Y should be back at start.
    // normalizeHVZ converts Z to L(0,0), then L5,5 follows.
    const cmds = new SVGPathData("M0,0 L10,0 L10,10 Z L5,5").toAbs().normalizeHVZ().commands;
    const points = flattenSubpath(cmds);
    // Points: (0,0), (10,0), (10,10), (0,0) from Z→L, (5,5)
    expect(points).toHaveLength(5);
    expect(points[3]).toEqual([0, 0]);
    expect(points[4][0]).toBeCloseTo(5);
    expect(points[4][1]).toBeCloseTo(5);
  });
});

// ---------------------------------------------------------------------------
// Cubic Bézier (C)
// ---------------------------------------------------------------------------
describe("flattenSubpath – Cubic Bézier (C)", () => {
  it("should produce steps+1 total points (M point + steps sample points)", () => {
    const steps = 16;
    const points = flatten("M0,0 C10,20 30,20 40,0", steps);
    // 1 from M + 16 from the curve = 17
    expect(points).toHaveLength(1 + steps);
  });

  it("should start at the M point and end at the curve endpoint", () => {
    const points = flatten("M0,0 C10,20 30,20 40,0", 32);
    expect(points[0]).toEqual([0, 0]);
    const last = points[points.length - 1];
    expect(last[0]).toBeCloseTo(40);
    expect(last[1]).toBeCloseTo(0);
  });

  it("should produce a symmetric curve for a symmetric control setup", () => {
    // Symmetric cubic: control points mirror about x=20
    const points = flatten("M0,0 C0,20 40,20 40,0", 64);
    // The midpoint (t=0.5) should be near x=20
    const mid = points[32]; // index 32 corresponds to t=32/64=0.5
    expect(mid[0]).toBeCloseTo(20, 0);
    // y at midpoint of this symmetric curve should be at the peak (~15)
    expect(mid[1]).toBeGreaterThan(0);
  });

  it("should handle a degenerate cubic (straight line)", () => {
    // All control points on a line: C should produce points along that line
    const points = flatten("M0,0 C10,0 20,0 30,0", 8);
    for (const [, y] of points) {
      expect(y).toBeCloseTo(0, 5);
    }
    expect(points[0][0]).toBeCloseTo(0);
    expect(points[points.length - 1][0]).toBeCloseTo(30);
  });

  it("should handle multiple consecutive C commands", () => {
    const steps = 8;
    const points = flatten("M0,0 C5,10 15,10 20,0 C25,-10 35,-10 40,0", steps);
    // M(1) + first C(8) + second C(8) = 17
    expect(points).toHaveLength(1 + steps * 2);
    expect(points[0]).toEqual([0, 0]);
    expect(points[points.length - 1][0]).toBeCloseTo(40);
    expect(points[points.length - 1][1]).toBeCloseTo(0);
  });
});

// ---------------------------------------------------------------------------
// Smooth Cubic Bézier (S)
// ---------------------------------------------------------------------------
describe("flattenSubpath – Smooth Cubic Bézier (S)", () => {
  it("should produce the correct number of sample points", () => {
    const steps = 16;
    // S following a C: the reflected control point is inferred
    const points = flatten("M0,0 C5,10 15,10 20,0 S35,-10 40,0", steps);
    // M(1) + C(16) + S(16) = 33
    expect(points).toHaveLength(1 + steps * 2);
  });

  it("should end at the correct endpoint", () => {
    const points = flatten("M0,0 C5,10 15,10 20,0 S35,-10 40,0", 32);
    const last = points[points.length - 1];
    expect(last[0]).toBeCloseTo(40);
    expect(last[1]).toBeCloseTo(0);
  });

  it("should handle S without a preceding C (uses current point as control)", () => {
    const steps = 16;
    const points = flatten("M0,0 S10,10 20,0", steps);
    // M(1) + S(16) = 17
    expect(points).toHaveLength(1 + steps);
    expect(points[points.length - 1][0]).toBeCloseTo(20);
    expect(points[points.length - 1][1]).toBeCloseTo(0);
  });
});

// ---------------------------------------------------------------------------
// Quadratic Bézier (Q)
// ---------------------------------------------------------------------------
describe("flattenSubpath – Quadratic Bézier (Q)", () => {
  it("should produce steps+1 total points", () => {
    const steps = 16;
    const points = flatten("M0,0 Q20,20 40,0", steps);
    expect(points).toHaveLength(1 + steps);
  });

  it("should start and end correctly", () => {
    const points = flatten("M0,0 Q20,20 40,0", 32);
    expect(points[0]).toEqual([0, 0]);
    const last = points[points.length - 1];
    expect(last[0]).toBeCloseTo(40);
    expect(last[1]).toBeCloseTo(0);
  });

  it("should have the midpoint close to the expected value", () => {
    // For Q(0,0 -> 20,20 -> 40,0), at t=0.5:
    // x = (1-t)^2*0 + 2*(1-t)*t*20 + t^2*40 = 0 + 20 + 10 = 20 ✓ (actually = 20)
    // y = (1-t)^2*0 + 2*(1-t)*t*20 + t^2*0  = 0 + 10 + 0  = 10
    const points = flatten("M0,0 Q20,20 40,0", 64);
    const mid = points[32]; // t = 0.5
    expect(mid[0]).toBeCloseTo(20, 0);
    expect(mid[1]).toBeCloseTo(10, 0);
  });

  it("should handle a degenerate quadratic (straight line)", () => {
    const points = flatten("M0,0 Q15,0 30,0", 8);
    for (const [, y] of points) {
      expect(y).toBeCloseTo(0, 5);
    }
  });
});

// ---------------------------------------------------------------------------
// Smooth Quadratic Bézier (T)
// ---------------------------------------------------------------------------
describe("flattenSubpath – Smooth Quadratic Bézier (T)", () => {
  it("should produce the correct number of sample points", () => {
    const steps = 16;
    const points = flatten("M0,0 Q10,20 20,0 T40,0", steps);
    // M(1) + Q(16) + T(16) = 33
    expect(points).toHaveLength(1 + steps * 2);
  });

  it("should end at the correct endpoint", () => {
    const points = flatten("M0,0 Q10,20 20,0 T40,0", 32);
    const last = points[points.length - 1];
    expect(last[0]).toBeCloseTo(40);
    expect(last[1]).toBeCloseTo(0);
  });

  it("should handle T without a preceding Q", () => {
    const steps = 16;
    const points = flatten("M0,0 T20,0", steps);
    // M(1) + T(16) = 17
    expect(points).toHaveLength(1 + steps);
    expect(points[points.length - 1][0]).toBeCloseTo(20);
    expect(points[points.length - 1][1]).toBeCloseTo(0);
  });

  it("should produce a smooth continuation after Q", () => {
    const points = flatten("M0,0 Q10,20 20,0 T40,0", 64);
    // The curve should pass through (20, 0) at the junction
    // and be symmetric — the T segment mirrors the Q segment
    const midQ = points[32]; // halfway through Q
    const midT = points[96]; // halfway through T (index 64+32)
    // Q goes up (positive y), T should go down (negative y) by the same amount
    expect(midQ[1]).toBeGreaterThan(0);
    expect(midT[1]).toBeLessThan(0);
    expect(Math.abs(midQ[1])).toBeCloseTo(Math.abs(midT[1]), 0);
  });
});

// ---------------------------------------------------------------------------
// Elliptical Arc (A)
// ---------------------------------------------------------------------------
describe("flattenSubpath – Elliptical Arc (A)", () => {
  it("should produce sample points for a semicircular arc", () => {
    const steps = 32;
    // Semicircle from (0,0) to (20,0) with radius 10
    const points = flatten("M0,0 A10,10 0 0,1 20,0", steps);
    // M(1) + A(32) = 33
    expect(points).toHaveLength(1 + steps);
  });

  it("should start and end at the correct positions", () => {
    const points = flatten("M0,0 A10,10 0 0,1 20,0", 64);
    expect(points[0]).toEqual([0, 0]);
    const last = points[points.length - 1];
    expect(last[0]).toBeCloseTo(20);
    expect(last[1]).toBeCloseTo(0);
  });

  it("should produce a curve that reaches the expected height for a semicircle", () => {
    // Semicircle from (0,0) to (20,0), sweep=1, radius=10
    // The arc should go upward or downward by ~10 units
    const points = flatten("M0,0 A10,10 0 0,1 20,0", 64);
    const ys = points.map((p) => p[1]);
    const maxAbsY = Math.max(...ys.map(Math.abs));
    expect(maxAbsY).toBeCloseTo(10, 0);
  });

  it("should handle large-arc-flag=1 (major arc)", () => {
    // Large arc from (0,0) to (10,0) with radius 10
    const points = flatten("M0,0 A10,10 0 1,1 10,0", 64);
    expect(points[0]).toEqual([0, 0]);
    const last = points[points.length - 1];
    expect(last[0]).toBeCloseTo(10);
    expect(last[1]).toBeCloseTo(0);
    // Large arc should cover more than 180°, so points should be spread widely
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const xRange = Math.max(...xs) - Math.min(...xs);
    const yRange = Math.max(...ys) - Math.min(...ys);
    // With large-arc, the extent should be larger than just the chord
    expect(Math.max(xRange, yRange)).toBeGreaterThan(10);
  });

  it("should handle sweep-flag=0 (counter-sweep direction)", () => {
    const pointsSweep0 = flatten("M0,0 A10,10 0 0,0 20,0", 64);
    const pointsSweep1 = flatten("M0,0 A10,10 0 0,1 20,0", 64);

    // Both should start and end at the same places
    expect(pointsSweep0[0]).toEqual([0, 0]);
    expect(pointsSweep0[pointsSweep0.length - 1][0]).toBeCloseTo(20);

    // But they should go in opposite y directions
    const maxY0 = Math.max(...pointsSweep0.map((p) => p[1]));
    const minY0 = Math.min(...pointsSweep0.map((p) => p[1]));
    const maxY1 = Math.max(...pointsSweep1.map((p) => p[1]));
    const minY1 = Math.min(...pointsSweep1.map((p) => p[1]));

    // The two arcs should be mirrored about y=0:
    // one bulges positive-y and the other bulges negative-y.
    // Verify that the positive peak of one matches the negative peak of the other.
    expect(maxY0).toBeCloseTo(-minY1, 0);
    expect(maxY1).toBeCloseTo(-minY0, 0);

    // At least one arc must deviate significantly from y=0
    const range0 = maxY0 - minY0;
    const range1 = maxY1 - minY1;
    expect(range0).toBeGreaterThan(1);
    expect(range1).toBeGreaterThan(1);
  });

  it("should handle elliptical (non-circular) arcs", () => {
    // Ellipse with rx=20, ry=10
    const points = flatten("M0,0 A20,10 0 0,1 40,0", 64);
    expect(points[0]).toEqual([0, 0]);
    const last = points[points.length - 1];
    expect(last[0]).toBeCloseTo(40);
    expect(last[1]).toBeCloseTo(0);
    // Max y excursion should be ~10 (the ry)
    const maxAbsY = Math.max(...points.map((p) => Math.abs(p[1])));
    expect(maxAbsY).toBeCloseTo(10, 0);
  });

  it("should handle rotated elliptical arcs", () => {
    // 45-degree rotated ellipse
    const points = flatten("M0,0 A20,10 45 0,1 30,10", 64);
    expect(points[0]).toEqual([0, 0]);
    const last = points[points.length - 1];
    expect(last[0]).toBeCloseTo(30);
    expect(last[1]).toBeCloseTo(10);
    // Should have intermediate points that aren't on a straight line
    const mid = points[32];
    const lineX = (0 + 30) / 2;
    const lineY = (0 + 10) / 2;
    const deviation = dist(mid, [lineX, lineY]);
    expect(deviation).toBeGreaterThan(1);
  });

  it("should handle degenerate arc (same start and end point) by returning no extra points", () => {
    const points = flatten("M10,10 A5,5 0 0,1 10,10", 16);
    // When start === end, approximateArc returns [] (no points to add)
    expect(points).toHaveLength(1);
    expect(points[0]).toEqual([10, 10]);
  });

  it("should handle degenerate arc (zero radius) as a line", () => {
    const points = flatten("M0,0 A0,0 0 0,1 10,10", 16);
    expect(points).toHaveLength(2);
    expect(points[0]).toEqual([0, 0]);
    expect(points[1][0]).toBeCloseTo(10);
    expect(points[1][1]).toBeCloseTo(10);
  });

  it("should auto-scale radii that are too small", () => {
    // Radius of 1 is too small for endpoints (0,0) and (100,0)
    // The spec says to scale up radii proportionally
    const points = flatten("M0,0 A1,1 0 0,1 100,0", 64);
    expect(points[0]).toEqual([0, 0]);
    const last = points[points.length - 1];
    expect(last[0]).toBeCloseTo(100);
    expect(last[1]).toBeCloseTo(0);
  });
});

// ---------------------------------------------------------------------------
// Mixed commands
// ---------------------------------------------------------------------------
describe("flattenSubpath – mixed commands", () => {
  it("should handle a path with L, C, and Z", () => {
    const steps = 8;
    const points = flatten("M0,0 L10,0 C15,0 20,5 20,10 L20,20 L0,20 Z", steps);
    // M(1) + L(1) + C(8) + L(1) + L(1) + Z→L(1) = 13
    // (Z is converted to L(0,0) by normalizeHVZ, not a consecutive dup of (0,20))
    expect(points).toHaveLength(13);
    expect(points[0]).toEqual([0, 0]);
  });

  it("should handle a path with Q and L", () => {
    const steps = 8;
    const points = flatten("M0,0 Q10,20 20,0 L30,0", steps);
    // M(1) + Q(8) + L(1) = 10
    expect(points).toHaveLength(10);
  });

  it("should handle a circle approximated by 4 arcs", () => {
    // Standard SVG circle approximation: 4 arcs
    const d = [
      "M50,0",
      "A50,50 0 0,1 100,50",
      "A50,50 0 0,1 50,100",
      "A50,50 0 0,1 0,50",
      "A50,50 0 0,1 50,0",
      "Z",
    ].join(" ");
    const points = flatten(d, 32);
    // M(1) + 4*A(32) + Z→L(1) = 130
    // The last arc ends near (50,0) but floating-point may prevent de-dup with the Z→L(50,0)
    expect(points).toHaveLength(1 + 32 * 4 + 1);

    // All points should be roughly distance 50 from center (50,50)
    for (const [x, y] of points) {
      const r = dist([x, y], [50, 50]);
      expect(r).toBeCloseTo(50, 0);
    }
  });

  it("should handle a real-world-like cubic Bézier circle approximation", () => {
    // Standard 4-segment cubic Bézier circle approximation (kappa ≈ 0.5522847498)
    const k = 0.5522847498;
    const r = 50;
    const cx = 50;
    const cy = 50;
    const d = [
      `M${cx},${cy - r}`,
      `C${cx + r * k},${cy - r} ${cx + r},${cy - r * k} ${cx + r},${cy}`,
      `C${cx + r},${cy + r * k} ${cx + r * k},${cy + r} ${cx},${cy + r}`,
      `C${cx - r * k},${cy + r} ${cx - r},${cy + r * k} ${cx - r},${cy}`,
      `C${cx - r},${cy - r * k} ${cx - r * k},${cy - r} ${cx},${cy - r}`,
      "Z",
    ].join(" ");
    const points = flatten(d, 32);

    // All points should be very close to radius 50 from center (50, 50)
    for (const [x, y] of points) {
      const distance = dist([x, y], [cx, cy]);
      // Cubic approximation is very good — within 0.5 units
      expect(distance).toBeCloseTo(r, 0);
    }
  });
});

// ---------------------------------------------------------------------------
// Relative commands (after toAbs conversion)
// ---------------------------------------------------------------------------
describe("flattenSubpath – relative commands (converted via toAbs)", () => {
  it("should handle relative l commands", () => {
    const cmdsAbs = new SVGPathData("M10,10 l5,0 l0,5 l-5,0 l0,-5").toAbs().normalizeHVZ().commands;
    const points = flattenSubpath(cmdsAbs);
    // toAbs converts to: M10,10 L15,10 L15,15 L10,15 L10,10
    // The last L(10,10) is NOT a consecutive dup of L(10,15), so 5 points
    expect(points).toHaveLength(5);
    expect(points[0]).toEqual([10, 10]);
    expect(points[1]).toEqual([15, 10]);
    expect(points[2]).toEqual([15, 15]);
    expect(points[3]).toEqual([10, 15]);
    expect(points[4]).toEqual([10, 10]);
  });

  it("should handle relative c commands", () => {
    const cmdsAbs = new SVGPathData("M0,0 c10,20 30,20 40,0").toAbs().normalizeHVZ().commands;
    const points = flattenSubpath(cmdsAbs, 16);
    expect(points).toHaveLength(17);
    expect(points[0]).toEqual([0, 0]);
    expect(points[points.length - 1][0]).toBeCloseTo(40);
    expect(points[points.length - 1][1]).toBeCloseTo(0);
  });

  it("should handle relative a commands", () => {
    const cmdsAbs = new SVGPathData("M0,0 a10,10 0 0,1 20,0").toAbs().normalizeHVZ().commands;
    const points = flattenSubpath(cmdsAbs, 32);
    expect(points).toHaveLength(33);
    expect(points[0]).toEqual([0, 0]);
    expect(points[points.length - 1][0]).toBeCloseTo(20);
  });

  it("should handle a relative h/v staircase", () => {
    const cmdsAbs = new SVGPathData("M0,0 h10 v10 h10 v10").toAbs().normalizeHVZ().commands;
    const points = flattenSubpath(cmdsAbs);
    expect(points).toHaveLength(5);
    expect(points[4][0]).toBeCloseTo(20);
    expect(points[4][1]).toBeCloseTo(20);
  });
});

// ---------------------------------------------------------------------------
// Steps parameter
// ---------------------------------------------------------------------------
describe("flattenSubpath – steps parameter", () => {
  it("should produce fewer points with fewer steps", () => {
    const few = flatten("M0,0 C10,20 30,20 40,0", 4);
    const many = flatten("M0,0 C10,20 30,20 40,0", 64);
    expect(few.length).toBeLessThan(many.length);
    expect(few).toHaveLength(1 + 4);
    expect(many).toHaveLength(1 + 64);
  });

  it("should use default steps=64 when not specified", () => {
    const points = flatten("M0,0 C10,20 30,20 40,0");
    // Default: 1 + 64 = 65
    expect(points).toHaveLength(65);
  });

  it("should produce more accurate curves with more steps", () => {
    // For a semicircle arc, more steps should give points closer to the ideal circle
    const coarse = flatten("M0,0 A10,10 0 0,1 20,0", 4);
    const fine = flatten("M0,0 A10,10 0 0,1 20,0", 256);

    // Measure max deviation from ideal circle (center at 10, 0, radius 10)
    // Actually the center of the semicircle depends on sweep direction
    // Instead, check that finer sampling has a smoother distribution
    // by verifying adjacent point distances are more uniform
    function maxGap(pts: [number, number][]): number {
      let maxD = 0;
      for (let i = 1; i < pts.length; i++) {
        maxD = Math.max(maxD, dist(pts[i], pts[i - 1]));
      }
      return maxD;
    }

    expect(maxGap(fine)).toBeLessThan(maxGap(coarse));
  });
});

// ---------------------------------------------------------------------------
// Duplicate point suppression
// ---------------------------------------------------------------------------
describe("flattenSubpath – duplicate point suppression", () => {
  it("should not produce consecutive duplicate points", () => {
    // A curve that starts and ends at the same point as a subsequent L
    const points = flatten("M0,0 L10,0 L10,0 L10,0 L20,0");
    // The three consecutive L10,0 should be de-duped to one
    expect(points).toHaveLength(3); // (0,0), (10,0), (20,0)
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe("flattenSubpath – edge cases", () => {
  it("should return an empty array for no commands", () => {
    const points = flattenSubpath([]);
    expect(points).toHaveLength(0);
  });

  it("should handle a path that is just M and Z", () => {
    const points = flatten("M5,5 Z");
    expect(points).toHaveLength(1);
    expect(points[0]).toEqual([5, 5]);
  });

  it("should handle very small coordinates", () => {
    const points = flatten("M0.001,0.002 L0.003,0.004");
    expect(points).toHaveLength(2);
    expect(points[0][0]).toBeCloseTo(0.001);
    expect(points[0][1]).toBeCloseTo(0.002);
    expect(points[1][0]).toBeCloseTo(0.003);
    expect(points[1][1]).toBeCloseTo(0.004);
  });

  it("should handle very large coordinates", () => {
    const points = flatten("M1000000,2000000 L3000000,4000000");
    expect(points).toHaveLength(2);
    expect(points[0]).toEqual([1000000, 2000000]);
    expect(points[1]).toEqual([3000000, 4000000]);
  });

  it("should handle a zero-area path (line back and forth)", () => {
    const points = flatten("M0,0 L10,0 L0,0");
    // (0,0), (10,0), (0,0) — last is not a consecutive duplicate of (10,0)
    // pushPoint only de-dups consecutive exact matches, so we get 3 points
    expect(points).toHaveLength(3);
  });

  it("should handle arc commands with large radii gracefully", () => {
    // Use a large radius relative to endpoint distance
    const points = flatten("M0,0 A100,100 0 0,1 20,0", 32);
    expect(points).toHaveLength(33);
    expect(points[0]).toEqual([0, 0]);
    expect(points[points.length - 1][0]).toBeCloseTo(20);
  });
});
