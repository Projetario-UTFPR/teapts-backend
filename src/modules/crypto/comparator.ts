export abstract class HashComparator {
  /**
   * Checks whether `plainText` is the actual content of `hash` hashed string.
   *
   * @param plainText the plain text to be verified
   * @param hash the supposed hash to check `plainText` against
   * @returns `true` when `plainText` can originate `hash`, `false` otherwise.
   */
  public abstract compare(plainText: string, hash: string): Promise<boolean>;
}
