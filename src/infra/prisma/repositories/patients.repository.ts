import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { UUID } from "@/common/uuid";
import { PrismaSchemaForeignKey } from "@/infra/prisma/foreign-keys";
import patientsMapper from "@/infra/prisma/mappers/patients.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import { PrismaTransactionManager } from "@/infra/prisma/transaction-manager";
import { AccountNotFoundError } from "@/modules/identity/errors/account-not-found.error";
import { Patient } from "@/modules/patient/aggregates/patient.aggregate";
import { PatientsRepository } from "@/modules/patient/repositories/patients.repository";
import { Injectable } from "@nestjs/common";
import { PrismaClientKnownRequestError } from "@prisma-gen/internal/prismaNamespace";
import { taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";

@Injectable()
export class PrismaPatientsRepository extends PatientsRepository {
  public constructor(
    private readonly txManager: PrismaTransactionManager,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  public createProfile(
    patient: Patient,
  ): Promise<Either<IrrecoverableError | AccountNotFoundError, Patient>> {
    const client = this.txManager.getTx() ?? this.prisma;

    const payload = patientsMapper.intoPrisma(patient);

    return pipe(
      te.tryCatch(
        () =>
          client.patient.create({
            data: payload,
            select: { accountId: true, supportContacts: true },
          }),
        (error) => {
          if (isForeignKeyError(error) && getForeignKeyViolation(error) === "account") {
            return new AccountNotFoundError();
          }

          return new IrrecoverableError({
            message: `Error occurred in ${PrismaPatientsRepository.name} when creating a new patient profile.`,
            cause: error as Error,
          });
        },
      ),
      te.map(patientsMapper.fromPrisma),
    )();
  }

  public existsByAccountId(accountId: UUID): Promise<Either<IrrecoverableError, boolean>> {
    const client = this.txManager.getTx() ?? this.prisma;

    return pipe(
      te.tryCatch(
        () => client.patient.count({ where: { accountId: accountId.toString() } }),
        (error) =>
          new IrrecoverableError({
            message: `Error occurred in ${PrismaPatientsRepository.name} when checking if patient profile exists for account of ID "${accountId}".`,
            cause: error as Error,
          }),
      ),
      te.map((count) => count !== 0),
    )();
  }
}

function isForeignKeyError(error: unknown): error is PrismaClientKnownRequestError {
  return error instanceof PrismaClientKnownRequestError && error.code === "P2003";
}

function getForeignKeyViolation(error: PrismaClientKnownRequestError) {
  const exceprtContainingConstraint: string =
    error?.meta?.["driverAdapterError"]?.["cause"]?.constraint?.index ?? error.message;

  const patientAccountDoesntExist = exceprtContainingConstraint.includes(
    PrismaSchemaForeignKey.PatientAccountId,
  );

  if (patientAccountDoesntExist) return "account";

  return "other";
}
