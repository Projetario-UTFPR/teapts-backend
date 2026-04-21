export abstract class Hasher {
  /**
   * Gera um hash seguro a partir de um texto puro.
   *
   * @param plainText O texto original a ser criptografado.
   * @returns Uma Promise contendo a string do hash gerado.
   */
  public abstract hash(plainText: string): Promise<string>;
}
