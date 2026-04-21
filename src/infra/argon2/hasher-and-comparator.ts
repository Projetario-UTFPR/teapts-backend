/**
 * TODO: allow `parallelism`, `memoryCost` and `timeCost` to be
 * defined through environment variables.
 *
 * See: https://github.com/ranisalt/node-argon2/wiki/Options
 */

import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";
import { HashComparator } from "@/modules/crypto/comparator";
import { Hasher } from "@/modules/crypto/hasher";

@Injectable()
export class Argon2HasherAndComparator implements Hasher, HashComparator {
  public async compare(plainText: string, hash: string): Promise<boolean> {
    return await argon2.verify(hash, plainText);
  }

  public async hash(plainText: string): Promise<string> {
    return await argon2.hash(plainText, {
      memoryCost: 0x4000, // 16MiB
      parallelism: 2,
    });
  }
}
