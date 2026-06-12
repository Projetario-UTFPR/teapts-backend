import { Equals } from "@/common/interfaces/equals";
import { isDeepStrictEqual } from "node:util";

export abstract class ValueObject implements Equals {
  public equals(other: ValueObject) {
    if (this === other) return true;
    if (!(other instanceof this.constructor)) return false;
    return isDeepStrictEqual(this, other);
  }
}
