import { describe, it, expect } from "vitest";
import { detectDirection } from "./index";

type Point = [number, number];

describe("detectDirection", () => {
  describe("basic shapes", () => {
    it("should detect CCW square", () => {
      const points: Point[] = [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ];

      expect(detectDirection(points)).toBe("ccw");
    });

    it("should detect CW square", () => {
      const points: Point[] = [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
      ];

      expect(detectDirection(points)).toBe("cw");
    });
  });

  describe("reversed order", () => {
    it("should flip direction when reversed", () => {
      const points: Point[] = [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ];

      const reversed = [...points].reverse();

      expect(detectDirection(points)).not.toBe(detectDirection(reversed));
    });
  });

  describe("translation invariance", () => {
    it("should not change direction when translated", () => {
      const points: Point[] = [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ];

      const moved = points.map(([x, y]) => [x + 100, y + 50] as Point);

      expect(detectDirection(points)).toBe(detectDirection(moved));
    });
  });

  describe("scale invariance", () => {
    it("should not change direction when scaled", () => {
      const points: Point[] = [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ];

      const scaled = points.map(([x, y]) => [x * 2, y * 3] as Point);

      expect(detectDirection(points)).toBe(detectDirection(scaled));
    });
  });

  describe("edge cases", () => {
    it("should throw for less than 3 points", () => {
      expect(() =>
        detectDirection([
          [0, 0],
          [1, 1],
        ]),
      ).toThrow();
    });

    it("should handle collinear points", () => {
      const points: Point[] = [
        [0, 0],
        [1, 1],
        [2, 2],
      ];

      expect(() => detectDirection(points)).toThrow();
    });
  });
});
