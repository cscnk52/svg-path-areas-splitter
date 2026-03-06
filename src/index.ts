import { type SVGCommand } from "svg-pathdata";
import { flatten } from "@/flatten";
import { Point } from "@/types";

class SubPath {
  readonly commands: SVGCommand[];

  constructor(commands: SVGCommand[]) {
    this.commands = commands;
  }

  get points(): Array<Point> {
    return flatten(this.commands);
  }
}
