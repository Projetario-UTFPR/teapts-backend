import { generateUUID } from "@/common/uuid";
import professionalMapper from "@/infra/prisma/mappers/professionals.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import { Professional } from "@/modules/professional/entities/professional.aggregate";
import { faker } from "@faker-js/faker";
import { resolveAccount } from "@test/factories/utils";
import { taskEither } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

type Params = Partial<Professional.Props>;

async function create({ accountId = generateUUID(), specialism }: Params = {}) {
  const index = faker.number.int({
    min: 0,
    max: Object.values(Professional.Specialism).length - 1,
  });

  specialism ??= Object.values(Professional.Specialism)[index];

  return Professional.create({ accountId, specialism });
}

async function createAndPersist(prismaService: PrismaService, params?: Params) {
  const account = await resolveAccount(prismaService, params?.accountId);
  return await pipe(
    taskEither.fromTask(() => create({ ...params, accountId: account.getId() })),
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
