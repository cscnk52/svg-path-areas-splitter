import { expectTypeOf, test } from "vitest";

import { type FillRule, split } from "@/index";

test("index test", () => {
  expectTypeOf(split).toBeFunction();
  expectTypeOf(split).parameters.toEqualTypeOf<[string, FillRule?]>();
  expectTypeOf(split).returns.toEqualTypeOf<string[]>();
  expectTypeOf<FillRule>().toEqualTypeOf<"nonzero" | "evenodd">();
});
