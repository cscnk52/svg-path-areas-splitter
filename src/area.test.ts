import { describe, it, expect } from "vitest";
import { signedArea } from "@/area";

type Point = [number, number];

describe("signedArea", () => {
  describe("basic shapes", () => {
    it("should return positive area for CCW square", () => {
      const points: Point[] = [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ];

      expect(signedArea(points)).eq(100);
    });

    it("should return negative area for CW square", () => {
      const points: Point[] = [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
      ];

      expect(signedArea(points)).toBeLessThan(0);
    });

    it("should compute correct absolute area for a 10x10 square", () => {
      const points: Point[] = [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ];

      expect(Math.abs(signedArea(points))).toBe(100);
    });
  });

  describe("reversed order", () => {
    it("should flip sign when reversed", () => {
      const points: Point[] = [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ];

      const reversed = [...points].reverse();

      expect(Math.sign(signedArea(points))).not.toBe(Math.sign(signedArea(reversed)));
    });
  });

  describe("translation invariance", () => {
    it("should not change area when translated", () => {
      const points: Point[] = [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ];

      const moved = points.map(([x, y]) => [x + 100, y + 50] as Point);

      expect(signedArea(points)).toBe(signedArea(moved));
    });
  });

  describe("scale invariance", () => {
    it("should scale area by the product of scale factors", () => {
      const points: Point[] = [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ];

      const sx = 2;
      const sy = 3;
      const scaled = points.map(([x, y]) => [x * sx, y * sy] as Point);

      expect(signedArea(scaled)).toBe(signedArea(points) * sx * sy);
    });
  });

  describe("edge cases", () => {
    it("should throw for less than 3 points", () => {
      expect(() =>
        signedArea([
          [0, 0],
          [1, 1],
        ]),
      ).toThrow("At least 3 points required");
    });

    it("should return 0 for collinear points", () => {
      const points: Point[] = [
        [0, 0],
        [1, 1],
        [2, 2],
      ];

      expect(signedArea(points)).toBe(0);
    });
  });
});
