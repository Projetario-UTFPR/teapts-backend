export abstract class HashComparator {
  /**
   * Checks whether `plainText` is the actual content of `hash` hashed string.
   *
   * @param plainText O texto que se deseja validar.
   * @param hash O hash criptografado para comparação.
   * @returns `true` se forem correspondentes, `false` caso contrário.
   */
  public abstract compare(plainText: string, hash: string): Promise<boolean>;
}
