import { describe, it, expect } from "vitest";
import {
  computeBoundingBox,
  bboxContains,
  pointInPolygon,
  polygonContains,
  type BoundingBox,
} from "@/containment";

type Point = [number, number];

// ---------------------------------------------------------------------------
// computeBoundingBox
// ---------------------------------------------------------------------------
describe("computeBoundingBox", () => {
  it("should compute bbox for a simple square", () => {
    const points: Point[] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    expect(computeBoundingBox(points)).toEqual({
      minX: 0,
      minY: 0,
      maxX: 10,
      maxY: 10,
    });
  });

  it("should compute bbox for a single point", () => {
    const points: Point[] = [[5, 7]];
    expect(computeBoundingBox(points)).toEqual({
      minX: 5,
      minY: 7,
      maxX: 5,
      maxY: 7,
    });
  });

  it("should handle negative coordinates", () => {
    const points: Point[] = [
      [-10, -20],
      [5, 3],
      [-3, 15],
    ];
    expect(computeBoundingBox(points)).toEqual({
      minX: -10,
      minY: -20,
      maxX: 5,
      maxY: 15,
    });
  });

  it("should handle a collinear horizontal line", () => {
    const points: Point[] = [
      [0, 5],
      [10, 5],
      [20, 5],
    ];
    expect(computeBoundingBox(points)).toEqual({
      minX: 0,
      minY: 5,
      maxX: 20,
      maxY: 5,
    });
  });

  it("should handle a collinear vertical line", () => {
    const points: Point[] = [
      [3, 0],
      [3, 10],
      [3, 20],
    ];
    expect(computeBoundingBox(points)).toEqual({
      minX: 3,
      minY: 0,
      maxX: 3,
      maxY: 20,
    });
  });

  it("should handle large coordinate values", () => {
    const points: Point[] = [
      [1e6, -1e6],
      [-1e6, 1e6],
    ];
    expect(computeBoundingBox(points)).toEqual({
      minX: -1e6,
      minY: -1e6,
      maxX: 1e6,
      maxY: 1e6,
    });
  });

  it("should handle fractional coordinates", () => {
    const points: Point[] = [
      [0.1, 0.2],
      [0.9, 0.8],
      [0.5, 0.5],
    ];
    const bbox = computeBoundingBox(points);
    expect(bbox.minX).toBeCloseTo(0.1);
    expect(bbox.minY).toBeCloseTo(0.2);
    expect(bbox.maxX).toBeCloseTo(0.9);
    expect(bbox.maxY).toBeCloseTo(0.8);
  });
});

// ---------------------------------------------------------------------------
// bboxContains
// ---------------------------------------------------------------------------
describe("bboxContains", () => {
  const outer: BoundingBox = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

  it("should return true when inner is strictly inside outer", () => {
    const inner: BoundingBox = { minX: 10, minY: 10, maxX: 90, maxY: 90 };
    expect(bboxContains(outer, inner)).toBe(true);
  });

  it("should return true when inner equals outer (exact overlap)", () => {
    expect(bboxContains(outer, { ...outer })).toBe(true);
  });

  it("should return true when inner touches outer edges", () => {
    const inner: BoundingBox = { minX: 0, minY: 0, maxX: 50, maxY: 50 };
    expect(bboxContains(outer, inner)).toBe(true);
  });

  it("should return false when inner extends past left edge", () => {
    const inner: BoundingBox = { minX: -1, minY: 10, maxX: 50, maxY: 50 };
    expect(bboxContains(outer, inner)).toBe(false);
  });

  it("should return false when inner extends past right edge", () => {
    const inner: BoundingBox = { minX: 10, minY: 10, maxX: 101, maxY: 50 };
    expect(bboxContains(outer, inner)).toBe(false);
  });

  it("should return false when inner extends past top edge", () => {
    const inner: BoundingBox = { minX: 10, minY: -5, maxX: 50, maxY: 50 };
    expect(bboxContains(outer, inner)).toBe(false);
  });

  it("should return false when inner extends past bottom edge", () => {
    const inner: BoundingBox = { minX: 10, minY: 10, maxX: 50, maxY: 200 };
    expect(bboxContains(outer, inner)).toBe(false);
  });

  it("should return false when bboxes are completely disjoint", () => {
    const inner: BoundingBox = {
      minX: 200,
      minY: 200,
      maxX: 300,
      maxY: 300,
    };
    expect(bboxContains(outer, inner)).toBe(false);
  });

  it("should return false when bboxes partially overlap", () => {
    const inner: BoundingBox = { minX: 50, minY: 50, maxX: 150, maxY: 150 };
    expect(bboxContains(outer, inner)).toBe(false);
  });

  it("should handle zero-area bboxes (point)", () => {
    const point: BoundingBox = { minX: 50, minY: 50, maxX: 50, maxY: 50 };
    expect(bboxContains(outer, point)).toBe(true);
  });

  it("should handle zero-area bboxes (line)", () => {
    const line: BoundingBox = { minX: 10, minY: 50, maxX: 90, maxY: 50 };
    expect(bboxContains(outer, line)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// pointInPolygon
// ---------------------------------------------------------------------------
describe("pointInPolygon", () => {
  // CCW unit square
  const square: Point[] = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ];

  describe("basic containment with a square", () => {
    it("should return true for center of square", () => {
      expect(pointInPolygon([5, 5], square)).toBe(true);
    });

    it("should return true for a point near a corner inside", () => {
      expect(pointInPolygon([1, 1], square)).toBe(true);
    });

    it("should return false for a point clearly outside", () => {
      expect(pointInPolygon([20, 20], square)).toBe(false);
    });

    it("should return false for a point to the left", () => {
      expect(pointInPolygon([-5, 5], square)).toBe(false);
    });

    it("should return false for a point above", () => {
      expect(pointInPolygon([5, -5], square)).toBe(false);
    });

    it("should return false for a point below", () => {
      expect(pointInPolygon([5, 15], square)).toBe(false);
    });

    it("should return false for a point to the right", () => {
      expect(pointInPolygon([15, 5], square)).toBe(false);
    });
  });

  describe("triangle", () => {
    // Triangle with vertices at (0,0), (10,0), (5,10)
    const triangle: Point[] = [
      [0, 0],
      [10, 0],
      [5, 10],
    ];

    it("should return true for centroid", () => {
      expect(pointInPolygon([5, 3], triangle)).toBe(true);
    });

    it("should return false for point outside the triangle", () => {
      expect(pointInPolygon([0, 10], triangle)).toBe(false);
    });

    it("should return false for point far outside", () => {
      expect(pointInPolygon([100, 100], triangle)).toBe(false);
    });
  });

  describe("concave polygon (L-shape)", () => {
    // An L-shaped polygon
    const lShape: Point[] = [
      [0, 0],
      [10, 0],
      [10, 5],
      [5, 5],
      [5, 10],
      [0, 10],
    ];

    it("should return true for point in bottom-left part", () => {
      expect(pointInPolygon([2, 7], lShape)).toBe(true);
    });

    it("should return true for point in top-right part", () => {
      expect(pointInPolygon([7, 2], lShape)).toBe(true);
    });

    it("should return false for point in the concave notch", () => {
      expect(pointInPolygon([7, 7], lShape)).toBe(false);
    });
  });

  describe("CW polygon (reversed winding)", () => {
    // CW square — ray-casting doesn't care about winding direction
    const cwSquare: Point[] = [
      [0, 0],
      [0, 10],
      [10, 10],
      [10, 0],
    ];

    it("should still detect containment for CW polygons", () => {
      expect(pointInPolygon([5, 5], cwSquare)).toBe(true);
    });

    it("should still reject points outside CW polygons", () => {
      expect(pointInPolygon([20, 20], cwSquare)).toBe(false);
    });
  });

  describe("diamond / rotated square", () => {
    const diamond: Point[] = [
      [5, 0],
      [10, 5],
      [5, 10],
      [0, 5],
    ];

    it("should return true for center", () => {
      expect(pointInPolygon([5, 5], diamond)).toBe(true);
    });

    it("should return false for corner region outside the diamond", () => {
      // (1, 1) is inside the bounding box but outside the diamond
      expect(pointInPolygon([1, 1], diamond)).toBe(false);
    });

    it("should return false for (9, 9) — outside diamond corner", () => {
      expect(pointInPolygon([9, 9], diamond)).toBe(false);
    });
  });

  describe("complex polygon with many vertices", () => {
    // Star-like polygon
    const star: Point[] = [
      [5, 0],
      [6, 4],
      [10, 4],
      [7, 6.5],
      [8, 10],
      [5, 8],
      [2, 10],
      [3, 6.5],
      [0, 4],
      [4, 4],
    ];

    it("should return true for center of star", () => {
      expect(pointInPolygon([5, 5], star)).toBe(true);
    });

    it("should return false for point outside star", () => {
      expect(pointInPolygon([0, 0], star)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// polygonContains
// ---------------------------------------------------------------------------
describe("polygonContains", () => {
  // Helper to build test data
  function makePolygonData(points: Point[]) {
    return {
      points,
      bbox: computeBoundingBox(points),
    };
  }

  describe("basic containment", () => {
    it("should detect a small square inside a large square", () => {
      const outer = makePolygonData([
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
      ]);
      const inner = makePolygonData([
        [20, 20],
        [80, 20],
        [80, 80],
        [20, 80],
      ]);
      expect(polygonContains(outer.points, outer.bbox, inner.points, inner.bbox)).toBe(true);
    });

    it("should not detect outer as inside inner", () => {
      const outer = makePolygonData([
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
      ]);
      const inner = makePolygonData([
        [20, 20],
        [80, 20],
        [80, 80],
        [20, 80],
      ]);
      expect(polygonContains(inner.points, inner.bbox, outer.points, outer.bbox)).toBe(false);
    });

    it("should return false for completely disjoint polygons", () => {
      const a = makePolygonData([
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ]);
      const b = makePolygonData([
        [50, 50],
        [60, 50],
        [60, 60],
        [50, 60],
      ]);
      expect(polygonContains(a.points, a.bbox, b.points, b.bbox)).toBe(false);
      expect(polygonContains(b.points, b.bbox, a.points, a.bbox)).toBe(false);
    });
  });

  describe("adjacent / touching polygons", () => {
    it("should return false for side-by-side polygons sharing an edge", () => {
      const left = makePolygonData([
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ]);
      const right = makePolygonData([
        [10, 0],
        [20, 0],
        [20, 10],
        [10, 10],
      ]);
      expect(polygonContains(left.points, left.bbox, right.points, right.bbox)).toBe(false);
    });
  });

  describe("partially overlapping polygons", () => {
    it("should return false when polygons partially overlap", () => {
      const a = makePolygonData([
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ]);
      const b = makePolygonData([
        [5, 5],
        [15, 5],
        [15, 15],
        [5, 15],
      ]);
      expect(polygonContains(a.points, a.bbox, b.points, b.bbox)).toBe(false);
      expect(polygonContains(b.points, b.bbox, a.points, a.bbox)).toBe(false);
    });
  });

  describe("nested containment (3 levels)", () => {
    it("should detect containment at each level", () => {
      const large = makePolygonData([
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
      ]);
      const medium = makePolygonData([
        [20, 20],
        [80, 20],
        [80, 80],
        [20, 80],
      ]);
      const small = makePolygonData([
        [40, 40],
        [60, 40],
        [60, 60],
        [40, 60],
      ]);

      // large contains medium
      expect(polygonContains(large.points, large.bbox, medium.points, medium.bbox)).toBe(true);
      // large contains small
      expect(polygonContains(large.points, large.bbox, small.points, small.bbox)).toBe(true);
      // medium contains small
      expect(polygonContains(medium.points, medium.bbox, small.points, small.bbox)).toBe(true);
      // small does NOT contain medium or large
      expect(polygonContains(small.points, small.bbox, medium.points, medium.bbox)).toBe(false);
      expect(polygonContains(small.points, small.bbox, large.points, large.bbox)).toBe(false);
    });
  });

  describe("different winding directions", () => {
    it("should detect containment regardless of winding direction", () => {
      // CW outer
      const outer = makePolygonData([
        [0, 0],
        [0, 100],
        [100, 100],
        [100, 0],
      ]);
      // CCW inner
      const inner = makePolygonData([
        [20, 20],
        [80, 20],
        [80, 80],
        [20, 80],
      ]);
      expect(polygonContains(outer.points, outer.bbox, inner.points, inner.bbox)).toBe(true);
    });
  });

  describe("triangle containment", () => {
    it("should detect a small triangle inside a large triangle", () => {
      const outer = makePolygonData([
        [0, 0],
        [100, 0],
        [50, 100],
      ]);
      const inner = makePolygonData([
        [40, 20],
        [60, 20],
        [50, 40],
      ]);
      expect(polygonContains(outer.points, outer.bbox, inner.points, inner.bbox)).toBe(true);
    });

    it("should reject a triangle outside another triangle but inside its bbox", () => {
      const outer = makePolygonData([
        [0, 0],
        [100, 0],
        [50, 100],
      ]);
      // This triangle is in the top-right corner — inside bbox but outside the triangle
      const corner = makePolygonData([
        [80, 60],
        [95, 60],
        [87, 75],
      ]);
      expect(polygonContains(outer.points, outer.bbox, corner.points, corner.bbox)).toBe(false);
    });
  });

  describe("polygon with many points (simulated curve)", () => {
    it("should detect containment for circle-like polygons", () => {
      // Approximate circle r=50 centered at (50,50) — 32 points
      const outerCircle: Point[] = [];
      for (let i = 0; i < 32; i++) {
        const angle = (2 * Math.PI * i) / 32;
        outerCircle.push([50 + 50 * Math.cos(angle), 50 + 50 * Math.sin(angle)]);
      }
      const outer = makePolygonData(outerCircle);

      // Small square at center
      const inner = makePolygonData([
        [40, 40],
        [60, 40],
        [60, 60],
        [40, 60],
      ]);
      expect(polygonContains(outer.points, outer.bbox, inner.points, inner.bbox)).toBe(true);
    });

    it("should reject a polygon outside a circle-like polygon", () => {
      const outerCircle: Point[] = [];
      for (let i = 0; i < 32; i++) {
        const angle = (2 * Math.PI * i) / 32;
        outerCircle.push([50 + 50 * Math.cos(angle), 50 + 50 * Math.sin(angle)]);
      }
      const outer = makePolygonData(outerCircle);

      // Square far away
      const far = makePolygonData([
        [200, 200],
        [210, 200],
        [210, 210],
        [200, 210],
      ]);
      expect(polygonContains(outer.points, outer.bbox, far.points, far.bbox)).toBe(false);
    });
  });
});
