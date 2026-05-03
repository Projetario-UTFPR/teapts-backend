import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { either as e, taskEither as te } from "fp-ts";
import { UUID } from "@/common/uuid";
import { PrismaService } from "@/infra/prisma/prisma";
import { AccountNotFoundError } from "@/modules/identity/errors/account-not-found.error";
import { AccountsRepository } from "@/modules/identity/repositories/accounts.repository";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma-gen/client";
import { pipe } from "fp-ts/lib/function";
import accountsMapper from "@/infra/prisma/mappers/accounts.mapper";
import { AccountWithEmailAlreadyExistError } from "@/modules/identity/errors/account-with-email-already-exist.error";
import { Either } from "fp-ts/lib/Either";
import { Account } from "@/modules/identity/entities/account.aggregate";

@Injectable()
export class PrismaAccountsRepository extends AccountsRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public findAccountByEmail(email: string) {
    return this.findAccountWithClause({ email });
  }

  public findAccountById(id: UUID) {
    return this.findAccountWithClause({ id: id.toString() });
  }

  private findAccountWithClause(where: Prisma.AccountWhereUniqueInput) {
    return pipe(
      te.tryCatch(
        () =>
          this.prisma.account.findUnique({
            include: { professionalProfiles: { select: { id: true } } },
            where,
          }),
        (error) =>
          new IrrecoverableError({
            message: `Error occurred in ${PrismaAccountsRepository.name} when trying to find account with where clause '${JSON.stringify(where)}'.`,
            cause: error as Error,
          }),
      ),
      te.chainEitherKW((rawAccount) => {
        if (rawAccount === null) return e.left(new AccountNotFoundError());
        return e.right(accountsMapper.fromPrisma(rawAccount));
      }),
    )();
  }

  public create(
    account: Account,
  ): Promise<Either<IrrecoverableError | AccountWithEmailAlreadyExistError, Account>> {
    return pipe(
      te.tryCatch(
        () => this.prisma.account.create({ data: accountsMapper.intoPrisma(account) }),
        (error) => {
          if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2002") {
              const target = error.meta?.target;
              if (Array.isArray(target) && target.includes("email")) {
                return new AccountWithEmailAlreadyExistError();
              }
            }
          }

          return new IrrecoverableError({
            cause: error as Error,
            message:
              `Error occurred in ${PrismaAccountsRepository.name} when ` +
              `trying to save account '${JSON.stringify(data)}'.`,
          });
        },
      ),
      te.map((rawAccount) =>
        this.prisma.account.create({
          data: accountsMapper.intoPrisma(rawAccount),
          include: { professionalProfiles: { select: { id: true } } },
        }),
      ),
    )();
  }
}
