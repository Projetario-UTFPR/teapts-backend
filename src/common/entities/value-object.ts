export abstract class ValueObject {
  public equals(other: ValueObject) {
    if (!(other instanceof this.constructor)) return false;

    for (const [key, value] of Object.entries(this)) {
      const hasEquivalentKey = Object.hasOwn(other, key) && other[key] === value;
      if (!hasEquivalentKey) return false;
    }

    return true;
  }
}
