import { Equals } from "@/common/interfaces/equals";

export class WatchedList<T extends Equals | string | number> {
  /**
   * The list must always compare its states against the initial values.
   * It might be updated more than once, and making the further comparisons
   * against the `current` would poison the list.
   */
  private initial: T[] = [];
  private current: T[] = [];
  private inserted: T[] = [];
  private removed: T[] = [];

  constructor(initValues: T[]) {
    this.initial = [...initValues];
    this.current = [...initValues];
  }

  /**
   * Compares `a` and `b` with the best equality method available.
   */
  private compare(a: T, b: T) {
    const acceptedPrimitiveTypes = ["string", "number"];
    if (acceptedPrimitiveTypes.includes(typeof a) && acceptedPrimitiveTypes.includes(typeof b)) {
      return a === b;
    }

    if (typeof a === "object") {
      if (!(b instanceof a.constructor)) return false;

      return a.equals(b);
    }

    /**
     * This is the only error we might ever throw because this class is a "primitive".
     * This is not a domain error, it's a programming level error and should be threaten
     * during development. This error is designed specifically for this kind of scenario.
     */
    throw new TypeError(
      "WatchedList received a argument of invalid type. The only " +
        "accepted types are strings, numbers and objects implementing Equals interface.",
    );
  }

  update(newValues: T[]): void {
    /**
     * We can't use `Set` here. NodeJS Sets hashes classes instances by reference,
     * thus two same objects will actually be threaten differently by being created
     * twice — once by the datastore repository, other by the controller, for
     * instance.
     *
     * As these lists are not supposed to be giant, a O(n^2) lookup is not that
     * harmful.
     */

    this.inserted = newValues.filter(
      (incomingItem) =>
        !this.initial.some((existingItem) => this.compare(incomingItem, existingItem)),
    );

    this.removed = this.initial.filter(
      (existingItem) => !newValues.some((incomingItem) => this.compare(incomingItem, existingItem)),
    );

    this.current = newValues;
  }

  getCurrent(): T[] {
    return this.current;
  }

  getInserted(): T[] {
    return this.inserted;
  }

  getRemoved(): T[] {
    return this.removed;
  }
}
