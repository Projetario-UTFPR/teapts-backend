import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { PaginationParams } from "@/common/pagination/pagination-params";
import { resolvePaginationOffset } from "@/common/pagination/pagination-utils";
import { PrismaService } from "@/infra/prisma/prisma";
import { AccountPresenter } from "@/modules/identity/presenters/account.presenter";
import { PaginatedAccountPresenter } from "@/modules/identity/presenters/paginated-accounts.presenter";
import { Injectable } from "@nestjs/common";
import { AccountFindManyArgs } from "@prisma-gen/models";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

type Where = AccountFindManyArgs["where"];

type Params = PaginationParams & {
  /**
   * When present, list only accounts that have or have not a patient profile attached to it.
   */
  isPatient?: boolean;
  /**
   * When present, list only accounts that have at least one professional profile
   * or that have none at all.
   */
  isProfessional?: boolean;
};

@Injectable()
export class ListAccountsQueryHandler {
  public constructor(private readonly prisma: PrismaService) {}

  public execute({ page, limit, ...params }: Params) {
    const { offset, resolvedLimit, resolvedPage } = resolvePaginationOffset({ page, limit });
    const where = this.resolveWhereClause(params);

    return pipe(
      te.Do,
      te.apS("accounts", this.fetch({ where, limit: resolvedLimit, offset })),
      te.apS("count", this.count({ where })),
      te.map(({ count, accounts }) =>
        PaginatedAccountPresenter.present({
          items: accounts.map(AccountPresenter.present),
          count: count,
          currentPage: resolvedPage,
          resolvedLimit,
        }),
      ),
    )();
  }

  private count({ where }: { where: Where }) {
    return pipe(
      te.tryCatch(
        () => this.prisma.account.count({ where }),
        (error) =>
          new IrrecoverableError({
            message: `Unexpected error occurred in ${ListAccountsQueryHandler.name} when counting accounts.`,
            cause: error as Error,
          }),
      ),
    );
  }

  private fetch({ limit, where, offset }: { limit: number; where: Where; offset: number }) {
    return pipe(
      te.tryCatch(
        async () =>
          await this.prisma.account.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            include: {
              _count: { select: { professionalProfiles: true } },
              patientProfile: { select: { accountId: true } },
            },
          }),
        (error) =>
          new IrrecoverableError({
            message: `Unexpected error occurred in ${ListAccountsQueryHandler.name} when fetching accounts.`,
            cause: error as Error,
          }),
      ),
    );
  }

  private resolveWhereClause({ isPatient, isProfessional }: Omit<Params, keyof PaginationParams>) {
    const where: Where = {};

    if (isPatient !== undefined) {
      where.patientProfile = isPatient ? { isNot: null } : { is: null };
    }

    if (isProfessional !== undefined) {
      where.professionalProfiles = isProfessional ? { some: {} } : { none: {} };
    }

    return where;
  }
}
