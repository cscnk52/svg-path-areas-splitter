import { SVGPathData } from "svg-pathdata";
import type { SVGCommand } from "svg-pathdata";
import { flattenSubpath } from "@/flatten";
import { signedArea } from "@/area";
import { computeBoundingBox, polygonContains, type BoundingBox } from "@/containment";

export interface Config {
  fillRule?: "nonzero" | "evenodd";
}

interface Subpath {
  commands: SVGCommand[];
  originalText: string;
  points: Array<[number, number]>;
  area: number;
  absArea: number;
  bbox: BoundingBox;
}

/**
 * Split an SVG path `d` string into independent filled regions,
 * respecting the given fill-rule.
 *
 * Unlike a naive split on `M` commands, this function understands
 * geometric containment: a small clockwise subpath inside a larger
 * counterclockwise subpath is a "hole", and they belong together.
 *
 * The original path text is preserved verbatim — no re-encoding,
 * no relative→absolute conversion, no floating-point noise.
 *
 * @param d - the SVG path `d` attribute string
 * @param config - optional configuration (fillRule defaults to "nonzero")
 * @returns an array of path `d` strings, one per independent filled region
 *          (each may contain holes expressed as inner subpaths)
 */
export function SplitPath(d: string, config: Config = {}): Array<string> {
  const { fillRule = "nonzero" } = config;

  // --- Step 1: Split the raw `d` string into original text segments ---
  // Each segment starts at an M/m command. We preserve the exact original text.
  const originalSegments = splitRawPathAtMoveTo(d);
  if (originalSegments.length <= 1) {
    // Nothing to split
    return [d];
  }

  // --- Step 2: Parse and normalise to absolute commands (for analysis only) ---
  const pathData = new SVGPathData(d).toAbs().normalizeHVZ();
  const commands = pathData.commands;

  // --- Step 3: Split the normalised commands at every M command ---
  const rawSubpaths = splitCommandsAtMoveTo(commands);

  // Sanity check: the number of text segments must match the command groups.
  // If they don't match (shouldn't happen for well-formed paths), fall back.
  if (rawSubpaths.length !== originalSegments.length) {
    return [d];
  }

  // --- Step 4: For each subpath, flatten to polyline and compute geometry ---
  const subpaths: Subpath[] = [];
  for (let idx = 0; idx < rawSubpaths.length; idx++) {
    const cmds = rawSubpaths[idx];
    const originalText = originalSegments[idx];
    const points = flattenSubpath(cmds);
    if (points.length < 3) {
      // Degenerate subpath (e.g. a bare M with no drawing commands). Keep it
      // as-is but with zero area so it won't participate in containment logic.
      subpaths.push({
        commands: cmds,
        originalText,
        points,
        area: 0,
        absArea: 0,
        bbox: computeBoundingBox(points.length > 0 ? points : [[0, 0]]),
      });
      continue;
    }
    const area = signedArea(points);
    subpaths.push({
      commands: cmds,
      originalText,
      points,
      area,
      absArea: Math.abs(area),
      bbox: computeBoundingBox(points),
    });
  }

  // --- Step 5: Sort by absolute area descending ---
  // Larger shapes come first so we can efficiently find parents.
  const indices = subpaths.map((_, i) => i);
  indices.sort((a, b) => subpaths[b].absArea - subpaths[a].absArea);

  // --- Step 6: Build containment tree ---
  // For each subpath find its *direct* parent (the smallest subpath that
  // contains it). We walk the sorted order so that potential parents are
  // always visited before their children.
  const parent: Array<number | null> = Array.from<number | null>({
    length: subpaths.length,
  }).fill(null);
  // depth[i] = nesting level (0 = root)
  const depth: number[] = Array.from<number>({ length: subpaths.length }).fill(0);

  for (let ii = 0; ii < indices.length; ii++) {
    const childIdx = indices[ii];
    const child = subpaths[childIdx];
    if (child.points.length < 3) continue;

    // Walk backwards through sorted list to find smallest container
    for (let jj = ii - 1; jj >= 0; jj--) {
      const candidateIdx = indices[jj];
      const candidate = subpaths[candidateIdx];
      if (candidate.points.length < 3) continue;
      if (candidate.absArea <= child.absArea) continue;

      if (polygonContains(candidate.points, candidate.bbox, child.points, child.bbox)) {
        // Is this a more direct parent than what we already found?
        if (parent[childIdx] === null || subpaths[parent[childIdx]!].absArea > candidate.absArea) {
          parent[childIdx] = candidateIdx;
        }
      }
    }

    if (parent[childIdx] !== null) {
      depth[childIdx] = depth[parent[childIdx]!] + 1;
    }
  }

  // --- Step 7: Group subpaths into independent filled regions ---
  if (fillRule === "evenodd") {
    return groupEvenOdd(subpaths, parent, depth);
  }
  return groupNonZero(subpaths, parent);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Split the raw `d` string into segments, cutting before every `M` or `m`
 * command. This preserves the exact original text (spacing, relative commands,
 * number formatting, etc.).
 */
function splitRawPathAtMoveTo(d: string): string[] {
  const segments: string[] = [];

  // Find every position where an M or m command starts.
  // The regex matches 'M' or 'm' that is a command (not inside a number).
  // In SVG path data, M/m always denotes a moveTo command.
  const moveRegex = /[Mm]/g;
  const movePositions: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = moveRegex.exec(d)) !== null) {
    movePositions.push(match.index);
  }

  if (movePositions.length === 0) {
    // No M commands at all — return the whole string as-is
    return [d];
  }

  for (let i = 0; i < movePositions.length; i++) {
    const start = movePositions[i];
    const end = i + 1 < movePositions.length ? movePositions[i + 1] : d.length;
    const segment = d.slice(start, end).trim();
    if (segment.length > 0) {
      segments.push(segment);
    }
  }

  return segments;
}

/**
 * Split a flat array of normalised commands into groups, cutting at every
 * MOVE_TO. Used for geometric analysis only.
 */
function splitCommandsAtMoveTo(commands: SVGCommand[]): SVGCommand[][] {
  const result: SVGCommand[][] = [];
  let current: SVGCommand[] = [];

  for (const cmd of commands) {
    if (cmd.type === SVGPathData.MOVE_TO && current.length > 0) {
      result.push(current);
      current = [];
    }
    current.push(cmd);
  }
  if (current.length > 0) {
    result.push(current);
  }

  return result;
}

/**
 * Join multiple subpaths' original text into a single `d` string,
 * preserving original formatting.
 *
 * If a subpath's original text starts with a relative `m` command,
 * it is replaced with an absolute `M` using the coordinates from the
 * parsed (absolute) commands. This is necessary because regrouping
 * may change the preceding context that the relative offset depended on.
 * Everything after the initial moveTo coordinates is kept verbatim.
 */
function joinOriginalText(subpaths: Subpath[]): string {
  return subpaths.map((sp) => ensureAbsoluteMoveTo(sp)).join("");
}

/**
 * If the subpath's original text starts with a relative `m`, replace
 * just the `m dx dy` prefix with `M absX absY` from the parsed commands.
 * Everything else in the segment is returned unchanged.
 */
function ensureAbsoluteMoveTo(sp: Subpath): string {
  const text = sp.originalText;
  // Only needs fixing if the segment starts with lowercase 'm'
  if (text[0] !== "m") {
    return text;
  }

  // Extract the absolute x, y from the first parsed command (MOVE_TO)
  const firstCmd = sp.commands[0];
  if (firstCmd.type !== SVGPathData.MOVE_TO) {
    return text;
  }
  const absX = firstCmd.x;
  const absY = firstCmd.y;

  // Find the end of the `m dx dy` / `m dx,dy` token in the original text.
  // We need to skip: 'm', optional whitespace/comma, first number,
  // optional whitespace/comma, second number.
  const mParamRegex =
    /^m[\s,]*[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?[\s,]*[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;
  const match = mParamRegex.exec(text);
  if (!match) {
    return text;
  }

  // Replace the matched `m dx dy` with `M absX absY`, keep the rest.
  // Round coordinates to remove floating-point noise while preserving
  // the precision of the original path (up to 6 decimal places).
  const rest = text.slice(match[0].length);
  const rx = roundCoord(absX);
  const ry = roundCoord(absY);
  return `M${rx} ${ry}${rest}`;
}

/**
 * Round a coordinate value: strip trailing floating-point noise
 * by rounding to at most 6 decimal places, then remove trailing zeros.
 */
function roundCoord(n: number): string {
  // Use toPrecision with enough digits, then parseFloat to strip trailing zeros
  const rounded = parseFloat(n.toFixed(6));
  return String(rounded);
}

/**
 * Sort regions by the minimum original subpath index in each region,
 * so the output order matches the original path order.
 */
function sortRegionsByOriginalOrder(regions: Map<number, number[]>, subpaths: Subpath[]): string[] {
  const entries = [...regions.entries()].map(([, idxs]) => {
    const sorted = idxs.sort((a, b) => a - b);
    const minIdx = sorted[0];
    return { minIdx, subpaths: sorted.map((i) => subpaths[i]) };
  });
  entries.sort((a, b) => a.minIdx - b.minIdx);
  return entries.map((e) => joinOriginalText(e.subpaths));
}

/**
 * Group subpaths using the even-odd rule.
 *
 * Under even-odd, a point is filled if it is enclosed by an *odd* number
 * of subpath boundaries. So:
 * - depth 0 → filled (root shape)     → starts a new region
 * - depth 1 → hole                     → attach to parent region
 * - depth 2 → filled (island in hole) → starts a new region
 * - depth 3 → hole in island           → attach to parent region
 * - ...
 *
 * Each "filled" subpath at an even depth becomes the root of a region.
 * Each "hole" subpath at an odd depth is merged into its parent's region.
 */
function groupEvenOdd(
  subpaths: Subpath[],
  parent: Array<number | null>,
  depth: number[],
): string[] {
  // Map from region-root index → list of subpath indices in that region
  const regions = new Map<number, number[]>();

  for (let i = 0; i < subpaths.length; i++) {
    if (depth[i] % 2 === 0) {
      // Even depth: this is a filled shape, start its own region
      if (!regions.has(i)) {
        regions.set(i, []);
      }
      regions.get(i)!.push(i);
    } else {
      // Odd depth: this is a hole, find the nearest even-depth ancestor
      const regionRoot = findRegionRoot(i, parent, depth);
      if (regionRoot !== null && regions.has(regionRoot)) {
        regions.get(regionRoot)!.push(i);
      } else {
        // Fallback: treat it as its own region
        regions.set(i, [i]);
      }
    }
  }

  return sortRegionsByOriginalOrder(regions, subpaths);
}

/**
 * Group subpaths using the non-zero winding rule.
 *
 * Under non-zero, the winding number at any point is the sum of winding
 * contributions from enclosing subpaths. A CCW subpath adds +1 and a CW
 * subpath adds −1 (or vice-versa depending on convention, but what matters
 * is that opposite-direction children cancel out).
 *
 * A subpath is a "hole" if adding it to the parent's winding number
 * brings that number closer to zero.
 */
function groupNonZero(subpaths: Subpath[], parent: Array<number | null>): string[] {
  // Compute the winding contribution of each subpath:
  // +1 for CCW (positive area), −1 for CW (negative area)
  const winding = subpaths.map((sp) => {
    if (sp.area > 0) return 1;
    if (sp.area < 0) return -1;
    return 0;
  });

  // Build topological order: parents must be visited before children.
  // Since a parent always has strictly larger absArea than its children,
  // sorting by absArea descending gives us a valid topological order.
  const topoOrder = subpaths.map((_, i) => i);
  topoOrder.sort((a, b) => subpaths[b].absArea - subpaths[a].absArea);

  // Compute cumulative winding number at each subpath (in topological order
  // so that every parent's value is computed before its children's).
  const cumulativeWinding: number[] = Array.from<number>({
    length: subpaths.length,
  }).fill(0);
  for (const i of topoOrder) {
    if (parent[i] === null) {
      cumulativeWinding[i] = winding[i];
    } else {
      cumulativeWinding[i] = cumulativeWinding[parent[i]!] + winding[i];
    }
  }

  // A subpath is a "root" region if it transitions from winding 0 to non-zero
  // (i.e. its parent's cumulative winding is 0, or it has no parent).
  // A subpath is a "hole" if it brings winding toward zero.
  const regions = new Map<number, number[]>();

  // Iterate in topological order so that region roots (parents) are created
  // before their children attempt to attach to them.
  for (const i of topoOrder) {
    const parentWinding = parent[i] !== null ? cumulativeWinding[parent[i]!] : 0;

    if (parentWinding === 0) {
      // This subpath transitions from unfilled → filled, it's a region root
      regions.set(i, [i]);
    } else {
      // This subpath is either a hole or a reinforcing inner shape.
      // Attach it to the nearest region root ancestor.
      const regionRoot = findNonZeroRegionRoot(i, parent, cumulativeWinding);
      if (regionRoot !== null && regions.has(regionRoot)) {
        regions.get(regionRoot)!.push(i);
      } else {
        // Fallback
        regions.set(i, [i]);
      }
    }
  }

  return sortRegionsByOriginalOrder(regions, subpaths);
}

/**
 * Walk up the parent chain to find the nearest ancestor at an even depth
 * (used by even-odd grouping).
 */
function findRegionRoot(idx: number, parent: Array<number | null>, depth: number[]): number | null {
  let current = parent[idx];
  while (current !== null) {
    if (depth[current] % 2 === 0) {
      return current;
    }
    current = parent[current];
  }
  return null;
}

/**
 * Walk up the parent chain to find the nearest ancestor whose parent's
 * cumulative winding was 0 (used by non-zero grouping).
 */
function findNonZeroRegionRoot(
  idx: number,
  parent: Array<number | null>,
  cumulativeWinding: number[],
): number | null {
  let current = parent[idx];
  while (current !== null) {
    const pw = parent[current] !== null ? cumulativeWinding[parent[current]!] : 0;
    if (pw === 0) {
      return current;
    }
    current = parent[current];
  }
  return null;
}
