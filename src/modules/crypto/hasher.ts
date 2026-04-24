export abstract class Hasher {
  /**
   * Generates a hash from `plainText`.
   *
   * @param plainText the original content to be hashed
   * @returns the hash originated from `plainText`
   */
  public abstract hash(plainText: string): Promise<string>;
}
