import type { CommandH, SVGCommand, CommandV, CommandT, CommandS } from "svg-pathdata";

export type Point = {
  x: number;
  y: number;
};

export type ForceAbsolute<T> = T extends { relative: boolean }
  ? Omit<T, "relative"> & {
      relative: false;
    }
  : T;

export type NormalizeSVGCommand = ForceAbsolute<
  Exclude<SVGCommand, CommandH | CommandV | CommandT | CommandS>
>;

export type FillRule = "nonzero" | "evenodd";
