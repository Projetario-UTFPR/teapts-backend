import { Either } from "fp-ts/lib/Either";
import { AccountNotFoundError } from "../errors/account-not-found.error";
import { type UUID } from "@/common/uuid";
import { AccountWithEmailAlreadyExistError } from "../errors/account-with-email-already-exist.error";
import { Account } from "../entities/account.aggregate";
import { IrrecoverableError } from "../../../common/errors/irrecoverable.error";

export abstract class AccountsRepository {
  public abstract findAccountByEmail(
    email: string,
  ): Promise<Either<IrrecoverableError | AccountNotFoundError, Account>>;

  public abstract findAccountById(
    id: UUID,
  ): Promise<Either<IrrecoverableError | AccountNotFoundError, Account>>;
  public abstract create(
    account: Account,
  ): Promise<Either<IrrecoverableError | AccountWithEmailAlreadyExistError, Account>>;
}
