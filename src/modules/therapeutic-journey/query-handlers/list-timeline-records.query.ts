import { Injectable } from "@nestjs/common";
import { pipe } from "fp-ts/lib/function";
import { taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";

import { PrismaService } from "@/infra/prisma/prisma";
import { TimelineRecordFindManyArgs } from "@prisma-gen/models"; // Ajuste se o nome gerado for diferente
import timelineRecordMapper from "@/infra/prisma/mappers/timeline-record.mapper";

import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { PaginationParams } from "@/common/pagination/pagination-params";
import { PaginationResult } from "@/common/pagination/pagination-result";
import paginationUtlis from "@/common/pagination/pagination-utils"; // Mantido o typo do seu import original local

import { TimelineRecord } from "../aggregates/timeline-record.aggregate";
import { TimelineRecordPresenter } from "../presenters/timeline-record.presenter";

export type Params = PaginationParams & {
  patientId: string;
  responsibleProfessionalId?: string;
  target?: TimelineRecord.TargetType;
  type?: TimelineRecord.Type;
  description?: string;
};

export type Result = PaginationResult & {
  records: TimelineRecordPresenter[];
};

@Injectable()
export class ListTimelineRecordsQueryHandler {
  public constructor(private readonly prisma: PrismaService) {}

  public execute({
    limit,
    page,
    patientId,
    responsibleProfessionalId,
    target,
    type,
    description,
  }: Params): Promise<Either<IrrecoverableError, Result>> {
    const { offset, resolvedPage, resolvedLimit } = paginationUtlis.resolveOffset({ page, limit });
    const where = this.resolveWhereClause({
      patientId,
      responsibleProfessionalId,
      target,
      type,
      description,
    });

    return pipe(
      te.Do,
      te.apS("records", this.fetchTimelineRecords({ where, limit: resolvedLimit, offset })),
      te.apS("count", this.countTimelineRecords({ where })),
      te.map(
        ({ count, records }) =>
          ({
            records: records.map((prismaRecord) =>
              TimelineRecordPresenter.present(timelineRecordMapper.fromPrisma(prismaRecord)),
            ),
            count,
            currentPage: resolvedPage,
            resolvedLimit,
          }) satisfies Result,
      ),
    )();
  }

  private countTimelineRecords({ where }: { where: TimelineRecordFindManyArgs["where"] }) {
    return pipe(
      te.tryCatch(
        () => this.prisma.timelineRecord.count({ where }),
        (error) =>
          new IrrecoverableError({
            message: `Unexpected error occurred in ${ListTimelineRecordsQueryHandler.name} when counting timeline records.`,
            cause: error as Error,
          }),
      ),
    );
  }

  private fetchTimelineRecords({
    limit,
    where,
    offset,
  }: {
    limit: number;
    where: TimelineRecordFindManyArgs["where"];
    offset: number;
  }) {
    return pipe(
      te.tryCatch(
        () =>
          this.prisma.timelineRecord.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy: { happenedAt: "desc" },
          }),
        (error) =>
          new IrrecoverableError({
            message: `Unexpected error occurred in ${ListTimelineRecordsQueryHandler.name} when fetching timeline records.`,
            cause: error as Error,
          }),
      ),
    );
  }

  private resolveWhereClause({
    patientId,
    responsibleProfessionalId,
    target,
    type,
    description,
  }: Pick<Params, "patientId" | "responsibleProfessionalId" | "target" | "type" | "description">) {
    let where: TimelineRecordFindManyArgs["where"] = {};

    if (patientId) {
      where.pts = { patientId };
    }

    if (responsibleProfessionalId) {
      where.authorProfessionalId = responsibleProfessionalId;
    }

    if (target) {
      where.targetType = timelineRecordMapper.targetTypeIntoPrisma(target);
    }

    if (type) {
      where.type = timelineRecordMapper.recordTypeIntoPrisma(type);
    }

    if (description) {
      where.description = {
        contains: description,
        mode: "insensitive",
      };
    }

    return where;
  }
}
