import { Injectable } from "@nestjs/common";
import { pipe } from "fp-ts/lib/function";
import { taskEither as te } from "fp-ts";
import { PrismaService } from "@/infra/prisma/prisma";
import { ProjetoTerapeuticoSingularFindManyArgs } from "@prisma-gen/models";
import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { PaginationParams } from "@/common/pagination/pagination-params";
import paginationUtils from "@/common/pagination/pagination-utils";
import { type UUID } from "@/common/uuid";
import { DraftPtsProposalPresenter } from "@/modules/therapeutic-journey/presenters/draft-pts-proposal.presenter";
import { PaginatedDraftPtsProposalsPresenter } from "@/modules/therapeutic-journey/presenters/paginated-draft-pts-proposals.presenter";

export type Params = PaginationParams & {
  patientId: UUID;
  responsibleProfessionalId?: UUID;
  professionalId?: UUID;
  draftedAfter?: Date;
  draftedBefore?: Date;
};

type TargetFindManyArgs = ProjetoTerapeuticoSingularFindManyArgs;

@Injectable()
export class ListDraftPtsProposalByPatientIdQueryHandler {
  public constructor(private readonly prisma: PrismaService) {}

  public execute({
    limit,
    page,
    patientId,
    responsibleProfessionalId,
    professionalId,
    draftedAfter: startDate,
    draftedBefore: endDate,
  }: Params) {
    const { offset, resolvedPage, resolvedLimit } = paginationUtils.resolveOffset({ page, limit });
    const where = this.resolveWhereClause({
      patientId,
      responsibleProfessionalId,
      professionalId,
      draftedAfter: startDate,
      draftedBefore: endDate,
    });

    return pipe(
      te.Do,
      te.apS("proposals", this.fetchDraftPtsProposals({ where, limit: resolvedLimit, offset })),
      te.apS("count", this.countTimelineRecords({ where })),
      te.map(({ count, proposals }) =>
        PaginatedDraftPtsProposalsPresenter.present({
          count,
          currentPage: resolvedPage,
          resolvedLimit,
          items: proposals.map(DraftPtsProposalPresenter.present),
        }),
      ),
    )();
  }

  private countTimelineRecords({ where }: { where: TargetFindManyArgs["where"] }) {
    return pipe(
      te.tryCatch(
        () => this.prisma.projetoTerapeuticoSingular.count({ where }),
        (error) =>
          new IrrecoverableError({
            message: `Unexpected error occurred in ${ListDraftPtsProposalByPatientIdQueryHandler.name} when counting timeline records.`,
            cause: error as Error,
          }),
      ),
    );
  }

  private fetchDraftPtsProposals({
    limit,
    where,
    offset,
  }: {
    limit: number;
    where: TargetFindManyArgs["where"];
    offset: number;
  }) {
    return pipe(
      te.tryCatch(
        () =>
          this.prisma.projetoTerapeuticoSingular.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            select: {
              id: true,
              createdAt: true,
              responsibleProfessional: {
                select: { id: true, specialism: true, account: { select: { name: true } } },
              },
              multidisciplinaryTeam: {
                select: {
                  professional: {
                    select: { id: true, specialism: true, account: { select: { name: true } } },
                  },
                },
              },
            },
          }),
        (error) =>
          new IrrecoverableError({
            message: `Unexpected error occurred in ${ListDraftPtsProposalByPatientIdQueryHandler.name} when fetching drafts PTS proposals.`,
            cause: error as Error,
          }),
      ),
    );
  }

  private resolveWhereClause({
    patientId,
    responsibleProfessionalId,
    professionalId,
    draftedAfter,
    draftedBefore,
  }: Omit<Params, "limit" | "page">) {
    let where: TargetFindManyArgs["where"] = { patientId: patientId.toString(), status: "Draft" };

    if (responsibleProfessionalId) {
      where.responsibleProfessionalId = responsibleProfessionalId.toString();
    }

    if (professionalId) {
      where.multidisciplinaryTeam = { some: { professionalId: professionalId.toString() } };
    }

    if (draftedAfter || draftedBefore) {
      where.createdAt = {};

      if (draftedAfter) where.createdAt.gte = draftedAfter;

      if (draftedBefore) where.createdAt.lte = draftedBefore;
    }

    return where;
  }
}
