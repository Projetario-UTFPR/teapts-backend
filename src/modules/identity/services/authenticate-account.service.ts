import { Injectable } from "@nestjs/common";
import { AccountsRepository } from "../repositories/accounts.repository";
import { pipe } from "fp-ts/lib/function";
import { either as e, taskEither as te } from "fp-ts";
import { InvalidCredentialsError } from "../errors/invalid-credentials.error";
import { HashComparator } from "@/modules/crypto/comparator";
import { ResourceNotFoundError } from "@/common/errors/resource-not-found.error";
import { Account } from "@/modules/identity/entities/account.aggregate";

type Params = {
  email: string;
  plainPassword: string;
};

@Injectable()
export class AuthenticateAccountService {
  public constructor(
    private readonly comparator: HashComparator,
    private readonly accountsRepo: AccountsRepository,
  ) {}

  public execute({ email, plainPassword }: Params) {
    return pipe(
      this.findAccount(email),
      te.chainFirstW((account) => this.verifyPassword(account, plainPassword)),
    )();
  }

  private findAccount(email: string) {
    return pipe(
      () => this.accountsRepo.findAccountByEmail(email),
      te.mapLeft((error) => {
        return error instanceof ResourceNotFoundError ? new InvalidCredentialsError() : error;
      }),
    );
  }

  private verifyPassword(account: Account, plainPassword: string) {
    return pipe(
      te.fromTask(() => this.comparator.compare(plainPassword, account.getPasswordHash())),
      te.chainEitherK((credentialsMatch) => {
        return credentialsMatch ? e.right(undefined) : e.left(new InvalidCredentialsError());
      }),
    );
  }
}
