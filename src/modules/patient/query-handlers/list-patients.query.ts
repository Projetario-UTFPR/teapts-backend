import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { PaginationParams } from "@/common/pagination/pagination-params";
import paginationUtils from "@/common/pagination/pagination-utils";
import { PrismaService } from "@/infra/prisma/prisma";
import { Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { UUID } from "@/common/uuid";
import { PatientFindManyArgs, ProjetoTerapeuticoSingularFindManyArgs } from "@prisma-gen/models";
import { PatientWithAccountPresenter } from "@/modules/patient/presenters/prisma-patient-with-account.presenter";
import { PaginatedPatientsPresenter } from "@/modules/patient/presenters/paginated-patients.presenter";

export type Params = PaginationParams & {
  /**
   * When present, list only those whom own a PTS that
   * has the identified professional as responsible or
   * as multidisciplinary team member.
   */
  professionalAccountId?: UUID;
  /**
   * When present, list only those with (any) or without (any) active PTS.
   */
  withActivePts?: boolean;
};

@Injectable()
export class ListPatientsQueryHandler {
  public constructor(private readonly prisma: PrismaService) {}

  public execute({ limit, page, ...params }: Params) {
    const { offset, resolvedPage, resolvedLimit } = paginationUtils.resolveOffset({ page, limit });
    const where = this.resolveWhereClause(params);

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

  private resolveWhereClause({
    professionalAccountId,
    withActivePts,
  }: Omit<Params, "limit" | "page">) {
    const where: PatientFindManyArgs["where"] = {};
    const professionalId = professionalAccountId?.toString();

    const professionalFilter = professionalId
      ? ({
          OR: [
            { responsibleProfessional: { accountId: professionalId } },
            { multidisciplinaryTeam: { some: { professional: { accountId: professionalId } } } },
          ],
        } satisfies ProjetoTerapeuticoSingularFindManyArgs["where"])
      : undefined;

    const inActiveStatus = {
      status: { in: ["Running", "Planning"] },
    } satisfies ProjetoTerapeuticoSingularFindManyArgs["where"];

    if (withActivePts !== undefined) {
      if (withActivePts) {
        where.projetosTerapeuticosSingulares = {
          some: professionalFilter ? { AND: [professionalFilter, inActiveStatus] } : inActiveStatus,
        };
      } else {
        where.projetosTerapeuticosSingulares = {
          some: professionalFilter,
          none: inActiveStatus,
        };
      }
    } else if (professionalId) {
      where.projetosTerapeuticosSingulares = { some: professionalFilter };
    }

    return where;
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
            message: `Unexpected error occurred in ${ListPatientsQueryHandler.name} when fetching patients.`,
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
            message: `Unexpected error occurred in ${ListPatientsQueryHandler.name} when counting patients.`,
            cause: error as Error,
          }),
      ),
    );
  }
}
