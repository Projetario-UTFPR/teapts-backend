import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { PaginationParams } from "@/common/pagination/pagination-params";
import paginationUtils from "@/common/pagination/pagination-utils";
import { PrismaService } from "@/infra/prisma/prisma";
import { Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { UUID } from "@/common/uuid";
import { PatientFindManyArgs } from "@prisma-gen/models";
import { PatientWithAccountPresenter } from "@/modules/patient/presenters/prisma-patient-with-account.presenter";
import { PaginatedPatientsPresenter } from "@/modules/patient/presenters/paginated-patients.presenter";

export type Params = PaginationParams & {
  professionalAccountId: UUID;
};

@Injectable()
export class ListPatientsByProfessionalAccountQueryHandler {
  public constructor(private readonly prisma: PrismaService) {}

  public execute({ limit, page, professionalAccountId }: Params) {
    const { offset, resolvedPage, resolvedLimit } = paginationUtils.resolveOffset({ page, limit });

    let where: PatientFindManyArgs["where"] = {
      projetosTerapeuticosSingulares: {
        some: {
          AND: [
            { status: { in: ["Running", "Planning"] } },
            {
              OR: [
                { responsibleProfessional: { accountId: professionalAccountId.toString() } },
                {
                  multidisciplinaryTeam: {
                    some: { professional: { accountId: professionalAccountId.toString() } },
                  },
                },
              ],
            },
          ],
        },
      },
    };

    return pipe(
      te.Do,
      te.bindW("patients", () => this.fetchPatients({ where, limit, offset })),
      te.bindW("count", () => this.countPatients({ where })),
      te.let("presentedPatients", ({ patients }) =>
        patients.map(PatientWithAccountPresenter.present),
      ),
      te.map(({ count, presentedPatients }) =>
        PaginatedPatientsPresenter.present({
          items: presentedPatients,
          count: count,
          currentPage: resolvedPage,
          resolvedLimit,
        }),
      ),
    )();
  }

  private fetchPatients({
    limit,
    where,
    offset,
  }: Pick<Params, "limit"> & {
    where: PatientFindManyArgs["where"];
    offset: number;
  }) {
    return pipe(
      te.tryCatch(
        () =>
          this.prisma.patient.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy: [{ account: { createdAt: "desc" } }, { account: { id: "desc" } }],
            include: { account: true },
          }),
        (error) =>
          new IrrecoverableError({
            message: `Unexpected error occurred in ${ListPatientsByProfessionalAccountQueryHandler.name} when fetching patients.`,
            cause: error as Error,
          }),
      ),
    );
  }

  private countPatients({ where }: { where: PatientFindManyArgs["where"] }) {
    return pipe(
      te.tryCatch(
        () => this.prisma.patient.count({ where }),
        (error) =>
          new IrrecoverableError({
            message: `Unexpected error occurred in ${ListPatientsByProfessionalAccountQueryHandler.name} when counting patients.`,
            cause: error as Error,
          }),
      ),
    );
  }
}
