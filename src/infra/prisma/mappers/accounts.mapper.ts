import { Account } from "@/modules/identity/entities/account.aggregate";
import { Prisma } from "@prisma-gen/client";

type RawAccount = Prisma.AccountModel & { professionalProfiles: { id: string }[] };

function intoPrisma(account: Account): Prisma.AccountCreateArgs["data"] {
  return {
    id: account.getId().toString(),
    email: account.getEmail(),
    name: account.getName(),
    passwordHash: account.getPasswordHash(),
    lastUpdatedAt: account.getLastUpdatedAt(),
    createdAt: account.getCreatedAt(),
  };
}

function fromPrisma(raw: RawAccount) {
  return Account.createUnchecked({
    id: raw.id,
    name: raw.name,
    email: raw.email,
    passwordHash: raw.passwordHash,
    lastUpdatedAt: raw.lastUpdatedAt ?? undefined,
    createdAt: raw.createdAt,
    professionalProfilesIds: raw.professionalProfiles.map((profile) => profile.id),
  });
}

export default { intoPrisma, fromPrisma };
