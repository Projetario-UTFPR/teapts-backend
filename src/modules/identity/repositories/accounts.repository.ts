import { Either } from "fp-ts/lib/Either";
import { AccountNotFoundError } from "../errors/account-not-found.error";
import { Account } from "../entities/account";
import { IrrecoverableError } from "src/common/errors/irrecoverable.error";

export abstract class AccountsRepository {
  public abstract findAccountByEmail(
    email: string,
  ): Promise<Either<IrrecoverableError | AccountNotFoundError, Account>>;
}
