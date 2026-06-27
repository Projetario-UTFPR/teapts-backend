import { Account } from "@/modules/identity/entities/account.aggregate";
import { AccountRole, Prisma } from "@prisma-gen/client";

type RawAccount = Prisma.AccountModel & { professionalProfiles: { id: string }[] };

function roleIntoPrisma(role: Account.Role): AccountRole {
  switch (role) {
    case Account.Role.Admin:
      return AccountRole.Admin;
    case Account.Role.User:
      return AccountRole.User;
  }
}

function roleFromPrisma(role: AccountRole): Account.Role {
  switch (role) {
    case "Admin":
      return Account.Role.Admin;
    case "User":
      return Account.Role.User;
  }
}

function intoPrisma(account: Account): Prisma.AccountCreateArgs["data"] {
  return {
    id: account.getId().toString(),
    email: account.getEmail(),
    name: account.getName(),
    passwordHash: account.getPasswordHash(),
    lastUpdatedAt: account.getLastUpdatedAt(),
    createdAt: account.getCreatedAt(),
    role: roleIntoPrisma(account.getRole()),
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
    role: roleFromPrisma(raw.role),
  });
}

export default { intoPrisma, fromPrisma, roleIntoPrisma, roleFromPrisma };
