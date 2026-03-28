import { SVGPathData } from "svg-pathdata";
import { describe, it, expect } from "vitest";

import { normalize } from "@/normalize";

function parse(d: string) {
  return SVGPathData.parse(d);
}

describe("normalize", () => {
  describe("empty input", () => {
    it("returns an empty array for no commands", () => {
      expect(normalize([])).toEqual([]);
    });
  });

  describe("MoveTo", () => {
    it("absolute M passes through unchanged", () => {
      expect(normalize(parse("M 10 20"))).toEqual([
        { type: SVGPathData.MOVE_TO, relative: false, x: 10, y: 20 },
      ]);
    });

    it("relative m is converted to absolute M", () => {
      expect(normalize(parse("m 10 20"))).toEqual([
        { type: SVGPathData.MOVE_TO, relative: false, x: 10, y: 20 },
      ]);
    });

    it("relative m offsets from the previous currentPoint", () => {
      expect(normalize(parse("M 5 5 m 3 4"))).toEqual([
        { type: SVGPathData.MOVE_TO, relative: false, x: 5, y: 5 },
        { type: SVGPathData.MOVE_TO, relative: false, x: 8, y: 9 },
      ]);
    });

    it("M updates startPoint for subsequent Z", () => {
      const result = normalize(parse("M 10 20 L 30 40 Z m 1 1"));
      // After Z currentPoint resets to startPoint (10,20), so m 1 1 => (11,21)
      expect(result[3]).toEqual({
        type: SVGPathData.MOVE_TO,
        relative: false,
        x: 11,
        y: 21,
      });
    });
  });

  describe("ClosePath", () => {
    it("Z passes through unchanged", () => {
      expect(normalize(parse("M 0 0 Z"))).toEqual([
        { type: SVGPathData.MOVE_TO, relative: false, x: 0, y: 0 },
        { type: SVGPathData.CLOSE_PATH },
      ]);
    });

    it("Z resets currentPoint to startPoint", () => {
      const result = normalize(parse("M 10 10 L 50 50 Z L 1 1"));
      // After Z, currentPoint is back to (10,10), so L 1 1 is absolute => (1,1)
      // But if we use relative l after Z, we'd see the reset. Here L is absolute so just check Z is present.
      expect(result[2]).toEqual({ type: SVGPathData.CLOSE_PATH });
      expect(result[3]).toEqual({
        type: SVGPathData.LINE_TO,
        relative: false,
        x: 1,
        y: 1,
      });
    });

    it("relative command after Z offsets from startPoint", () => {
      const result = normalize(parse("M 10 20 L 50 50 Z l 3 4"));
      // After Z, currentPoint = startPoint = (10,20), so l 3 4 => L 13 24
      expect(result[3]).toEqual({
        type: SVGPathData.LINE_TO,
        relative: false,
        x: 13,
        y: 24,
      });
    });
  });

  describe("HorizLineTo", () => {
    it("absolute H is converted to absolute L", () => {
      expect(normalize(parse("M 0 5 H 10"))).toEqual([
        { type: SVGPathData.MOVE_TO, relative: false, x: 0, y: 5 },
        { type: SVGPathData.LINE_TO, relative: false, x: 10, y: 5 },
      ]);
    });

    it("relative h is converted to absolute L", () => {
      expect(normalize(parse("M 3 7 h 4"))).toEqual([
        { type: SVGPathData.MOVE_TO, relative: false, x: 3, y: 7 },
        { type: SVGPathData.LINE_TO, relative: false, x: 7, y: 7 },
      ]);
    });

    it("chained H commands each produce absolute L with correct y", () => {
      expect(normalize(parse("M 0 10 H 5 H 15"))).toEqual([
        { type: SVGPathData.MOVE_TO, relative: false, x: 0, y: 10 },
        { type: SVGPathData.LINE_TO, relative: false, x: 5, y: 10 },
        { type: SVGPathData.LINE_TO, relative: false, x: 15, y: 10 },
      ]);
    });
  });

  describe("VertLineTo", () => {
    it("absolute V is converted to absolute L", () => {
      expect(normalize(parse("M 5 0 V 10"))).toEqual([
        { type: SVGPathData.MOVE_TO, relative: false, x: 5, y: 0 },
        { type: SVGPathData.LINE_TO, relative: false, x: 5, y: 10 },
      ]);
    });

    it("relative v is converted to absolute L", () => {
      expect(normalize(parse("M 7 3 v 4"))).toEqual([
        { type: SVGPathData.MOVE_TO, relative: false, x: 7, y: 3 },
        { type: SVGPathData.LINE_TO, relative: false, x: 7, y: 7 },
      ]);
    });

    it("chained v commands accumulate correctly", () => {
      expect(normalize(parse("M 2 0 v 3 v 3 v 3"))).toEqual([
        { type: SVGPathData.MOVE_TO, relative: false, x: 2, y: 0 },
        { type: SVGPathData.LINE_TO, relative: false, x: 2, y: 3 },
        { type: SVGPathData.LINE_TO, relative: false, x: 2, y: 6 },
        { type: SVGPathData.LINE_TO, relative: false, x: 2, y: 9 },
      ]);
    });
  });

  describe("LineTo", () => {
    it("absolute L passes through unchanged", () => {
      expect(normalize(parse("M 0 0 L 10 20"))).toEqual([
        { type: SVGPathData.MOVE_TO, relative: false, x: 0, y: 0 },
        { type: SVGPathData.LINE_TO, relative: false, x: 10, y: 20 },
      ]);
    });

    it("relative l is converted to absolute L", () => {
      expect(normalize(parse("M 5 5 l 3 4"))).toEqual([
        { type: SVGPathData.MOVE_TO, relative: false, x: 5, y: 5 },
        { type: SVGPathData.LINE_TO, relative: false, x: 8, y: 9 },
      ]);
    });

    it("chained relative l commands accumulate offsets", () => {
      expect(normalize(parse("M 0 0 l 1 1 l 2 2 l 3 3"))).toEqual([
        { type: SVGPathData.MOVE_TO, relative: false, x: 0, y: 0 },
        { type: SVGPathData.LINE_TO, relative: false, x: 1, y: 1 },
        { type: SVGPathData.LINE_TO, relative: false, x: 3, y: 3 },
        { type: SVGPathData.LINE_TO, relative: false, x: 6, y: 6 },
      ]);
    });
  });

  describe("CurveTo", () => {
    it("absolute C passes through unchanged", () => {
      expect(normalize(parse("M 0 0 C 10 20 30 40 50 60"))).toEqual([
        { type: SVGPathData.MOVE_TO, relative: false, x: 0, y: 0 },
        {
          type: SVGPathData.CURVE_TO,
          relative: false,
          x1: 10,
          y1: 20,
          x2: 30,
          y2: 40,
          x: 50,
          y: 60,
        },
      ]);
    });

    it("relative c is converted to absolute C", () => {
      expect(normalize(parse("M 10 10 c 1 2 3 4 5 6"))).toEqual([
        { type: SVGPathData.MOVE_TO, relative: false, x: 10, y: 10 },
        {
          type: SVGPathData.CURVE_TO,
          relative: false,
          x1: 11,
          y1: 12,
          x2: 13,
          y2: 14,
          x: 15,
          y: 16,
        },
      ]);
    });

    it("chained relative c commands accumulate from updated currentPoint", () => {
      const result = normalize(parse("M 0 0 c 10 0 20 0 30 0 c 1 2 3 4 5 6"));
      expect(result[2]).toEqual({
        type: SVGPathData.CURVE_TO,
        relative: false,
        x1: 31,
        y1: 2,
        x2: 33,
        y2: 4,
        x: 35,
        y: 6,
      });
    });
  });

  describe("QuadTo", () => {
    it("absolute Q passes through unchanged", () => {
      expect(normalize(parse("M 0 0 Q 50 100 100 0"))).toEqual([
        { type: SVGPathData.MOVE_TO, relative: false, x: 0, y: 0 },
        {
          type: SVGPathData.QUAD_TO,
          relative: false,
          x1: 50,
          y1: 100,
          x: 100,
          y: 0,
        },
      ]);
    });

    it("relative q is converted to absolute Q", () => {
      expect(normalize(parse("M 10 10 q 25 50 50 0"))).toEqual([
        { type: SVGPathData.MOVE_TO, relative: false, x: 10, y: 10 },
        {
          type: SVGPathData.QUAD_TO,
          relative: false,
          x1: 35,
          y1: 60,
          x: 60,
          y: 10,
        },
      ]);
    });
  });

  describe("SmoothCurveTo (S → C)", () => {
    it("absolute S after C reflects cp2 and becomes absolute C", () => {
      const result = normalize(parse("M 0 0 C 10 20 30 40 50 60 S 70 80 90 100"));
      // Previous C has cp2=(30,40), endpoint=(50,60)
      // Reflected cp1 = 2*(50,60) - (30,40) = (70,80)
      expect(result[2]).toEqual({
        type: SVGPathData.CURVE_TO,
        relative: false,
        x1: 70,
        y1: 80,
        x2: 70,
        y2: 80,
        x: 90,
        y: 100,
      });
    });

    it("relative s after C reflects cp2 and becomes absolute C", () => {
      const result = normalize(parse("M 0 0 C 10 20 30 40 50 60 s 20 20 40 40"));
      // Previous C has cp2=(30,40), endpoint=(50,60)
      // Reflected cp1 = 2*(50,60) - (30,40) = (70,80)
      // s offsets from (50,60): cp2=(70,80), end=(90,100)
      expect(result[2]).toEqual({
        type: SVGPathData.CURVE_TO,
        relative: false,
        x1: 70,
        y1: 80,
        x2: 70,
        y2: 80,
        x: 90,
        y: 100,
      });
    });

    it("relative s without preceding C falls back to currentPoint as cp1", () => {
      // Same spec rule as absolute S, applied to relative offsets.
      // s 20 30 40 50 from (10,10): cp1 = currentPoint = (10,10),
      // x2 = 10+20=30, y2 = 10+30=40, x = 10+40=50, y = 10+50=60
      const result = normalize(parse("M 10 10 s 20 30 40 50"));
      expect(result[1]).toEqual({
        type: SVGPathData.CURVE_TO,
        relative: false,
        x1: 10,
        y1: 10,
        x2: 30,
        y2: 40,
        x: 50,
        y: 60,
      });
    });

    it("S without preceding C falls back to currentPoint as cp1", () => {
      // Per W3C spec, if there is no previous C/S, the first control point
      // is assumed to be coincident with the current point.
      // So S 30 40 50 60 from (10,10) => C 10 10 30 40 50 60
      const result = normalize(parse("M 10 10 S 30 40 50 60"));
      expect(result[1]).toEqual({
        type: SVGPathData.CURVE_TO,
        relative: false,
        x1: 10,
        y1: 10,
        x2: 30,
        y2: 40,
        x: 50,
        y: 60,
      });
    });
  });

  describe("SmoothQuadTo (T → Q)", () => {
    it("absolute T after Q reflects control point and becomes absolute Q", () => {
      const result = normalize(parse("M 0 0 Q 50 100 100 0 T 200 0"));
      // Previous Q has cp=(50,100), endpoint=(100,0)
      // Reflected cp = 2*(100,0) - (50,100) = (150,-100)
      expect(result[2]).toEqual({
        type: SVGPathData.QUAD_TO,
        relative: false,
        x1: 150,
        y1: -100,
        x: 200,
        y: 0,
      });
    });

    it("relative t after Q reflects control point and becomes absolute Q", () => {
      const result = normalize(parse("M 0 0 Q 50 100 100 0 t 100 0"));
      // Reflected cp = 2*(100,0) - (50,100) = (150,-100)
      // t offsets endpoint from (100,0): (200,0)
      expect(result[2]).toEqual({
        type: SVGPathData.QUAD_TO,
        relative: false,
        x1: 150,
        y1: -100,
        x: 200,
        y: 0,
      });
    });

    it("relative t without preceding Q falls back to currentPoint as control point", () => {
      // Same spec rule as absolute T, applied to relative offsets.
      // t 40 50 from (10,10): cp = currentPoint = (10,10),
      // x = 10+40=50, y = 10+50=60
      const result = normalize(parse("M 10 10 t 40 50"));
      expect(result[1]).toEqual({
        type: SVGPathData.QUAD_TO,
        relative: false,
        x1: 10,
        y1: 10,
        x: 50,
        y: 60,
      });
    });

    it("T without preceding Q falls back to currentPoint as control point", () => {
      // Per W3C spec, if there is no previous Q/T, the control point
      // is assumed to be coincident with the current point.
      // So T 50 60 from (10,10) => Q 10 10 50 60
      const result = normalize(parse("M 10 10 T 50 60"));
      expect(result[1]).toEqual({
        type: SVGPathData.QUAD_TO,
        relative: false,
        x1: 10,
        y1: 10,
        x: 50,
        y: 60,
      });
    });

    it("chained T commands keep reflecting", () => {
      const result = normalize(parse("M 0 0 Q 50 100 100 0 T 200 0 T 300 0"));
      // First T: cp = 2*(100,0) - (50,100) = (150,-100)
      // Second T: cp = 2*(200,0) - (150,-100) = (250,100)
      expect(result[3]).toEqual({
        type: SVGPathData.QUAD_TO,
        relative: false,
        x1: 250,
        y1: 100,
        x: 300,
        y: 0,
      });
    });
  });

  describe("Arc", () => {
    it("absolute A passes through unchanged", () => {
      expect(normalize(parse("M 0 0 A 50 50 0 1 1 100 0"))).toEqual([
        { type: SVGPathData.MOVE_TO, relative: false, x: 0, y: 0 },
        {
          type: SVGPathData.ARC,
          relative: false,
          rX: 50,
          rY: 50,
          xRot: 0,
          lArcFlag: 1,
          sweepFlag: 1,
          x: 100,
          y: 0,
        },
      ]);
    });

    it("relative a is converted to absolute A", () => {
      expect(normalize(parse("M 10 10 a 25 25 0 0 1 50 0"))).toEqual([
        { type: SVGPathData.MOVE_TO, relative: false, x: 10, y: 10 },
        {
          type: SVGPathData.ARC,
          relative: false,
          rX: 25,
          rY: 25,
          xRot: 0,
          lArcFlag: 0,
          sweepFlag: 1,
          x: 60,
          y: 10,
        },
      ]);
    });
  });

  describe("mixed commands", () => {
    it("rectangle with H and V becomes all absolute L", () => {
      const result = normalize(parse("M 0 0 H 10 V 5 H 0 V 0 Z"));
      expect(result).toEqual([
        { type: SVGPathData.MOVE_TO, relative: false, x: 0, y: 0 },
        { type: SVGPathData.LINE_TO, relative: false, x: 10, y: 0 },
        { type: SVGPathData.LINE_TO, relative: false, x: 10, y: 5 },
        { type: SVGPathData.LINE_TO, relative: false, x: 0, y: 5 },
        { type: SVGPathData.LINE_TO, relative: false, x: 0, y: 0 },
        { type: SVGPathData.CLOSE_PATH },
      ]);
    });

    it("all-relative path is fully converted to absolute", () => {
      const result = normalize(parse("m 10 10 l 5 0 l 0 5 l -5 0 z"));
      expect(result).toEqual([
        { type: SVGPathData.MOVE_TO, relative: false, x: 10, y: 10 },
        { type: SVGPathData.LINE_TO, relative: false, x: 15, y: 10 },
        { type: SVGPathData.LINE_TO, relative: false, x: 15, y: 15 },
        { type: SVGPathData.LINE_TO, relative: false, x: 10, y: 15 },
        { type: SVGPathData.CLOSE_PATH },
      ]);
    });

    it("output never contains H, V, S, or T command types", () => {
      const result = normalize(
        parse(
          "M 0 0 H 10 V 10 h -5 v -5 C 0 0 5 10 10 10 S 15 20 20 20 Q 25 30 30 30 T 40 40 A 5 5 0 0 1 50 50 Z",
        ),
      );
      for (const cmd of result) {
        expect(cmd.type).not.toBe(SVGPathData.HORIZ_LINE_TO);
        expect(cmd.type).not.toBe(SVGPathData.VERT_LINE_TO);
        expect(cmd.type).not.toBe(SVGPathData.SMOOTH_CURVE_TO);
        expect(cmd.type).not.toBe(SVGPathData.SMOOTH_QUAD_TO);
      }
    });

    it("output never contains relative commands", () => {
      const result = normalize(
        parse("m 1 2 l 3 4 h 5 v 6 c 1 2 3 4 5 6 q 7 8 9 10 a 1 1 0 0 1 2 3 z"),
      );

      const cmds = result.filter((cmd) => cmd.type !== SVGPathData.CLOSE_PATH);
      for (const cmd of cmds) {
        expect(cmd.relative).toBe(false);
      }
    });
  });
});
