import { HashComparator } from "@/modules/crypto/comparator";
import { Hasher } from "@/modules/crypto/hasher";

const prefix = "__hashed__";

/**
 * A dead-simple mock implementation of `Hasher` and `HashComparator` interfaces.
 */
export class MockHasherAndComparator implements Hasher, HashComparator {
  public async compare(plainText: string, hash: string): Promise<boolean> {
    return hash.substring(prefix.length) === plainText;
  }

  public async hash(plainText: string): Promise<string> {
    return prefix + plainText;
  }
}
