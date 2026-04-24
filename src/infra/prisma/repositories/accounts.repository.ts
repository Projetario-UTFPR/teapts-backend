import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { PrismaService } from "@/infra/prisma/prisma";
import { Account } from "@/modules/identity/entities/account";
import { AccountNotFoundError } from "@/modules/identity/errors/account-not-found.error";
import { AccountsRepository } from "@/modules/identity/repositories/accounts.repository";
import { Injectable } from "@nestjs/common";
import { either as e, taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";

@Injectable()
export class PrismaAccountsRepository extends AccountsRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public findAccountByEmail(
    email: string,
  ): Promise<Either<IrrecoverableError | AccountNotFoundError, Account>> {
    return pipe(
      te.tryCatch(
        () => this.prisma.account.findUnique({ where: { email } }),
        (error) =>
          new IrrecoverableError({
            message: `Error occurred in ${PrismaAccountsRepository.name} when trying to find account by email '${email}'.`,
            cause: error as Error,
          }),
      ),
      te.chainEitherKW((rawAccount) => {
        if (rawAccount === null) return e.left(new AccountNotFoundError());

        const account = Account.create(rawAccount);
        return e.right(account);
      }),
    )();
  }
}
