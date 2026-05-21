import type { UUID } from "@/common/uuid";
import accountsMapper from "@/infra/prisma/mappers/accounts.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import accountsFactory from "@test/factories/accounts.factory";
// Used for the docstrings; removed during build since it's type import
// oxlint-disable-next-line no-unused-vars
import { type PrismaClientKnownRequestError } from "@prisma-gen/internal/prismaNamespace";
import professionalsFactory from "@test/factories/professionals.factory";
import professionalsMapper from "@/infra/prisma/mappers/professionals.mapper";
import patientsFactory from "@test/factories/patients.factory";
import patientsMapper from "@/infra/prisma/mappers/patients.mapper";

/**
 * Decides whether to create a new `Account` instance for the callee
 * or to fetch the account by the given `accountId`.
 *
 * @note must be used by test factories only.
 *
 * @throws a {@link PrismaClientKnownRequestError `PrismaClientKnownRequestError`} when there
 * is no persisted account with ID `accountId`.
 */
export async function resolveAccount(prismaService: PrismaService, accountId?: UUID) {
  if (!accountId) return await accountsFactory.createAndPersist(prismaService);

  const accountRow = await prismaService.account.findFirstOrThrow({
    where: { id: accountId.toString() },
    include: { professionalProfiles: true },
  });

  return accountsMapper.fromPrisma(accountRow);
}

/**
 * Decides whether to create a new `Professional` instance for the callee
 * or to fetch the existing one by `professionalId`.

 * @note must be used by test factories only.
 *
 * @throws a {@link PrismaClientKnownRequestError `PrismaClientKnownRequestError`} when there
 * is no persisted account with ID `accountId`.
 */
export async function resolveProfessional(prismaService: PrismaService, professionalId?: UUID) {
  if (!professionalId) return await professionalsFactory.createAndPersist(prismaService);

  const professional = await prismaService.professional.findFirstOrThrow({
    where: { id: professionalId.toString() },
    include: { account: true },
  });

  return professionalsMapper.fromPrisma(professional);
}

/**
 * Decides whether to create a new `Patient` for the callee or retrieve the
 * existing one by `patientId`.
 *
 * @note must be used by test factories only.
 *
 * @throws a {@link PrismaClientKnownRequestError `PrismaClientKnownRequestError`} when there
 * is no persisted account with ID `accountId`.
 */
export async function resolvePatient(prismaService: PrismaService, patientId?: UUID) {
  if (!patientId) return await patientsFactory.createAndPersist(prismaService);

  const patient = await prismaService.patient.findFirstOrThrow({
    where: { accountId: patientId.toString() },
    include: { account: true },
  });

  return patientsMapper.fromPrisma(patient);
}
