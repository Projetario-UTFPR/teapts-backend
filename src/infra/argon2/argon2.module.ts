import { Global, Module } from "@nestjs/common";
import { Argon2HasherAndComparator } from "./hasher-and-comparator";
import { Hasher } from "@/modules/crypto/hasher";
import { HashComparator } from "@/modules/crypto/comparator";

@Global()
@Module({
  providers: [
    { provide: Hasher, useClass: Argon2HasherAndComparator },
    { provide: HashComparator, useClass: Argon2HasherAndComparator },
  ],
  exports: [Hasher, HashComparator],
})
export class Argon2Module {}
