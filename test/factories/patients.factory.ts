import { generateUUID } from "@/common/uuid";
import patientsMapper from "@/infra/prisma/mappers/patients.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import { Patient } from "@/modules/patient/entities/patient.entity";
import { resolveAccount } from "@test/factories/utils";
import { taskEither } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

type Params = Partial<Patient.Props>;

async function create({ accountId = generateUUID(), supportContacts = [] }: Params = {}) {
  return Patient.create({ accountId, supportContacts });
}

async function createAndPersist(prismaService: PrismaService, params?: Params) {
  let account = await resolveAccount(prismaService, params?.accountId);

  return await pipe(
    () => create({ ...params, accountId: account.getId() }),
    taskEither.map(patientsMapper.intoPrisma),
    taskEither.chain((data) => taskEither.fromTask(() => prismaService.patient.create({ data }))),
    taskEither.map(patientsMapper.fromPrisma),
    taskEither.getOrElse((error) => error),
  )();
}

export default { create, createAndPersist };
