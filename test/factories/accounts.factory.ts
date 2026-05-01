import accountsMapper from "@/infra/prisma/mappers/accounts.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import { Hasher } from "@/modules/crypto/hasher";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { faker } from "@faker-js/faker";
import { MockHasherAndComparator } from "@test/mocks/crypto/mock-hasher-and-comparator";
import { randomBytes } from "crypto";

type BaseOptions = {
  hasher?: Hasher;
};

type Params = Partial<Account.Props>;

async function create(
  { email = faker.internet.email(), name = faker.person.fullName(), passwordHash }: Params = {},
  { hasher = new MockHasherAndComparator() }: BaseOptions = {},
) {
  return Account.create({
    email,
    name,
    passwordHash: passwordHash ?? (await hasher.hash(randomBytes(30).toString())),
    professionalProfilesIds: [],
  });
}

async function createAndPersist(
  prismaService: PrismaService,
  params?: Params,
  options?: BaseOptions,
) {
  const account = await create(params, options);
  const data = accountsMapper.intoPrisma(account);

  const rawData = await prismaService.account.create({
    data,
    include: { professionalProfiles: { select: { id: true } } },
  });

  return accountsMapper.fromPrisma(rawData);
}

export default { create, createAndPersist };
