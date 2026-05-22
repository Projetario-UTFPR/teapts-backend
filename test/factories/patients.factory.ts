import { generateUUID } from "@/common/uuid";
import patientsMapper from "@/infra/prisma/mappers/patients.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import { Patient } from "@/modules/patient/entities/patient.entity";
import { resolveAccount } from "@test/factories/utils";
import { either, taskEither } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

type Params = Partial<Patient.Props>;

async function create({ accountId = generateUUID(), supportContacts = [] }: Params = {}) {
  return pipe(
    Patient.create({ accountId, supportContacts }),
    either.getOrElseW((error) => {
      throw error;
    }),
  );
}

async function createAndPersist(prismaService: PrismaService, params?: Params) {
  let account = await resolveAccount(prismaService, params?.accountId);
  const patient = await create({ ...params, accountId: account.getId() });

  return await pipe(
    taskEither.fromTask(() =>
      prismaService.patient.create({ data: patientsMapper.intoPrisma(patient) }),
    ),
    taskEither.map(patientsMapper.fromPrisma),
    taskEither.getOrElse((error) => error),
  )();
}

export default { create, createAndPersist };
