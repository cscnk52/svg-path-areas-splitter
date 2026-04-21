import { encodeSVGPath, SVGCommand, SVGPathData } from "svg-pathdata";

import { flatten } from "@/flatten";
import { normalize } from "@/normalize";
import type { FillRule, NormalizeSVGCommand, Point } from "@/types";

export type { FillRule };

export function split(d: string, fillRule: FillRule = "nonzero"): string[] {
  const original = SVGPathData.parse(d);
  const normalized = normalize(original);
  const commandGroups = buildCommandGroups(original, normalized);

  if (commandGroups.length === 0) return [];

  const subpathStrings = splitIntoSubpaths(d);
  const polygons = commandGroups.map((group) => flatten(group));
  const testPoints = polygons.map(computeCentroid);

  const depths = testPoints.map((tp, i) =>
    polygons.reduce((n, poly, j) => (j !== i && pointInPolygon(tp, poly) ? n + 1 : n), 0),
  );

  const anchorOf = assignToRegions(depths, testPoints, polygons, fillRule);

  const groups = new Map<number, { index: number; str: string }[]>();
  for (let i = 0; i < subpathStrings.length; i++) {
    const anchor = anchorOf[i];
    if (anchor === -1) continue;
    if (!groups.has(anchor)) groups.set(anchor, []);
    groups.get(anchor)!.push({ index: i, str: subpathStrings[i] });
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, items]) =>
      items
        .map((item, groupPos) => {
          if (
            groupPos === 0 &&
            item.index > 0 &&
            anchorOf[item.index - 1] !== anchorOf[item.index] &&
            item.str.trimStart()[0] === "m"
          ) {
            return encodeSVGPath(commandGroups[item.index]);
          }
          return item.str;
        })
        .join(""),
    );
}

function buildCommandGroups(
  original: SVGCommand[],
  normalized: NormalizeSVGCommand[],
): SVGCommand[][] {
  const groups: SVGCommand[][] = [];
  let current: SVGCommand[] = [];

  for (let i = 0; i < original.length; i++) {
    const norm = normalized[i];
    if (norm.type === SVGPathData.MOVE_TO) {
      if (current.length > 0) groups.push(current);
      current = [{ type: SVGPathData.MOVE_TO, relative: false, x: norm.x, y: norm.y }];
    } else {
      current.push(original[i]);
    }
  }

  if (current.length > 0) groups.push(current);
  return groups;
}

function splitIntoSubpaths(d: string): string[] {
  return d.split(/(?=[Mm])/).filter((s) => s.trim().length > 0);
}

function assignToRegions(
  depths: number[],
  testPoints: Point[],
  polygons: Point[][],
  fillRule: FillRule,
): number[] {
  const n = depths.length;
  const anchorOf = Array.from({ length: n }, () => -1);
  const isAnchor = fillRule === "evenodd" ? (d: number) => d % 2 === 0 : (d: number) => d === 0;

  for (let i = 0; i < n; i++) {
    if (isAnchor(depths[i])) anchorOf[i] = i;
  }

  for (let i = 0; i < n; i++) {
    if (anchorOf[i] !== -1) continue;
    for (let j = 0; j < n; j++) {
      if (j !== i && anchorOf[j] === j && pointInPolygon(testPoints[i], polygons[j])) {
        anchorOf[i] = j;
        break;
      }
    }
  }

  return anchorOf;
}

function computeCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const { x: xi, y: yi } = polygon[i];
    const { x: xj, y: yj } = polygon[j];
    if (yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
