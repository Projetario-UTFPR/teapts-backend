import professionalMapper from "@/infra/prisma/mappers/professionals.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { Professional } from "@/modules/professional/entities/professional.aggregate";
import { faker } from "@faker-js/faker";
import accountsFactory from "@test/factories/accounts.factory";
import { resolveAccount } from "@test/factories/utils";
import { taskEither } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

type Params = Omit<Partial<Professional.Props>, "accountId"> & { account?: Account };

async function create({ account, specialism }: Params = {}) {
  account ??= await accountsFactory.create();

  const index = faker.number.int({
    min: 0,
    max: Object.values(Professional.Specialism).length - 1,
  });

  specialism ??= Object.values(Professional.Specialism)[index];

  const professional = Professional.create({ accountId: account.getId(), specialism });
  account.pushProfessionalProfile(professional);
  return professional;
}

async function createAndPersist(prismaService: PrismaService, params?: Params) {
  const account = await resolveAccount(prismaService, params?.account);
  return await pipe(
    taskEither.fromTask(() => create({ ...params, account })),
    taskEither.map(professionalMapper.intoPrisma),
    taskEither.chain((data) =>
      taskEither.fromTask(() => prismaService.professional.create({ data })),
    ),
    taskEither.map(professionalMapper.fromPrisma),
    // we don't really care atp, it's just for testing purposes, if it fails, it means there is a problem
    // in the test... just go fix it
    taskEither.getOrElse((error) => error),
  )();
}

export default { create, createAndPersist };
