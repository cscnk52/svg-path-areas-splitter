# svg-path-areas-splitter

Split an SVG path `d` string into independent filled regions — respecting **nonzero** and **evenodd** fill rules — instead of naively splitting at every `M` command.

## Why?

SVG paths can contain multiple subpaths (separated by `M`/`m` moveTo commands). Some of those subpaths are **holes** that cut out from a parent shape — like the center of a donut, the counter of the letter "O", or the transparent regions inside an icon.

A naive split at every `M` loses this relationship: holes become independent filled shapes, and the visual result breaks.

**svg-path-areas-splitter** understands geometry. It analyzes signed areas, winding directions, and containment relationships to group subpaths into the correct filled regions.

<p align="center">
  <img src="docs/step1-naive-vs-area.svg" width="700" alt="Naive split vs area-aware split: the donut problem" />
</p>

## Install

```sh
npm install svg-path-areas-splitter
```

```sh
pnpm add svg-path-areas-splitter
```

```sh
yarn add svg-path-areas-splitter
```

## Usage

```js
import { SplitPath } from "svg-path-areas-splitter";

// A donut: outer CCW rectangle + inner CW hole
const d = "M0,0 L100,0 L100,100 L0,100 Z M25,25 L25,75 L75,75 L75,25 Z";

// Default: nonzero fill-rule
const regions = SplitPath(d);
// => ["M0,0 L100,0 L100,100 L0,100 Z M25,25 L25,75 L75,75 L75,25 Z"]
// One region: the hole stays with its parent ✓

// Two separate (non-overlapping) rectangles
const d2 = "M0,0 L50,0 L50,50 L0,50 Z M200,0 L250,0 L250,50 L200,50 Z";
const regions2 = SplitPath(d2);
// => ["M0,0 L50,0 L50,50 L0,50 Z", "M200,0 L250,0 L250,50 L200,50 Z"]
// Two regions: independent shapes are separated ✓
```

### With evenodd fill-rule

```js
import { SplitPath } from "svg-path-areas-splitter";

const d = "M0,0 L100,0 L100,100 L0,100 Z M20,20 L80,20 L80,80 L20,80 Z";

const regions = SplitPath(d, { fillRule: "evenodd" });
// Under evenodd, any nested subpath is a hole regardless of winding direction
// => ["M0,0 L100,0 L100,100 L0,100 Z M20,20 L80,20 L80,80 L20,80 Z"]
```

### Splitting icon paths

A common use case is splitting multi-region icon paths (e.g. from [simple-icons](https://github.com/simple-icons/simple-icons)) into their independent visual parts:

```js
import { SplitPath } from "svg-path-areas-splitter";

// Example: an icon with two separate filled areas + holes
const iconPath = getIconPath(); // your SVG path d string
const parts = SplitPath(iconPath, { fillRule: "nonzero" });

// Each part is a self-contained d string that can be rendered independently
parts.forEach((d, i) => {
  console.log(`Region ${i}: ${d.substring(0, 60)}...`);
});
```

## API

### `SplitPath(d, config?)`

Split an SVG path `d` string into independent filled regions.

**Parameters:**

| Parameter         | Type                     | Default     | Description                           |
| ----------------- | ------------------------ | ----------- | ------------------------------------- |
| `d`               | `string`                 | —           | The SVG path `d` attribute string     |
| `config`          | `Config`                 | `{}`        | Optional configuration object         |
| `config.fillRule` | `"nonzero" \| "evenodd"` | `"nonzero"` | The SVG fill-rule to use for grouping |

**Returns:** `Array<string>` — an array of path `d` strings, one per independent filled region. Each string may contain multiple subpaths (e.g. an outer shape + its holes).

### `Config`

```ts
interface Config {
  fillRule?: "nonzero" | "evenodd";
}
```

Both `SplitPath` and `Config` are exported from the package.

## How It Works

<p align="center">
  <img src="docs/step2-pipeline.svg" width="800" alt="Processing pipeline diagram" />
</p>

The algorithm follows these steps:

### 1. Parse & Preserve

The input `d` string is split into raw text segments at every `M`/`m` command. The **original text is preserved** — no re-encoding, no floating-point noise. Separately, the path is parsed and normalized to absolute commands for geometric analysis.

### 2. Flatten to Polylines

Each subpath's curves (cubic/quadratic Béziers, elliptical arcs) are approximated as polylines by sampling at 64 steps per curve segment. This produces a polygon for each subpath.

### 3. Compute Geometry

For each polygon:

- **Signed area** via the [Shoelace formula](https://en.wikipedia.org/wiki/Shoelace_formula) — positive means CCW, negative means CW
- **Bounding box** for fast containment rejection

### 4. Build Containment Tree

Subpaths are sorted by absolute area (largest first). For each subpath, we find its **smallest containing parent** using:

- **Bounding box pre-check** — fast reject if the inner bbox isn't within the outer
- **Point-in-polygon sampling** — ray-casting test on up to 8 evenly-spaced sample points from the inner polygon (majority rule)

This produces a tree structure where each node knows its parent and nesting depth.

### 5. Group by Fill Rule

**nonzero rule:**

- Each subpath contributes +1 (CCW) or −1 (CW) to the winding number
- Cumulative winding is computed in topological order (parents before children)
- A subpath whose parent's cumulative winding is 0 starts a **new region**
- All other subpaths attach to their nearest region-root ancestor

**evenodd rule:**

- Even-depth subpaths (depth 0, 2, 4, ...) are **filled** → start new regions
- Odd-depth subpaths (depth 1, 3, 5, ...) are **holes** → attach to nearest even-depth ancestor

### 6. Emit Results

Regions are emitted in original subpath order. Within each region, subpaths are ordered by their original index. The original path text is used verbatim, with one exception: if a subpath originally starts with a **relative `m`** but is no longer first in its group (its preceding context changed), the `m dx dy` prefix is converted to `M absX absY` to preserve correct coordinates.

## Text Preservation

This library is designed to **preserve the original path text** as much as possible:

- No re-encoding of commands (relative commands stay relative, formatting stays intact)
- No floating-point drift from round-tripping through a parser
- The only mutation is converting a relative `m` to absolute `M` when regrouping changes a subpath's preceding context (coordinates are rounded to 6 decimal places)

## Edge Cases & Caveats

### Containment Sampling Precision

Containment is determined by sampling up to 8 points from the inner polygon and checking if the majority lie inside the outer polygon via ray-casting. This is efficient and works well for the vast majority of real-world paths, but can produce incorrect results in extremely pathological cases where:

- Sample points land exactly on a polygon boundary
- Two subpaths are nearly tangent or share vertices
- Polygons have very thin slivers where all sample points cluster

For these rare cases, results may vary slightly depending on the path geometry.

### Degenerate Subpaths

Subpaths with fewer than 3 points (e.g. a bare `M` or `M...L`) have zero area and don't participate in containment logic. They are emitted as-is.

### Single Subpath

If the input contains only one subpath (one `M` command), it's returned unchanged — no analysis is performed.

### Idempotency

Re-splitting an already-split region typically produces the same result. In rare edge cases involving boundary-touching polygons, containment sampling may produce slightly different groupings on re-split. This has been observed in practice with one icon (PostgreSQL from simple-icons) and is documented in the test suite.

## Algorithm Complexity

| Step                    | Complexity                                               |
| ----------------------- | -------------------------------------------------------- |
| Parsing & splitting     | O(n) where n = number of commands                        |
| Flattening              | O(n × s) where s = sampling steps per curve (default 64) |
| Area & bbox computation | O(p) where p = total flattened points                    |
| Containment tree        | O(k² × p) where k = number of subpaths                   |
| Grouping                | O(k)                                                     |

For typical SVG icons with a few dozen subpaths, the entire operation completes in under a millisecond.

## Development

```sh
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Lint
pnpm lint

# Format
pnpm format

# Build
pnpm build
```

### Test Suite

The test suite includes:

- **Geometry unit tests** — signed area, bounding box, point-in-polygon, polygon containment
- **Flattening tests** — all SVG command types (M, L, H, V, C, S, Q, T, A, Z)
- **SplitPath behavior tests** — single shapes, non-overlapping shapes, nested containment, even-odd vs nonzero, interleaved ordering, curved paths, edge cases, idempotency
- **Real-world integration tests** — dozens of icons from [simple-icons](https://github.com/simple-icons/simple-icons) validating correct splitting on complex production paths

## License

[MIT](LICENSE)
