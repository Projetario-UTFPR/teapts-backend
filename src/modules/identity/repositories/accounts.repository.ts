import { Either } from "fp-ts/lib/Either";
import { AccountNotFoundError } from "../errors/account-not-found.error";
import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { type UUID } from "@/common/uuid";

export abstract class AccountsRepository {
  public abstract findAccountByEmail(
    email: string,
  ): Promise<Either<IrrecoverableError | AccountNotFoundError, Account>>;

  public abstract findAccountById(
    id: UUID,
  ): Promise<Either<IrrecoverableError | AccountNotFoundError, Account>>;
}
