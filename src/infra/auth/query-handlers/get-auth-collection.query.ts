import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { UnauthorizedError } from "@/common/errors/unauthorized.error";
import type { UUID } from "@/common/uuid";
import { AuthCollection } from "@/infra/auth/auth-collection";
import patientsMapper from "@/infra/prisma/mappers/patients.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import { AccountsRepository } from "@/modules/identity/repositories/accounts.repository";
import { ProfessionalsRepository } from "@/modules/professional/professionals.repository";
import { Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

type Params = {
  accountId: UUID;
};

@Injectable()
export class GetAuthCollectionQueryHandler {
  public constructor(
    private readonly accountsRepository: AccountsRepository,
    private readonly professionalsRepository: ProfessionalsRepository,
    private readonly prisma: PrismaService,
  ) {}

  public execute({ accountId }: Params) {
    return pipe(
      te.Do,
      te.apS("account", () => this.accountsRepository.findAccountById(accountId)),
      te.bindW(
        "professionalProfiles",
        ({ account }) =>
          () =>
            this.professionalsRepository.findManyByIds(account.getProfessionalIds()),
      ),
      te.bindW("patientProfile", () => this.findPatientProfile(accountId)),
      te.map(
        ({ account, professionalProfiles, patientProfile }) =>
          new AuthCollection(account, professionalProfiles, patientProfile),
      ),
      te.mapLeft((error) => {
        if (error instanceof IrrecoverableError) return error;
        return new UnauthorizedError();
      }),
    )();
  }

  private findPatientProfile(accountId: UUID) {
    return pipe(
      te.tryCatch(
        () =>
          this.prisma.patient.findFirst({
            where: { accountId: accountId.toString() },
            select: { supportContacts: true, accountId: true },
          }),
        (error) =>
          new IrrecoverableError({
            message: `Error occurred in ${GetAuthCollectionQueryHandler.name} when trying to find the account's associated patient profile.`,
            cause: error as Error,
          }),
      ),
      te.map((row) => (row ? patientsMapper.fromPrisma(row) : undefined)),
    );
  }
}
