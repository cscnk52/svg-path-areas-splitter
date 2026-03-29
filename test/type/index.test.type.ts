import { expectTypeOf } from "vitest";

import { type FillRule, split } from "@/index";

expectTypeOf(split).parameters.toEqualTypeOf<[string, FillRule?]>();
expectTypeOf(split).returns.toEqualTypeOf<string[]>();
expectTypeOf<FillRule>().toEqualTypeOf<"nonzero" | "evenodd">();
