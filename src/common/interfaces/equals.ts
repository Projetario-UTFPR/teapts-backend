/**
 * Classes implementing {@link Equals `Equals`} can be compared against
 * other instances of itself by specific logics. This is useful for
 * comparisons by value — since classes are, by default, only compared
 * by their instances references.
 */
export interface Equals {
  /**
   * Compares itself against `other`.
   */
  equals(other: unknown): boolean;
}
