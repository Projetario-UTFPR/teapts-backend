import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { PaginationParams } from "@/common/pagination/pagination-params";
import { PaginationResult } from "@/common/pagination/pagination-result";
import { Professional } from "@/modules/professional/entities/professional.aggregate";
import { ProfessionalWithAccountPresenter } from "@/modules/professional/presenters/professional-with-account.presenter";
import { Either } from "fp-ts/lib/Either";
import paginationUtils from "@/common/pagination/pagination-utils";
import professionalsMapper from "@/infra/prisma/mappers/professionals.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import { Injectable } from "@nestjs/common";
import { ProfessionalFindManyArgs } from "@prisma-gen/models";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { type UUID } from "@/common/uuid";

export type Params = PaginationParams & {
  /**
   * Specify professionals by IDs.
   */
  inIds?: UUID[];
  specialisms?: Professional.Specialism[];
  name?: string;
};

export type Result = PaginationResult & {
  professionals: ProfessionalWithAccountPresenter[];
};

@Injectable()
export class ListProfessionalsQueryHandler {
  public constructor(private readonly prisma: PrismaService) {}

  public execute({
    limit,
    page,
    name,
    specialisms,
    inIds,
  }: Params): Promise<Either<IrrecoverableError, Result>> {
    const { offset, resolvedPage, resolvedLimit } = paginationUtils.resolveOffset({ page, limit });
    const where = this.resolveWhereClause({ specialisms, name, inIds });
    return pipe(
      te.Do,
      te.apS("professionals", this.fetchProfessionals({ where, limit, offset })),
      te.apS("count", this.countProfessionals({ where })),
      te.map(
        ({ count, professionals }) =>
          ({
            professionals: professionals.map(ProfessionalWithAccountPresenter.present),
            count: count,
            currentPage: resolvedPage,
            resolvedLimit,
          }) satisfies Result,
      ),
    )();
  }

  private countProfessionals({ where }: { where: ProfessionalFindManyArgs["where"] }) {
    return pipe(
      te.tryCatch(
        () => this.prisma.professional.count({ where }),
        (error) =>
          new IrrecoverableError({
            message: `Unexpected error occurred in ${ListProfessionalsQueryHandler.name} when counting professionals.`,
            cause: error as Error,
          }),
      ),
    );
  }

  private fetchProfessionals({
    limit,
    where,
    offset,
  }: Pick<Params, "limit"> & {
    where: ProfessionalFindManyArgs["where"];
    offset: number;
  }) {
    return pipe(
      te.tryCatch(
        () =>
          this.prisma.professional.findMany({
            where,
            take: limit,
            skip: offset,
            include: { account: true },
            orderBy: [{ account: { name: "asc" } }, { id: "asc" }],
          }),
        (error) =>
          new IrrecoverableError({
            message: `Unexpected error occurred in ${ListProfessionalsQueryHandler.name} when fetching professionals.`,
            cause: error as Error,
          }),
      ),
    );
  }

  private resolveWhereClause({
    specialisms,
    name,
    inIds,
  }: Pick<Params, "name" | "specialisms" | "inIds">) {
    let where: ProfessionalFindManyArgs["where"] = {};

    if (name) where.account = { name: { contains: name, mode: "insensitive" } };

    if (specialisms) {
      where.specialism = { in: specialisms.map(professionalsMapper.specialismIntoPrisma) };
    }

    if (inIds) where.id = { in: inIds.map((id) => id.toString()) };

    return where;
  }
}
