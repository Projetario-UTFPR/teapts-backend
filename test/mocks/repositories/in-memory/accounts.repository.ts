import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { UUID } from "@/common/uuid";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { AccountNotFoundError } from "@/modules/identity/errors/account-not-found.error";
import { InvalidCredentialsError } from "@/modules/identity/errors/invalid-credentials.error";
import { AccountsRepository } from "@/modules/identity/repositories/accounts.repository";
import { either as e, taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "zod";

export class InMemoryAccountsRepository extends AccountsRepository {
  public accounts: Account[] = [];

  public async findAccountByEmail(
    email: string,
  ): Promise<Either<IrrecoverableError | AccountNotFoundError, Account>> {
    const account = this.accounts.find((account) => account.getEmail() === email);
    if (!account) return e.left(new AccountNotFoundError());
    return e.right(account);
  }
  public async findAccountById(
    id: UUID,
  ): Promise<Either<IrrecoverableError | AccountNotFoundError, Account>> {
    const account = this.accounts.find((account) => account.getId() === id);
    if (!account) return e.left(new AccountNotFoundError());
    return e.right(account);
  }
  public async create(account: Account): Promise<Either<InvalidCredentialsError, Account>> {
    const accountCreated = this.accounts.push(account);
    if (!accountCreated) return e.left(new InvalidCredentialsError());
    return e.right(account);
  }
}
