import { split } from "@/index";
import { describe, it, expect } from "vitest";

describe("self draw shape", () => {
  describe("just icon", () => {
    it("should return original string", () => {
      const just =
        "M12 0A12 12 0 0012 24 12 12 0 0012 0m0 2.35a3.25 3.35 0 013.25 3.35A3.25 3.35 0 0112 9.05 3.25 3.35 0 018.75 5.7 3.25 3.35 0 0112 2.35m0 12.6a3.25 3.35 0 013.25 3.35A3.25 3.35 0 0112 21.65a3.25 3.35 0 01-3.25-3.35A3.25 3.35 0 0112 14.95";

      expect(split(just)).toEqual([just]);
    });
  });
});
