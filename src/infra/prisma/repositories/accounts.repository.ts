import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { either as e, taskEither as te } from "fp-ts";
import { UUID } from "@/common/uuid";
import { PrismaService } from "@/infra/prisma/prisma";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { AccountNotFoundError } from "@/modules/identity/errors/account-not-found.error";
import { AccountsRepository } from "@/modules/identity/repositories/accounts.repository";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma-gen/browser";
import { pipe } from "fp-ts/lib/function";

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

        const { professionalProfiles, ...rawAccountPayload } = rawAccount;
        const professionalProfilesIds = professionalProfiles.map((profile) => profile.id);
        const account = Account.create({ ...rawAccountPayload, professionalProfilesIds });

        return e.right(account);
      }),
    )();
  }
}
