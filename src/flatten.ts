import { SVGCommand, SVGPathData } from "svg-pathdata";
import { Point } from "@/types";
import { match } from "ts-pattern";

type flattenSingleCommandType = Exclude<
  SVGCommand,
  { type: typeof SVGPathData.CLOSE_PATH }
>;

function flattenSingleCommand(
  command: flattenSingleCommandType,
  currentPoint: Point,
  step: number = 64,
): Array<Point> {
  return (
    match(command)
      .returnType<Array<Point>>()
      // m x y: return currentPoint + {x, y}
      .with({ type: SVGPathData.MOVE_TO, relative: true }, (res) => [
        {
          x: currentPoint.x + res.x,
          y: currentPoint.y + res.y,
        },
      ])
      // M x y: return {x, y}
      .with({ type: SVGPathData.MOVE_TO, relative: false }, (res) => [
        {
          x: res.x,
          y: res.y,
        },
      ])
      // h
      .with({ type: SVGPathData.HORIZ_LINE_TO, relative: true }, (res) => [
        {
          x: currentPoint.x + res.x,
          y: currentPoint.y,
        },
      ])
      .with({ type: SVGPathData.HORIZ_LINE_TO, relative: false }, (res) => [
        {
          x: res.x,
          y: currentPoint.y,
        },
      ])
      .with({ type: SVGPathData.VERT_LINE_TO, relative: true }, (res) => [
        {
          x: currentPoint.x,
          y: currentPoint.y + res.y,
        },
      ])
      .with({ type: SVGPathData.VERT_LINE_TO, relative: false }, (res) => [
        {
          x: currentPoint.x,
          y: res.y,
        },
      ])
      .with({ type: SVGPathData.LINE_TO, relative: true }, (res) => [
        {
          x: currentPoint.x + res.x,
          y: currentPoint.y + res.y,
        },
      ])
      .with({ type: SVGPathData.LINE_TO, relative: false }, (res) => [
        {
          x: res.x,
          y: res.y,
        },
      ])
      .exhaustive();
  );
}

export function flatten(commands: SVGCommand[]): Array<Point> {
  // TODO
  return [{ x: 0, y: 0 }];
}
