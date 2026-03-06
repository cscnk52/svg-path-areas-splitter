import { describe, it, expect } from "vitest";
import { SVGPathData } from "svg-pathdata";
import { SplitPath } from "../src/index";

/**
 * Helper: count total M commands across all result path strings.
 */
function countMoveCommands(results: string[]): number {
  return results.reduce((count, pathD) => {
    const parsed = new SVGPathData(pathD);
    return count + parsed.commands.filter((c) => c.type === SVGPathData.MOVE_TO).length;
  }, 0);
}

/**
 * Helper: assert every result string is parseable by SVGPathData.
 */
function assertAllParseable(results: string[]) {
  for (const pathD of results) {
    expect(() => new SVGPathData(pathD)).not.toThrow();
  }
}

// ===========================================================================
// Single subpath
// ===========================================================================
describe("SplitPath – single subpath", () => {
  it("should return the original path unchanged when there is only one subpath", () => {
    const d = "M0,0 L100,0 L100,100 L0,100 Z";
    const result = SplitPath(d);
    expect(result).toHaveLength(1);
  });

  it("should handle a single triangle", () => {
    const d = "M50,0 L100,100 L0,100 Z";
    const result = SplitPath(d);
    expect(result).toHaveLength(1);
  });

  it("should handle a single circle-like path (4 cubic arcs)", () => {
    const d = [
      "M50,0",
      "C77.6,0 100,22.4 100,50",
      "C100,77.6 77.6,100 50,100",
      "C22.4,100 0,77.6 0,50",
      "C0,22.4 22.4,0 50,0",
      "Z",
    ].join(" ");
    const result = SplitPath(d);
    expect(result).toHaveLength(1);
  });

  it("should handle a single path with arc commands", () => {
    const d = "M0,0 A50,50 0 1,1 100,0 A50,50 0 1,1 0,0 Z";
    const result = SplitPath(d);
    expect(result).toHaveLength(1);
  });

  it("should handle a complex single subpath with many line segments", () => {
    // Star polygon — single subpath, no splitting needed
    const d =
      "M12,0 L15.09,8.26 L24,9.27 L17.18,14.97 L18.18,24 L12,19.77 L5.82,24 L6.82,14.97 L0,9.27 L8.91,8.26 Z";
    const result = SplitPath(d);
    expect(result).toHaveLength(1);
  });
});

// ===========================================================================
// Non-overlapping subpaths
// ===========================================================================
describe("SplitPath – non-overlapping subpaths", () => {
  it("should split two separate rectangles into two regions", () => {
    const d = "M0,0 L50,0 L50,50 L0,50 Z M200,200 L250,200 L250,250 L200,250 Z";
    const result = SplitPath(d);
    expect(result).toHaveLength(2);
    assertAllParseable(result);
  });

  it("should split three separate shapes into three regions", () => {
    const d = [
      "M0,0 L10,0 L10,10 L0,10 Z",
      "M100,0 L110,0 L110,10 L100,10 Z",
      "M200,0 L210,0 L210,10 L200,10 Z",
    ].join(" ");
    const result = SplitPath(d);
    expect(result).toHaveLength(3);
  });

  it("should split five separate tiny squares", () => {
    const rects: string[] = [];
    for (let i = 0; i < 5; i++) {
      const x = i * 100;
      rects.push(`M${x},0 L${x + 10},0 L${x + 10},10 L${x},10 Z`);
    }
    const result = SplitPath(rects.join(" "));
    expect(result).toHaveLength(5);
    assertAllParseable(result);
  });

  it("should split ten separate shapes", () => {
    const shapes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const x = i * 50;
      const y = i * 50;
      shapes.push(`M${x},${y} L${x + 20},${y} L${x + 20},${y + 20} L${x},${y + 20} Z`);
    }
    const result = SplitPath(shapes.join(" "));
    expect(result).toHaveLength(10);
  });

  it("should handle separate shapes of very different sizes", () => {
    // Tiny 1x1 square far from a huge 1000x1000 square
    const tiny = "M5000,5000 L5001,5000 L5001,5001 L5000,5001 Z";
    const huge = "M0,0 L1000,0 L1000,1000 L0,1000 Z";
    const result = SplitPath(`${tiny} ${huge}`);
    expect(result).toHaveLength(2);
  });

  it("should handle shapes that share a bounding box edge but don't overlap", () => {
    // Two triangles sharing a bounding box extent but no geometric overlap
    const left = "M0,0 L10,5 L0,10 Z";
    const right = "M20,0 L30,5 L20,10 Z";
    const result = SplitPath(`${left} ${right}`);
    expect(result).toHaveLength(2);
  });

  it("should handle adjacent rectangles sharing an edge (no containment)", () => {
    const a = "M0,0 L10,0 L10,10 L0,10 Z";
    const b = "M10,0 L20,0 L20,10 L10,10 Z";
    const result = SplitPath(`${a} ${b}`);
    expect(result).toHaveLength(2);
  });
});

// ===========================================================================
// Nonzero fill-rule (default)
// ===========================================================================
describe("SplitPath – nonzero fill-rule (default)", () => {
  it("should group a CCW rectangle with a CW hole as one region", () => {
    const outer = "M0,0 L100,0 L100,100 L0,100 Z"; // CCW
    const inner = "M25,25 L25,75 L75,75 L75,25 Z"; // CW
    const d = `${outer} ${inner}`;

    const result = SplitPath(d, { fillRule: "nonzero" });
    expect(result).toHaveLength(1);
    expect(countMoveCommands(result)).toBe(2);
  });

  it("should keep same-direction nested shapes grouped under nonzero", () => {
    const outer = "M0,0 L200,0 L200,200 L0,200 Z"; // CCW
    const inner = "M50,50 L150,50 L150,150 L50,150 Z"; // CCW
    const d = `${outer} ${inner}`;

    const result = SplitPath(d, { fillRule: "nonzero" });
    expect(result).toHaveLength(1);
  });

  it("should handle outer CW + inner CCW as one region under nonzero", () => {
    const outer = "M0,0 L0,100 L100,100 L100,0 Z"; // CW
    const inner = "M25,25 L75,25 L75,75 L25,75 Z"; // CCW
    const d = `${outer} ${inner}`;

    const result = SplitPath(d, { fillRule: "nonzero" });
    expect(result).toHaveLength(1);
  });

  it("should handle two separate shapes each with their own CW hole", () => {
    const outerA = "M0,0 L100,0 L100,100 L0,100 Z";
    const holeA = "M20,20 L20,80 L80,80 L80,20 Z";
    const outerB = "M200,0 L300,0 L300,100 L200,100 Z";
    const holeB = "M220,20 L220,80 L280,80 L280,20 Z";

    const d = `${outerA} ${holeA} ${outerB} ${holeB}`;
    const result = SplitPath(d, { fillRule: "nonzero" });
    expect(result).toHaveLength(2);
    expect(countMoveCommands(result)).toBe(4);
  });

  it("should handle interleaved subpath ordering (outer1, outer2, hole1, hole2)", () => {
    // Subpaths are NOT in neat outer-then-hole order
    const outerA = "M0,0 L100,0 L100,100 L0,100 Z";
    const outerB = "M200,0 L300,0 L300,100 L200,100 Z";
    const holeA = "M20,20 L20,80 L80,80 L80,20 Z"; // CW hole inside A
    const holeB = "M220,20 L220,80 L280,80 L280,20 Z"; // CW hole inside B

    // Interleave: outerA, outerB, holeA, holeB
    const d = `${outerA} ${outerB} ${holeA} ${holeB}`;
    const result = SplitPath(d, { fillRule: "nonzero" });
    expect(result).toHaveLength(2);
    expect(countMoveCommands(result)).toBe(4);
  });

  it("should handle reversed interleaved ordering (hole1, hole2, outer1, outer2)", () => {
    // The containment tree is built by sorting subpaths by absolute area
    // descending, so the outers (larger) are processed before the holes
    // (smaller) regardless of their order in the path string.
    // The holes (CW) are correctly detected as children of the outers (CCW).
    const outerA = "M0,0 L100,0 L100,100 L0,100 Z";
    const outerB = "M200,0 L300,0 L300,100 L200,100 Z";
    const holeA = "M20,20 L20,80 L80,80 L80,20 Z";
    const holeB = "M220,20 L220,80 L280,80 L280,20 Z";

    // Reversed: holes first, then outers — should still produce 2 regions
    const d = `${holeA} ${holeB} ${outerA} ${outerB}`;
    const result = SplitPath(d, { fillRule: "nonzero" });
    expect(result).toHaveLength(2);
    expect(countMoveCommands(result)).toBe(4);
  });

  it("should handle a single shape with multiple CW holes", () => {
    const outer = "M0,0 L200,0 L200,200 L0,200 Z"; // CCW
    const hole1 = "M10,10 L10,90 L90,90 L90,10 Z"; // CW
    const hole2 = "M110,10 L110,90 L190,90 L190,10 Z"; // CW
    const hole3 = "M10,110 L10,190 L90,190 L90,110 Z"; // CW

    const d = `${outer} ${hole1} ${hole2} ${hole3}`;
    const result = SplitPath(d, { fillRule: "nonzero" });
    expect(result).toHaveLength(1);
    expect(countMoveCommands(result)).toBe(4);
  });
});

// ===========================================================================
// Evenodd fill-rule
// ===========================================================================
describe("SplitPath – evenodd fill-rule", () => {
  it("should group a rectangle with an inner rect as one region (hole) under evenodd", () => {
    const outer = "M0,0 L100,0 L100,100 L0,100 Z";
    const inner = "M25,25 L75,25 L75,75 L25,75 Z";
    const d = `${outer} ${inner}`;

    const result = SplitPath(d, { fillRule: "evenodd" });
    expect(result).toHaveLength(1);
    expect(countMoveCommands(result)).toBe(2);
  });

  it("should treat a doubly-nested shape as a separate region under evenodd", () => {
    const outer = "M0,0 L200,0 L200,200 L0,200 Z";
    const middle = "M30,30 L170,30 L170,170 L30,170 Z";
    const inner = "M60,60 L140,60 L140,140 L60,140 Z";
    const d = `${outer} ${middle} ${inner}`;

    const result = SplitPath(d, { fillRule: "evenodd" });
    expect(result).toHaveLength(2);
  });

  it("should handle 3-level nesting under evenodd: outer + hole + island + hole-in-island", () => {
    const level0 = "M0,0 L300,0 L300,300 L0,300 Z"; // depth 0 → filled
    const level1 = "M20,20 L280,20 L280,280 L20,280 Z"; // depth 1 → hole
    const level2 = "M50,50 L250,50 L250,250 L50,250 Z"; // depth 2 → filled (new region)
    const level3 = "M80,80 L220,80 L220,220 L80,220 Z"; // depth 3 → hole

    const d = `${level0} ${level1} ${level2} ${level3}`;
    const result = SplitPath(d, { fillRule: "evenodd" });
    // region 1: level0 + level1 (filled + hole)
    // region 2: level2 + level3 (filled + hole)
    expect(result).toHaveLength(2);
    expect(countMoveCommands(result)).toBe(4);
    assertAllParseable(result);
  });

  it("should handle 4-level nesting under evenodd", () => {
    const level0 = "M0,0 L400,0 L400,400 L0,400 Z"; // depth 0 → filled
    const level1 = "M20,20 L380,20 L380,380 L20,380 Z"; // depth 1 → hole
    const level2 = "M50,50 L350,50 L350,350 L50,350 Z"; // depth 2 → filled
    const level3 = "M80,80 L320,80 L320,320 L80,320 Z"; // depth 3 → hole
    const level4 = "M110,110 L290,110 L290,290 L110,290 Z"; // depth 4 → filled

    const d = `${level0} ${level1} ${level2} ${level3} ${level4}`;
    const result = SplitPath(d, { fillRule: "evenodd" });
    // region 1: level0 + level1
    // region 2: level2 + level3
    // region 3: level4
    expect(result).toHaveLength(3);
    expect(countMoveCommands(result)).toBe(5);
  });

  it("should handle 5-level nesting under evenodd", () => {
    // 6 concentric rectangles → 3 regions under evenodd
    const levels: string[] = [];
    for (let i = 0; i < 6; i++) {
      const margin = i * 30;
      levels.push(
        `M${margin},${margin} L${500 - margin},${margin} L${500 - margin},${500 - margin} L${margin},${500 - margin} Z`,
      );
    }
    const d = levels.join(" ");
    const result = SplitPath(d, { fillRule: "evenodd" });
    // Pairs: (0+1), (2+3), (4+5) → 3 regions
    expect(result).toHaveLength(3);
    expect(countMoveCommands(result)).toBe(6);
  });

  it("should handle evenodd with same-direction nesting (direction doesn't matter)", () => {
    // Under evenodd, winding direction is irrelevant — only crossing count matters
    const outer = "M0,0 L100,0 L100,100 L0,100 Z"; // CCW
    const inner = "M20,20 L80,20 L80,80 L20,80 Z"; // also CCW
    const d = `${outer} ${inner}`;

    const result = SplitPath(d, { fillRule: "evenodd" });
    // Still forms outer + hole
    expect(result).toHaveLength(1);
  });

  it("should handle two separate shapes under evenodd", () => {
    const a = "M0,0 L50,0 L50,50 L0,50 Z";
    const b = "M200,200 L250,200 L250,250 L200,250 Z";
    const result = SplitPath(`${a} ${b}`, { fillRule: "evenodd" });
    expect(result).toHaveLength(2);
  });

  it("should handle two separate shapes each with a hole under evenodd", () => {
    const outerA = "M0,0 L100,0 L100,100 L0,100 Z";
    const holeA = "M20,20 L80,20 L80,80 L20,80 Z";
    const outerB = "M200,0 L300,0 L300,100 L200,100 Z";
    const holeB = "M220,20 L280,20 L280,80 L220,80 Z";

    const d = `${outerA} ${holeA} ${outerB} ${holeB}`;
    const result = SplitPath(d, { fillRule: "evenodd" });
    expect(result).toHaveLength(2);
    expect(countMoveCommands(result)).toBe(4);
  });
});

// ===========================================================================
// Nonzero vs Evenodd comparison
// ===========================================================================
describe("SplitPath – nonzero vs evenodd comparison", () => {
  it("should produce same result for non-overlapping shapes regardless of fill-rule", () => {
    const d =
      "M0,0 L10,0 L10,10 L0,10 Z M100,0 L110,0 L110,10 L100,10 Z M200,0 L210,0 L210,10 L200,10 Z";
    const nz = SplitPath(d, { fillRule: "nonzero" });
    const eo = SplitPath(d, { fillRule: "evenodd" });
    expect(nz).toHaveLength(eo.length);
    expect(nz).toHaveLength(3);
  });

  it("should produce same result for outer+opposite-hole under both rules", () => {
    const outer = "M0,0 L100,0 L100,100 L0,100 Z"; // CCW
    const hole = "M20,20 L20,80 L80,80 L80,20 Z"; // CW
    const d = `${outer} ${hole}`;
    const nz = SplitPath(d, { fillRule: "nonzero" });
    const eo = SplitPath(d, { fillRule: "evenodd" });
    expect(nz).toHaveLength(1);
    expect(eo).toHaveLength(1);
  });
});

// ===========================================================================
// Complex nesting scenarios
// ===========================================================================
describe("SplitPath – complex nesting", () => {
  it("should handle sibling shapes inside a parent (two separate holes in one outer)", () => {
    const outer = "M0,0 L200,0 L200,100 L0,100 Z"; // CCW big rect
    // Two small CW holes side by side, both inside the outer
    const holeLeft = "M10,10 L10,90 L90,90 L90,10 Z"; // CW
    const holeRight = "M110,10 L110,90 L190,90 L190,10 Z"; // CW

    const d = `${outer} ${holeLeft} ${holeRight}`;
    const result = SplitPath(d, { fillRule: "nonzero" });
    // All three form one region: outer with two holes
    expect(result).toHaveLength(1);
    expect(countMoveCommands(result)).toBe(3);
  });

  it("should handle a bullseye pattern (4 concentric rings, alternating direction)", () => {
    // Under nonzero: alternating CW/CCW creates concentric rings
    const ring1 = "M0,0 L200,0 L200,200 L0,200 Z"; // CCW, outermost
    const ring2 = "M20,20 L20,180 L180,180 L180,20 Z"; // CW, hole
    const ring3 = "M50,50 L150,50 L150,150 L50,150 Z"; // CCW, filled island
    const ring4 = "M70,70 L70,130 L130,130 L130,70 Z"; // CW, hole in island

    const d = `${ring1} ${ring2} ${ring3} ${ring4}`;
    const resultNZ = SplitPath(d, { fillRule: "nonzero" });
    // Under nonzero:
    // ring1 (winding=1, parent_winding=0 → root)
    // ring2 (winding=-1, parent_winding=1 → grouped with ring1)
    // ring3 (winding=1, parent_winding=0 → new root)
    // ring4 (winding=-1, parent_winding=1 → grouped with ring3)
    expect(resultNZ).toHaveLength(2);
    expect(countMoveCommands(resultNZ)).toBe(4);
  });

  it("should handle two separate bullseye patterns", () => {
    // Pattern A (left)
    const a1 = "M0,0 L100,0 L100,100 L0,100 Z";
    const a2 = "M10,10 L10,90 L90,90 L90,10 Z";
    const a3 = "M30,30 L70,30 L70,70 L30,70 Z";
    const a4 = "M40,40 L40,60 L60,60 L60,40 Z";

    // Pattern B (right)
    const b1 = "M200,0 L300,0 L300,100 L200,100 Z";
    const b2 = "M210,10 L210,90 L290,90 L290,10 Z";
    const b3 = "M230,30 L270,30 L270,70 L230,70 Z";
    const b4 = "M240,40 L240,60 L260,60 L260,40 Z";

    const d = `${a1} ${a2} ${a3} ${a4} ${b1} ${b2} ${b3} ${b4}`;
    const resultNZ = SplitPath(d, { fillRule: "nonzero" });
    // Each bullseye: 2 regions (outer+hole, island+hole)
    // Total: 4 regions
    expect(resultNZ).toHaveLength(4);
    expect(countMoveCommands(resultNZ)).toBe(8);
  });

  it("should handle a shape with a hole that contains another independent shape", () => {
    // Under evenodd:
    const outer = "M0,0 L200,0 L200,200 L0,200 Z"; // depth 0 → filled
    const hole = "M20,20 L180,20 L180,180 L20,180 Z"; // depth 1 → hole
    const island = "M50,50 L150,50 L150,150 L50,150 Z"; // depth 2 → filled again

    const d = `${outer} ${hole} ${island}`;
    const resultEO = SplitPath(d, { fillRule: "evenodd" });
    // region 1: outer + hole
    // region 2: island
    expect(resultEO).toHaveLength(2);
  });

  it("should handle sibling islands inside a hole", () => {
    // Under evenodd:
    const outer = "M0,0 L300,0 L300,300 L0,300 Z"; // depth 0 → filled
    const hole = "M20,20 L280,20 L280,280 L20,280 Z"; // depth 1 → hole
    const islandA = "M40,40 L130,40 L130,130 L40,130 Z"; // depth 2 → filled
    const islandB = "M170,170 L260,170 L260,260 L170,260 Z"; // depth 2 → filled

    const d = `${outer} ${hole} ${islandA} ${islandB}`;
    const resultEO = SplitPath(d, { fillRule: "evenodd" });
    // region 1: outer + hole
    // region 2: islandA
    // region 3: islandB
    expect(resultEO).toHaveLength(3);
    expect(countMoveCommands(resultEO)).toBe(4);
  });
});

// ===========================================================================
// Curved paths
// ===========================================================================
describe("SplitPath – curved paths", () => {
  it("should handle a circle-like path (cubic beziers) with an inner CW hole", () => {
    const outerCircle = [
      "M50,0",
      "C77.6,0 100,22.4 100,50",
      "C100,77.6 77.6,100 50,100",
      "C22.4,100 0,77.6 0,50",
      "C0,22.4 22.4,0 50,0",
      "Z",
    ].join(" ");
    const innerHole = "M30,30 L30,70 L70,70 L70,30 Z"; // CW

    const d = `${outerCircle} ${innerHole}`;
    const result = SplitPath(d, { fillRule: "nonzero" });
    expect(result).toHaveLength(1);
    expect(countMoveCommands(result)).toBe(2);
  });

  it("should handle two separate circle-like shapes", () => {
    const circle1 = [
      "M50,0",
      "C77.6,0 100,22.4 100,50",
      "C100,77.6 77.6,100 50,100",
      "C22.4,100 0,77.6 0,50",
      "C0,22.4 22.4,0 50,0",
      "Z",
    ].join(" ");
    const circle2 = [
      "M250,0",
      "C277.6,0 300,22.4 300,50",
      "C300,77.6 277.6,100 250,100",
      "C222.4,100 200,77.6 200,50",
      "C200,22.4 222.4,0 250,0",
      "Z",
    ].join(" ");

    const d = `${circle1} ${circle2}`;
    const result = SplitPath(d);
    expect(result).toHaveLength(2);
  });

  it("should handle a path with quadratic beziers", () => {
    const outer = "M0,0 Q50,100 100,0 L100,100 L0,100 Z"; // CCW-ish shape
    const d = outer;
    const result = SplitPath(d);
    expect(result).toHaveLength(1);
  });

  it("should handle a circle made of arc commands with a square hole", () => {
    const circle = "M50,0 A50,50 0 0,1 50,100 A50,50 0 0,1 50,0 Z";
    const hole = "M35,35 L35,65 L65,65 L65,35 Z"; // CW
    const d = `${circle} ${hole}`;
    const result = SplitPath(d, { fillRule: "nonzero" });
    expect(result).toHaveLength(1);
  });

  it("should handle smooth cubic (S) commands", () => {
    const d = "M0,50 C0,22 22,0 50,0 S100,22 100,50 S78,100 50,100 S0,78 0,50 Z";
    const result = SplitPath(d);
    expect(result).toHaveLength(1);
  });
});

// ===========================================================================
// Edge cases
// ===========================================================================
describe("SplitPath – edge cases", () => {
  it("should return the original for an empty-ish path", () => {
    const d = "M0,0";
    const result = SplitPath(d);
    expect(result).toHaveLength(1);
  });

  it("should handle a path with only moveTo commands", () => {
    const d = "M0,0 M10,10 M20,20";
    const result = SplitPath(d);
    expect(result).toHaveLength(3);
  });

  it("should handle many degenerate (zero-area) subpaths", () => {
    const moves = Array.from({ length: 10 }, (_, i) => `M${i * 10},0`);
    const result = SplitPath(moves.join(" "));
    expect(result).toHaveLength(10);
  });

  it("should handle a mix of degenerate and real subpaths", () => {
    const real = "M0,0 L100,0 L100,100 L0,100 Z";
    const degenerate1 = "M500,500";
    const degenerate2 = "M600,600";
    const d = `${real} ${degenerate1} ${degenerate2}`;
    const result = SplitPath(d);
    // 1 real region + 2 degenerate regions
    expect(result).toHaveLength(3);
  });

  it("should handle subpaths with only two points (line segment, zero area)", () => {
    const line1 = "M0,0 L10,0";
    const line2 = "M100,100 L110,100";
    const result = SplitPath(`${line1} ${line2}`);
    expect(result).toHaveLength(2);
  });

  it("should handle a path with a single very thin sliver", () => {
    // Nearly degenerate rectangle (very thin)
    const d = "M0,0 L1000,0 L1000,0.001 L0,0.001 Z M2000,0 L3000,0 L3000,0.001 L2000,0.001 Z";
    const result = SplitPath(d);
    expect(result).toHaveLength(2);
  });

  it("should handle negative coordinates", () => {
    const a = "M-100,-100 L-50,-100 L-50,-50 L-100,-50 Z";
    const b = "M50,50 L100,50 L100,100 L50,100 Z";
    const result = SplitPath(`${a} ${b}`);
    expect(result).toHaveLength(2);
  });

  it("should handle a path with all four quadrants", () => {
    const q1 = "M10,10 L50,10 L50,50 L10,50 Z";
    const q2 = "M-50,10 L-10,10 L-10,50 L-50,50 Z";
    const q3 = "M-50,-50 L-10,-50 L-10,-10 L-50,-10 Z";
    const q4 = "M10,-50 L50,-50 L50,-10 L10,-10 Z";
    const result = SplitPath(`${q1} ${q2} ${q3} ${q4}`);
    expect(result).toHaveLength(4);
  });
});

// ===========================================================================
// Output validity
// ===========================================================================
describe("SplitPath – output validity", () => {
  it("should produce valid SVG path d strings that can be re-parsed", () => {
    const outer = "M0,0 L100,0 L100,100 L0,100 Z";
    const inner = "M25,25 L25,75 L75,75 L75,25 Z";
    const separate = "M200,200 L300,200 L300,300 L200,300 Z";
    const d = `${outer} ${inner} ${separate}`;

    const result = SplitPath(d, { fillRule: "nonzero" });
    assertAllParseable(result);
  });

  it("should preserve all drawing data (no subpaths lost)", () => {
    const outer = "M0,0 L100,0 L100,100 L0,100 Z";
    const hole = "M20,20 L20,80 L80,80 L80,20 Z";
    const separate = "M300,300 L400,300 L400,400 L300,400 Z";
    const d = `${outer} ${hole} ${separate}`;

    const result = SplitPath(d, { fillRule: "nonzero" });
    expect(countMoveCommands(result)).toBe(3);
  });

  it("should preserve all subpaths in a complex scenario", () => {
    const shapes: string[] = [];
    for (let i = 0; i < 6; i++) {
      const x = i * 50;
      shapes.push(`M${x},0 L${x + 20},0 L${x + 20},20 L${x},20 Z`);
    }
    const d = shapes.join(" ");
    const result = SplitPath(d);
    expect(countMoveCommands(result)).toBe(6);
    assertAllParseable(result);
  });

  it("should produce parseable output for curved paths", () => {
    const circle = [
      "M50,0",
      "C77.6,0 100,22.4 100,50",
      "C100,77.6 77.6,100 50,100",
      "C22.4,100 0,77.6 0,50",
      "C0,22.4 22.4,0 50,0",
      "Z",
    ].join(" ");
    const hole = "M30,30 L30,70 L70,70 L70,30 Z";
    const separate = "M200,0 L250,0 L250,50 L200,50 Z";

    const result = SplitPath(`${circle} ${hole} ${separate}`);
    assertAllParseable(result);
    expect(countMoveCommands(result)).toBe(3);
  });

  it("should produce parseable output for arc paths", () => {
    const d = "M0,0 A50,50 0 1,1 100,0 Z M200,0 A50,50 0 1,1 300,0 Z";
    const result = SplitPath(d);
    assertAllParseable(result);
  });
});

// ===========================================================================
// Default config
// ===========================================================================
describe("SplitPath – default config", () => {
  it("should default to nonzero fill-rule when no config is provided", () => {
    const outer = "M0,0 L100,0 L100,100 L0,100 Z"; // CCW
    const inner = "M25,25 L25,75 L75,75 L75,25 Z"; // CW
    const d = `${outer} ${inner}`;

    const withDefault = SplitPath(d);
    const withExplicit = SplitPath(d, { fillRule: "nonzero" });
    expect(withDefault).toHaveLength(withExplicit.length);
  });

  it("should default to nonzero when config is empty object", () => {
    const d = "M0,0 L100,0 L100,100 L0,100 Z M25,25 L25,75 L75,75 L75,25 Z";
    const withEmpty = SplitPath(d, {});
    const withExplicit = SplitPath(d, { fillRule: "nonzero" });
    expect(withEmpty).toHaveLength(withExplicit.length);
  });
});

// ===========================================================================
// Stress / larger scenarios
// ===========================================================================
describe("SplitPath – larger scenarios", () => {
  it("should handle 20 separate rectangles", () => {
    const rects: string[] = [];
    for (let i = 0; i < 20; i++) {
      const x = (i % 5) * 100;
      const y = Math.floor(i / 5) * 100;
      rects.push(`M${x},${y} L${x + 40},${y} L${x + 40},${y + 40} L${x},${y + 40} Z`);
    }
    const d = rects.join(" ");
    const result = SplitPath(d);
    expect(result).toHaveLength(20);
    assertAllParseable(result);
  });

  it("should handle a grid of 4x4 separate squares with holes", () => {
    const shapes: string[] = [];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const x = col * 60;
        const y = row * 60;
        // Outer CCW
        shapes.push(`M${x},${y} L${x + 40},${y} L${x + 40},${y + 40} L${x},${y + 40} Z`);
        // Inner CW hole
        shapes.push(
          `M${x + 10},${y + 10} L${x + 10},${y + 30} L${x + 30},${y + 30} L${x + 30},${y + 10} Z`,
        );
      }
    }
    const d = shapes.join(" ");
    const result = SplitPath(d, { fillRule: "nonzero" });
    // 16 separate shapes, each with one hole → 16 regions
    expect(result).toHaveLength(16);
    // 32 total M commands (16 outers + 16 holes)
    expect(countMoveCommands(result)).toBe(32);
  });

  it("should handle deeply nested concentric squares (6 levels) under nonzero", () => {
    const levels: string[] = [];
    for (let i = 0; i < 6; i++) {
      const margin = i * 20;
      if (i % 2 === 0) {
        // CCW
        levels.push(
          `M${margin},${margin} L${300 - margin},${margin} L${300 - margin},${300 - margin} L${margin},${300 - margin} Z`,
        );
      } else {
        // CW
        levels.push(
          `M${margin},${margin} L${margin},${300 - margin} L${300 - margin},${300 - margin} L${300 - margin},${margin} Z`,
        );
      }
    }
    const d = levels.join(" ");
    const result = SplitPath(d, { fillRule: "nonzero" });
    // Under nonzero with alternating CW/CCW:
    // level0 CCW (winding=+1, parent_w=0 → root)
    // level1 CW  (winding=-1, cumulative=0 → grouped with level0)
    // level2 CCW (winding=+1, parent_w=0 → new root)
    // level3 CW  (winding=-1, cumulative=0 → grouped with level2)
    // level4 CCW (winding=+1, parent_w=0 → new root)
    // level5 CW  (winding=-1, cumulative=0 → grouped with level4)
    expect(result).toHaveLength(3);
    expect(countMoveCommands(result)).toBe(6);
  });
});

// ===========================================================================
// Idempotency
// ===========================================================================
describe("SplitPath – idempotency and re-splitting", () => {
  it("should produce the same number of regions when re-splitting each result", () => {
    const outer = "M0,0 L100,0 L100,100 L0,100 Z";
    const hole = "M20,20 L20,80 L80,80 L80,20 Z";
    const separate = "M200,0 L300,0 L300,100 L200,100 Z";
    const d = `${outer} ${hole} ${separate}`;

    const firstSplit = SplitPath(d, { fillRule: "nonzero" });
    expect(firstSplit).toHaveLength(2);

    // Re-splitting each region should return exactly 1 result each
    for (const regionD of firstSplit) {
      const reSplit = SplitPath(regionD, { fillRule: "nonzero" });
      expect(reSplit).toHaveLength(1);
    }
  });

  it("should be idempotent for already-split single shapes", () => {
    const d = "M0,0 L100,0 L100,100 L0,100 Z";
    const result = SplitPath(d);
    expect(result).toHaveLength(1);
    // Re-split the single result
    const reSplit = SplitPath(result[0]);
    expect(reSplit).toHaveLength(1);
  });
});
