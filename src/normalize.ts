import {
  CommandM,
  CommandL,
  CommandC,
  CommandQ,
  CommandA,
  SVGCommand,
  SVGPathData,
} from "svg-pathdata";
import { match } from "ts-pattern";

import type { Point, NormalizeSVGCommand, ForceAbsolute } from "@/types";

/**
 * Normalizes an array of SVG path commands into a canonical form:
 * all coordinates are converted to absolute, and the shorthand command
 * types `H`, `V`, `S`, `T` are expanded into their full equivalents
 * (`L`, `L`, `C`, `Q`).
 *
 * @param commands - Raw SVG path commands as parsed by `svg-pathdata`
 * @returns Normalized commands containing only `M`, `L`, `C`, `Q`, `A`, `Z`,
 *          all with `relative: false`
 */
export function normalize(commands: SVGCommand[]): NormalizeSVGCommand[] {
  let absCommands: NormalizeSVGCommand[] = [];

  let currentPoint: Point = { x: 0, y: 0 };
  let startPoint: Point = { x: 0, y: 0 };
  let prevControlPoint: Point | null = null;

  for (const command of commands) {
    const absCommand = match(command)
      .returnType<NormalizeSVGCommand>()
      .with({ type: SVGPathData.MOVE_TO, relative: true }, (res) => {
        const commandM: ForceAbsolute<CommandM> = {
          type: SVGPathData.MOVE_TO,
          relative: false,
          x: currentPoint.x + res.x,
          y: currentPoint.y + res.y,
        };
        currentPoint = { x: commandM.x, y: commandM.y };
        startPoint = currentPoint;
        return commandM;
      })
      .with({ type: SVGPathData.MOVE_TO, relative: false }, (res) => {
        const commandM: ForceAbsolute<CommandM> = res;
        currentPoint = { x: commandM.x, y: commandM.y };
        startPoint = currentPoint;
        return commandM;
      })
      .with({ type: SVGPathData.CLOSE_PATH }, (res) => {
        currentPoint = startPoint;
        return res;
      })
      .with({ type: SVGPathData.HORIZ_LINE_TO, relative: false }, (res) => {
        const commandM: ForceAbsolute<CommandL> = {
          type: SVGPathData.LINE_TO,
          relative: false,
          x: res.x,
          y: currentPoint.y,
        };
        currentPoint = { x: commandM.x, y: commandM.y };
        return commandM;
      })
      .with({ type: SVGPathData.HORIZ_LINE_TO, relative: true }, (res) => {
        const commandM: ForceAbsolute<CommandL> = {
          type: SVGPathData.LINE_TO,
          relative: false,
          x: currentPoint.x + res.x,
          y: currentPoint.y,
        };
        currentPoint = { x: commandM.x, y: commandM.y };

        return commandM;
      })
      .with({ type: SVGPathData.VERT_LINE_TO, relative: false }, (res) => {
        const commandL: ForceAbsolute<CommandL> = {
          type: SVGPathData.LINE_TO,
          relative: false,
          x: currentPoint.x,
          y: res.y,
        };
        currentPoint = { x: commandL.x, y: commandL.y };
        return commandL;
      })
      .with({ type: SVGPathData.VERT_LINE_TO, relative: true }, (res) => {
        const commandL: ForceAbsolute<CommandL> = {
          type: SVGPathData.LINE_TO,
          relative: false,
          x: currentPoint.x,
          y: currentPoint.y + res.y,
        };
        currentPoint = { x: commandL.x, y: commandL.y };
        return commandL;
      })
      .with({ type: SVGPathData.LINE_TO, relative: false }, (res) => {
        const commandL: ForceAbsolute<CommandL> = res;
        currentPoint = { x: commandL.x, y: commandL.y };
        return commandL;
      })
      .with({ type: SVGPathData.LINE_TO, relative: true }, (res) => {
        const commandL: ForceAbsolute<CommandL> = {
          type: SVGPathData.LINE_TO,
          relative: false,
          x: currentPoint.x + res.x,
          y: currentPoint.y + res.y,
        };
        currentPoint = { x: commandL.x, y: commandL.y };
        return commandL;
      })
      .with({ type: SVGPathData.CURVE_TO, relative: false }, (res) => {
        const commandC: ForceAbsolute<CommandC> = res;
        prevControlPoint = { x: commandC.x2, y: commandC.y2 };
        currentPoint = { x: commandC.x, y: commandC.y };
        return commandC;
      })
      .with({ type: SVGPathData.CURVE_TO, relative: true }, (res) => {
        const commandC: ForceAbsolute<CommandC> = {
          type: SVGPathData.CURVE_TO,
          relative: false,
          x1: currentPoint.x + res.x1,
          y1: currentPoint.y + res.y1,
          x2: currentPoint.x + res.x2,
          y2: currentPoint.y + res.y2,
          x: currentPoint.x + res.x,
          y: currentPoint.y + res.y,
        };
        prevControlPoint = { x: commandC.x2, y: commandC.y2 };
        currentPoint = { x: commandC.x, y: commandC.y };
        return commandC;
      })
      .with({ type: SVGPathData.QUAD_TO, relative: false }, (res) => {
        const commandQ: ForceAbsolute<CommandQ> = res;
        prevControlPoint = { x: commandQ.x1, y: commandQ.y1 };
        currentPoint = { x: commandQ.x, y: commandQ.y };
        return commandQ;
      })
      .with({ type: SVGPathData.QUAD_TO, relative: true }, (res) => {
        const commandQ: ForceAbsolute<CommandQ> = {
          type: SVGPathData.QUAD_TO,
          relative: false,
          x1: currentPoint.x + res.x1,
          y1: currentPoint.y + res.y1,
          x: currentPoint.x + res.x,
          y: currentPoint.y + res.y,
        };
        prevControlPoint = { x: commandQ.x1, y: commandQ.y1 };
        currentPoint = { x: commandQ.x, y: commandQ.y };
        return commandQ;
      })
      .with({ type: SVGPathData.SMOOTH_CURVE_TO, relative: false }, (res) => {
        // Per W3C SVG spec §9.3.6: "If there is no previous command or if the
        // previous command was not a C, c, S or s, assume the first control
        // point is coincident with the current point."
        // https://www.w3.org/TR/SVG/paths.html#PathDataCubicBezierCommands
        const effectiveControlPoint = prevControlPoint ?? currentPoint;
        // cp1 is the reflection of effectiveControlPoint through currentPoint: 2P - Q
        const cp1: Point = {
          x: 2 * currentPoint.x - effectiveControlPoint.x,
          y: 2 * currentPoint.y - effectiveControlPoint.y,
        };
        const commandC: ForceAbsolute<CommandC> = {
          type: SVGPathData.CURVE_TO,
          relative: false,
          x1: cp1.x,
          y1: cp1.y,
          x2: res.x2,
          y2: res.y2,
          x: res.x,
          y: res.y,
        };
        prevControlPoint = { x: commandC.x2, y: commandC.y2 };
        currentPoint = { x: commandC.x, y: commandC.y };
        return commandC;
      })
      .with({ type: SVGPathData.SMOOTH_CURVE_TO, relative: true }, (res) => {
        // Same fallback as absolute S; see comment above.
        const effectiveControlPoint = prevControlPoint ?? currentPoint;
        // cp1 is the reflection of effectiveControlPoint through currentPoint: 2P - Q
        const cp1: Point = {
          x: 2 * currentPoint.x - effectiveControlPoint.x,
          y: 2 * currentPoint.y - effectiveControlPoint.y,
        };
        const commandC: ForceAbsolute<CommandC> = {
          type: SVGPathData.CURVE_TO,
          relative: false,
          x1: cp1.x,
          y1: cp1.y,
          x2: currentPoint.x + res.x2,
          y2: currentPoint.y + res.y2,
          x: currentPoint.x + res.x,
          y: currentPoint.y + res.y,
        };
        prevControlPoint = { x: commandC.x2, y: commandC.y2 };
        currentPoint = { x: commandC.x, y: commandC.y };
        return commandC;
      })
      .with({ type: SVGPathData.SMOOTH_QUAD_TO, relative: false }, (res) => {
        // Per W3C SVG spec §9.3.7: "If there is no previous command or if the
        // previous command was not a Q, q, T or t, assume the control point is
        // coincident with the current point."
        // https://www.w3.org/TR/SVG/paths.html#PathDataQuadraticBezierCommands
        const effectiveControlPoint = prevControlPoint ?? currentPoint;
        // cp is the reflection of effectiveControlPoint through currentPoint: 2P - Q
        const cp: Point = {
          x: 2 * currentPoint.x - effectiveControlPoint.x,
          y: 2 * currentPoint.y - effectiveControlPoint.y,
        };
        const commandQ: ForceAbsolute<CommandQ> = {
          type: SVGPathData.QUAD_TO,
          relative: false,
          x1: cp.x,
          y1: cp.y,
          x: res.x,
          y: res.y,
        };
        prevControlPoint = { x: commandQ.x1, y: commandQ.y1 };
        currentPoint = { x: commandQ.x, y: commandQ.y };
        return commandQ;
      })
      .with({ type: SVGPathData.SMOOTH_QUAD_TO, relative: true }, (res) => {
        // Same fallback as absolute T; see comment above.
        const effectiveControlPoint = prevControlPoint ?? currentPoint;
        // cp is the reflection of effectiveControlPoint through currentPoint: 2P - Q
        const cp: Point = {
          x: 2 * currentPoint.x - effectiveControlPoint.x,
          y: 2 * currentPoint.y - effectiveControlPoint.y,
        };
        const commandQ: ForceAbsolute<CommandQ> = {
          type: SVGPathData.QUAD_TO,
          relative: false,
          x1: cp.x,
          y1: cp.y,
          x: currentPoint.x + res.x,
          y: currentPoint.y + res.y,
        };
        prevControlPoint = { x: commandQ.x1, y: commandQ.y1 };
        currentPoint = { x: commandQ.x, y: commandQ.y };
        return commandQ;
      })
      .with({ type: SVGPathData.ARC, relative: false }, (res) => {
        const commandA: ForceAbsolute<CommandA> = res;
        currentPoint = { x: commandA.x, y: commandA.y };
        return commandA;
      })
      .with({ type: SVGPathData.ARC, relative: true }, (res) => {
        const commandA: ForceAbsolute<CommandA> = {
          type: SVGPathData.ARC,
          relative: false,
          rX: res.rX,
          rY: res.rY,
          xRot: res.xRot,
          lArcFlag: res.lArcFlag,
          sweepFlag: res.sweepFlag,
          x: currentPoint.x + res.x,
          y: currentPoint.y + res.y,
        };
        currentPoint = { x: commandA.x, y: commandA.y };
        return commandA;
      })
      .exhaustive();

    absCommands.push(absCommand);
  }

  return absCommands;
}
