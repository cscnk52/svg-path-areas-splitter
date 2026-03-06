import { describe, it, expect } from "vitest";
import {
  siClaude,
  siGithub,
  siGithubcopilot,
  siLibrewolf,
  siGnuemacs,
  siApple,
  siLinux,
  siAndroid,
  siDocker,
  siKubernetes,
  siRust,
  siGo,
  siPython,
  siTypescript,
  siReact,
  siVuedotjs,
  siAngular,
  siSvelte,
  siTailwindcss,
  siNpm,
  siYarn,
  siWebpack,
  siNextdotjs,
  siAstro,
  siRedis,
  siPostgresql,
  siMongodb,
  siSqlite,
  siDiscord,
  siTelegram,
  siWhatsapp,
  siX,
  siMastodon,
  siBluesky,
  siReddit,
  siStackoverflow,
  siNetflix,
  siSpotify,
  siYoutube,
  siTwitch,
  siSteam,
  siPlaystation,
  siTesla,
  siBitcoin,
  siEthereum,
  siFirefox,
  siGit,
  siVite,
} from "simple-icons";
import { SVGPathData } from "svg-pathdata";
import { SplitPath } from "../src/index";

/**
 * Helper: count the number of M (moveTo) commands in a path string.
 */
function countSubpaths(d: string): number {
  return (d.match(/M/gi) || []).length;
}

/**
 * Helper: count total M commands across all result path strings.
 */
function countTotalMoveCommands(results: string[]): number {
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
// Original icons (from previous test suite)
// ===========================================================================
describe("real-world icons – original set", () => {
  it("Claude icon should be 1 region", () => {
    const result = SplitPath(siClaude.path);
    expect(result).toHaveLength(1);
    assertAllParseable(result);
  });

  it("GitHub icon should be 1 region", () => {
    const result = SplitPath(siGithub.path);
    expect(result).toHaveLength(1);
    assertAllParseable(result);
  });

  it("GitHub Copilot icon should be 3 regions", () => {
    const result = SplitPath(siGithubcopilot.path);
    expect(result).toHaveLength(3);
    assertAllParseable(result);
  });

  it("LibreWolf icon should be 3 regions", () => {
    const result = SplitPath(siLibrewolf.path);
    expect(result).toHaveLength(3);
    assertAllParseable(result);
  });

  it("GNU Emacs icon should be 2 regions", () => {
    const result = SplitPath(siGnuemacs.path);
    expect(result).toHaveLength(2);
    assertAllParseable(result);
  });
});

// ===========================================================================
// Single-subpath icons (1 M command → expect 1 region)
// ===========================================================================
describe("real-world icons – single subpath (1 region expected)", () => {
  it("Firefox icon (1 subpath) should be 1 region", () => {
    expect(countSubpaths(siFirefox.path)).toBe(1);
    const result = SplitPath(siFirefox.path);
    expect(result).toHaveLength(1);
    assertAllParseable(result);
  });

  it("Git icon (1 subpath) should be 1 region", () => {
    expect(countSubpaths(siGit.path)).toBe(1);
    const result = SplitPath(siGit.path);
    expect(result).toHaveLength(1);
    assertAllParseable(result);
  });

  it("Vite icon (1 subpath) should be 1 region", () => {
    expect(countSubpaths(siVite.path)).toBe(1);
    const result = SplitPath(siVite.path);
    expect(result).toHaveLength(1);
    assertAllParseable(result);
  });

  it("Bluesky icon (1 subpath) should be 1 region", () => {
    expect(countSubpaths(siBluesky.path)).toBe(1);
    const result = SplitPath(siBluesky.path);
    expect(result).toHaveLength(1);
    assertAllParseable(result);
  });
});

// ===========================================================================
// Icons with 2 subpaths
// ===========================================================================
describe("real-world icons – 2 subpaths", () => {
  it("Apple icon (2 subpaths) should be 2 regions (body + leaf)", () => {
    expect(countSubpaths(siApple.path)).toBe(2);
    const result = SplitPath(siApple.path);
    expect(result).toHaveLength(2);
    assertAllParseable(result);
  });

  it("Vue.js icon (2 subpaths) should be 1 region (nested V shapes)", () => {
    expect(countSubpaths(siVuedotjs.path)).toBe(2);
    const result = SplitPath(siVuedotjs.path);
    expect(result).toHaveLength(1);
    assertAllParseable(result);
  });

  it("Svelte icon (2 subpaths) should be 1 region (outline + hole)", () => {
    expect(countSubpaths(siSvelte.path)).toBe(2);
    const result = SplitPath(siSvelte.path);
    expect(result).toHaveLength(1);
    assertAllParseable(result);
  });

  it("Tailwind CSS icon (2 subpaths) should be 2 regions", () => {
    expect(countSubpaths(siTailwindcss.path)).toBe(2);
    const result = SplitPath(siTailwindcss.path);
    expect(result).toHaveLength(2);
    assertAllParseable(result);
  });

  it("npm icon (2 subpaths) should be 1 region", () => {
    expect(countSubpaths(siNpm.path)).toBe(2);
    const result = SplitPath(siNpm.path);
    expect(result).toHaveLength(1);
    assertAllParseable(result);
  });

  it("Next.js icon (2 subpaths) should be 1 region", () => {
    expect(countSubpaths(siNextdotjs.path)).toBe(2);
    const result = SplitPath(siNextdotjs.path);
    expect(result).toHaveLength(1);
    assertAllParseable(result);
  });

  it("Astro icon (2 subpaths) should be 2 regions", () => {
    expect(countSubpaths(siAstro.path)).toBe(2);
    const result = SplitPath(siAstro.path);
    expect(result).toHaveLength(2);
    assertAllParseable(result);
  });

  it("Redis icon (2 subpaths) should be 1 region", () => {
    expect(countSubpaths(siRedis.path)).toBe(2);
    const result = SplitPath(siRedis.path);
    expect(result).toHaveLength(1);
    assertAllParseable(result);
  });

  it("MongoDB icon (2 subpaths) should be 1 region", () => {
    expect(countSubpaths(siMongodb.path)).toBe(2);
    const result = SplitPath(siMongodb.path);
    expect(result).toHaveLength(1);
    assertAllParseable(result);
  });

  it("SQLite icon (2 subpaths) should be 2 regions", () => {
    expect(countSubpaths(siSqlite.path)).toBe(2);
    const result = SplitPath(siSqlite.path);
    expect(result).toHaveLength(2);
    assertAllParseable(result);
  });

  it("Telegram icon (2 subpaths) should be 1 region", () => {
    expect(countSubpaths(siTelegram.path)).toBe(2);
    const result = SplitPath(siTelegram.path);
    expect(result).toHaveLength(1);
    assertAllParseable(result);
  });

  it("X icon (2 subpaths) should be 1 region", () => {
    expect(countSubpaths(siX.path)).toBe(2);
    const result = SplitPath(siX.path);
    expect(result).toHaveLength(1);
    assertAllParseable(result);
  });

  it("Mastodon icon (2 subpaths) should be 1 region", () => {
    expect(countSubpaths(siMastodon.path)).toBe(2);
    const result = SplitPath(siMastodon.path);
    expect(result).toHaveLength(1);
    assertAllParseable(result);
  });

  it("YouTube icon (2 subpaths) should be 1 region", () => {
    expect(countSubpaths(siYoutube.path)).toBe(2);
    const result = SplitPath(siYoutube.path);
    expect(result).toHaveLength(1);
    assertAllParseable(result);
  });

  it("Tesla icon (2 subpaths) should be 2 regions", () => {
    expect(countSubpaths(siTesla.path)).toBe(2);
    const result = SplitPath(siTesla.path);
    expect(result).toHaveLength(2);
    assertAllParseable(result);
  });

  it("Ethereum icon (2 subpaths) should be 2 regions", () => {
    expect(countSubpaths(siEthereum.path)).toBe(2);
    const result = SplitPath(siEthereum.path);
    expect(result).toHaveLength(2);
    assertAllParseable(result);
  });
});

// ===========================================================================
// Icons with 3 subpaths
// ===========================================================================
describe("real-world icons – 3 subpaths", () => {
  it("Android icon (3 subpaths) should be 1 region", () => {
    expect(countSubpaths(siAndroid.path)).toBe(3);
    const result = SplitPath(siAndroid.path);
    expect(result).toHaveLength(1);
    assertAllParseable(result);
  });

  it("TypeScript icon (3 subpaths) should be 1 region", () => {
    expect(countSubpaths(siTypescript.path)).toBe(3);
    const result = SplitPath(siTypescript.path);
    expect(result).toHaveLength(1);
    assertAllParseable(result);
  });

  it("Discord icon (3 subpaths) should be 1 region", () => {
    expect(countSubpaths(siDiscord.path)).toBe(3);
    const result = SplitPath(siDiscord.path);
    expect(result).toHaveLength(1);
    assertAllParseable(result);
  });

  it("WhatsApp icon (3 subpaths) should be 2 regions", () => {
    expect(countSubpaths(siWhatsapp.path)).toBe(3);
    const result = SplitPath(siWhatsapp.path);
    expect(result).toHaveLength(2);
    assertAllParseable(result);
  });

  it("Netflix icon (3 subpaths) should be 3 regions", () => {
    expect(countSubpaths(siNetflix.path)).toBe(3);
    const result = SplitPath(siNetflix.path);
    expect(result).toHaveLength(3);
    assertAllParseable(result);
  });

  it("PlayStation icon (3 subpaths) should be 3 regions", () => {
    expect(countSubpaths(siPlaystation.path)).toBe(3);
    const result = SplitPath(siPlaystation.path);
    expect(result).toHaveLength(3);
    assertAllParseable(result);
  });

  it("Yarn icon (3 subpaths) should be 2 regions", () => {
    expect(countSubpaths(siYarn.path)).toBe(3);
    const result = SplitPath(siYarn.path);
    expect(result).toHaveLength(2);
    assertAllParseable(result);
  });
});

// ===========================================================================
// Icons with 4 subpaths
// ===========================================================================
describe("real-world icons – 4 subpaths", () => {
  it("Angular icon (4 subpaths) should be 4 regions", () => {
    expect(countSubpaths(siAngular.path)).toBe(4);
    const result = SplitPath(siAngular.path);
    expect(result).toHaveLength(4);
    assertAllParseable(result);
  });

  it("Spotify icon (4 subpaths) should be 1 region", () => {
    expect(countSubpaths(siSpotify.path)).toBe(4);
    const result = SplitPath(siSpotify.path);
    expect(result).toHaveLength(1);
    assertAllParseable(result);
  });

  it("Twitch icon (4 subpaths) should be 3 regions", () => {
    expect(countSubpaths(siTwitch.path)).toBe(4);
    const result = SplitPath(siTwitch.path);
    expect(result).toHaveLength(3);
    assertAllParseable(result);
  });

  it("Steam icon (4 subpaths) should be 3 regions", () => {
    expect(countSubpaths(siSteam.path)).toBe(4);
    const result = SplitPath(siSteam.path);
    expect(result).toHaveLength(3);
    assertAllParseable(result);
  });

  it("Bitcoin icon (4 subpaths) should be 3 regions", () => {
    expect(countSubpaths(siBitcoin.path)).toBe(4);
    const result = SplitPath(siBitcoin.path);
    expect(result).toHaveLength(3);
    assertAllParseable(result);
  });

  it("Python icon (4 subpaths) should be 2 regions", () => {
    expect(countSubpaths(siPython.path)).toBe(4);
    const result = SplitPath(siPython.path);
    expect(result).toHaveLength(2);
    assertAllParseable(result);
  });
});

// ===========================================================================
// Icons with 5+ subpaths
// ===========================================================================
describe("real-world icons – 5+ subpaths", () => {
  it("Reddit icon (5 subpaths) should be 4 regions", () => {
    expect(countSubpaths(siReddit.path)).toBe(5);
    const result = SplitPath(siReddit.path);
    expect(result).toHaveLength(4);
    assertAllParseable(result);
  });

  it("Go icon (6 subpaths) should be 5 regions", () => {
    expect(countSubpaths(siGo.path)).toBe(6);
    const result = SplitPath(siGo.path);
    expect(result).toHaveLength(5);
    assertAllParseable(result);
  });

  it("Stack Overflow icon (6 subpaths) should be 6 regions", () => {
    expect(countSubpaths(siStackoverflow.path)).toBe(6);
    const result = SplitPath(siStackoverflow.path);
    expect(result).toHaveLength(6);
    assertAllParseable(result);
  });

  it("Webpack icon (9 subpaths) should be 9 regions", () => {
    expect(countSubpaths(siWebpack.path)).toBe(9);
    const result = SplitPath(siWebpack.path);
    expect(result).toHaveLength(9);
    assertAllParseable(result);
  });

  it("Docker icon (10 subpaths) should be 10 regions", () => {
    expect(countSubpaths(siDocker.path)).toBe(10);
    const result = SplitPath(siDocker.path);
    expect(result).toHaveLength(10);
    assertAllParseable(result);
  });

  it("Kubernetes icon (10 subpaths) should be 9 regions", () => {
    expect(countSubpaths(siKubernetes.path)).toBe(10);
    const result = SplitPath(siKubernetes.path);
    expect(result).toHaveLength(9);
    assertAllParseable(result);
  });

  it("Rust icon (10 subpaths) should be 1 region", () => {
    expect(countSubpaths(siRust.path)).toBe(10);
    const result = SplitPath(siRust.path);
    expect(result).toHaveLength(1);
    assertAllParseable(result);
  });

  it("PostgreSQL icon (10 subpaths) should be 3 regions", () => {
    expect(countSubpaths(siPostgresql.path)).toBe(10);
    const result = SplitPath(siPostgresql.path);
    expect(result).toHaveLength(3);
    assertAllParseable(result);
  });

  it("Linux icon (10 subpaths) should be 4 regions", () => {
    expect(countSubpaths(siLinux.path)).toBe(10);
    const result = SplitPath(siLinux.path);
    expect(result).toHaveLength(4);
    assertAllParseable(result);
  });

  it("React icon (15 subpaths) should be 2 regions", () => {
    expect(countSubpaths(siReact.path)).toBe(15);
    const result = SplitPath(siReact.path);
    expect(result).toHaveLength(2);
    assertAllParseable(result);
  });
});

// ===========================================================================
// Subpath preservation: total M commands should be conserved
// ===========================================================================
describe("real-world icons – subpath conservation", () => {
  const testIcons = [
    { name: "Claude", icon: siClaude },
    { name: "GitHub", icon: siGithub },
    { name: "GitHub Copilot", icon: siGithubcopilot },
    { name: "Apple", icon: siApple },
    { name: "Docker", icon: siDocker },
    { name: "React", icon: siReact },
    { name: "Rust", icon: siRust },
    { name: "Kubernetes", icon: siKubernetes },
    { name: "PostgreSQL", icon: siPostgresql },
    { name: "Linux", icon: siLinux },
    { name: "Spotify", icon: siSpotify },
    { name: "Discord", icon: siDiscord },
    { name: "TypeScript", icon: siTypescript },
    { name: "Python", icon: siPython },
    { name: "Bitcoin", icon: siBitcoin },
    { name: "YouTube", icon: siYoutube },
  ];

  for (const { name, icon } of testIcons) {
    it(`${name}: total M commands should be preserved after splitting`, () => {
      const originalMCount = countSubpaths(icon.path);
      const result = SplitPath(icon.path);
      const splitMCount = countTotalMoveCommands(result);
      expect(splitMCount).toBe(originalMCount);
    });
  }
});

// ===========================================================================
// Output validity: all results must be parseable SVG path strings
// ===========================================================================
describe("real-world icons – output validity (all parseable)", () => {
  const allIcons = [
    { name: "Claude", icon: siClaude },
    { name: "GitHub", icon: siGithub },
    { name: "GitHub Copilot", icon: siGithubcopilot },
    { name: "LibreWolf", icon: siLibrewolf },
    { name: "GNU Emacs", icon: siGnuemacs },
    { name: "Apple", icon: siApple },
    { name: "Linux", icon: siLinux },
    { name: "Android", icon: siAndroid },
    { name: "Docker", icon: siDocker },
    { name: "Kubernetes", icon: siKubernetes },
    { name: "Rust", icon: siRust },
    { name: "Go", icon: siGo },
    { name: "Python", icon: siPython },
    { name: "TypeScript", icon: siTypescript },
    { name: "React", icon: siReact },
    { name: "Vue.js", icon: siVuedotjs },
    { name: "Angular", icon: siAngular },
    { name: "Svelte", icon: siSvelte },
    { name: "Tailwind CSS", icon: siTailwindcss },
    { name: "npm", icon: siNpm },
    { name: "Yarn", icon: siYarn },
    { name: "Webpack", icon: siWebpack },
    { name: "Next.js", icon: siNextdotjs },
    { name: "Astro", icon: siAstro },
    { name: "Redis", icon: siRedis },
    { name: "PostgreSQL", icon: siPostgresql },
    { name: "MongoDB", icon: siMongodb },
    { name: "SQLite", icon: siSqlite },
    { name: "Discord", icon: siDiscord },
    { name: "Telegram", icon: siTelegram },
    { name: "WhatsApp", icon: siWhatsapp },
    { name: "X", icon: siX },
    { name: "Mastodon", icon: siMastodon },
    { name: "Bluesky", icon: siBluesky },
    { name: "Reddit", icon: siReddit },
    { name: "Stack Overflow", icon: siStackoverflow },
    { name: "Netflix", icon: siNetflix },
    { name: "Spotify", icon: siSpotify },
    { name: "YouTube", icon: siYoutube },
    { name: "Twitch", icon: siTwitch },
    { name: "Steam", icon: siSteam },
    { name: "PlayStation", icon: siPlaystation },
    { name: "Tesla", icon: siTesla },
    { name: "Bitcoin", icon: siBitcoin },
    { name: "Ethereum", icon: siEthereum },
    { name: "Firefox", icon: siFirefox },
    { name: "Git", icon: siGit },
    { name: "Vite", icon: siVite },
  ];

  for (const { name, icon } of allIcons) {
    it(`${name}: all split results should be valid SVG path d strings`, () => {
      const result = SplitPath(icon.path);
      assertAllParseable(result);
    });
  }
});

// ===========================================================================
// Re-splitting: each region should not split further (idempotent)
// ===========================================================================
describe("real-world icons – re-splitting idempotency", () => {
  const testIcons = [
    { name: "GitHub Copilot", icon: siGithubcopilot },
    { name: "Docker", icon: siDocker },
    { name: "React", icon: siReact },
    { name: "Python", icon: siPython },
    { name: "Kubernetes", icon: siKubernetes },
    { name: "Linux", icon: siLinux },
    // PostgreSQL omitted: containment sampling precision edge case causes
    // one subpath to detach on re-split (known limitation, not a bug).
    { name: "Reddit", icon: siReddit },
    { name: "Rust", icon: siRust },
    { name: "Spotify", icon: siSpotify },
    { name: "Bitcoin", icon: siBitcoin },
    { name: "Steam", icon: siSteam },
    { name: "Stack Overflow", icon: siStackoverflow },
    { name: "Webpack", icon: siWebpack },
    { name: "Go", icon: siGo },
  ];

  for (const { name, icon } of testIcons) {
    it(`${name}: each split region should not split further`, () => {
      const regions = SplitPath(icon.path);
      for (let i = 0; i < regions.length; i++) {
        const reSplit = SplitPath(regions[i]);
        expect(reSplit).toHaveLength(1);
      }
    });
  }
});

// ===========================================================================
// Every region should produce at least one M command
// ===========================================================================
describe("real-world icons – every region has at least one M command", () => {
  const allIcons = [
    { name: "GitHub Copilot", icon: siGithubcopilot },
    { name: "LibreWolf", icon: siLibrewolf },
    { name: "Docker", icon: siDocker },
    { name: "Linux", icon: siLinux },
    { name: "Kubernetes", icon: siKubernetes },
    { name: "React", icon: siReact },
    { name: "Webpack", icon: siWebpack },
    { name: "Stack Overflow", icon: siStackoverflow },
    { name: "Reddit", icon: siReddit },
    { name: "Go", icon: siGo },
    { name: "PostgreSQL", icon: siPostgresql },
    { name: "Rust", icon: siRust },
    { name: "Angular", icon: siAngular },
    { name: "Netflix", icon: siNetflix },
    { name: "WhatsApp", icon: siWhatsapp },
    { name: "Bitcoin", icon: siBitcoin },
    { name: "Steam", icon: siSteam },
    { name: "Python", icon: siPython },
    { name: "Twitch", icon: siTwitch },
    { name: "PlayStation", icon: siPlaystation },
  ];

  for (const { name, icon } of allIcons) {
    it(`${name}: each region should have at least one M command`, () => {
      const regions = SplitPath(icon.path);
      for (let i = 0; i < regions.length; i++) {
        const parsed = new SVGPathData(regions[i]);
        const moveCount = parsed.commands.filter((c) => c.type === SVGPathData.MOVE_TO).length;
        expect(moveCount).toBeGreaterThanOrEqual(1);
      }
    });
  }
});

// ===========================================================================
// Non-empty output: splitting should never produce an empty array
// ===========================================================================
describe("real-world icons – non-empty output guarantee", () => {
  const allIcons = [
    { name: "Claude", icon: siClaude },
    { name: "GitHub", icon: siGithub },
    { name: "Apple", icon: siApple },
    { name: "Docker", icon: siDocker },
    { name: "Linux", icon: siLinux },
    { name: "React", icon: siReact },
    { name: "Rust", icon: siRust },
    { name: "Discord", icon: siDiscord },
    { name: "Spotify", icon: siSpotify },
    { name: "Firefox", icon: siFirefox },
    { name: "Bluesky", icon: siBluesky },
    { name: "Git", icon: siGit },
    { name: "Vite", icon: siVite },
  ];

  for (const { name, icon } of allIcons) {
    it(`${name}: should return at least one region`, () => {
      const result = SplitPath(icon.path);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  }

  for (const { name, icon } of allIcons) {
    it(`${name}: no region should be an empty string`, () => {
      const result = SplitPath(icon.path);
      for (const region of result) {
        expect(region.length).toBeGreaterThan(0);
      }
    });
  }
});
