import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { PaginationParams } from "@/common/pagination/pagination-params";
import { PaginationResult } from "@/common/pagination/pagination-result";
import { ShallowActivityPresenter } from "@/modules/therapeutic-journey/presenters/shallow-activity.presenter";
import { Either } from "fp-ts/lib/Either";
import paginationUtils from "@/common/pagination/pagination-utils";
import activityMapper from "@/infra/prisma/mappers/activity.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import { Injectable } from "@nestjs/common";
import { ActivityFindManyArgs } from "@prisma-gen/models";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

export type Params = PaginationParams & {
  patientId: string;
};

export type Result = PaginationResult & {
  activities: ShallowActivityPresenter[];
};

@Injectable()
export class ListActivitiesQueryHandler {
  public constructor(private readonly prisma: PrismaService) {}

  public execute({ limit, page, patientId }: Params): Promise<Either<IrrecoverableError, Result>> {
    const { offset, resolvedPage, resolvedLimit } = paginationUtils.resolveOffset({ page, limit });
    const where = this.resolveWhereClause({ patientId });

    return pipe(
      te.Do,
      te.apS("activities", this.fetchActivities({ where, limit: resolvedLimit, offset })),
      te.apS("count", this.countActivities({ where })),
      te.map(
        ({ count, activities }) =>
          ({
            activities: activities.map((prismaActivity) =>
              ShallowActivityPresenter.present(activityMapper.fromPrisma(prismaActivity)),
            ),
            count: count,
            currentPage: resolvedPage,
            resolvedLimit,
          }) satisfies Result,
      ),
    )();
  }

  private countActivities({ where }: { where: ActivityFindManyArgs["where"] }) {
    return pipe(
      te.tryCatch(
        () => this.prisma.activity.count({ where }),
        (error) =>
          new IrrecoverableError({
            message: `Unexpected error occurred in ${ListActivitiesQueryHandler.name} when counting activities.`,
            cause: error as Error,
          }),
      ),
    );
  }

  private fetchActivities({
    limit,
    where,
    offset,
  }: {
    limit: number;
    where: ActivityFindManyArgs["where"];
    offset: number;
  }) {
    return pipe(
      te.tryCatch(
        async () => {
          const rawActivities = await this.prisma.activity.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy: { createdAt: "desc" },
            include: {
              activityReferringToDocuments: {
                select: { documentId: true },
              },
            },
          });

          return rawActivities.map((raw) => ({
            ...raw,
            documents: raw.activityReferringToDocuments.map((ref) => ({
              id: ref.documentId,
            })),
          }));
        },
        (error) =>
          new IrrecoverableError({
            message: `Unexpected error occurred in ${ListActivitiesQueryHandler.name} when fetching activities.`,
            cause: error as Error,
          }),
      ),
    );
  }

  private resolveWhereClause({ patientId }: Pick<Params, "patientId">) {
    let where: ActivityFindManyArgs["where"] = {};

    if (patientId) {
      where.projetoTerapeuticoSingular = { patientId };
    }

    return where;
  }
}
