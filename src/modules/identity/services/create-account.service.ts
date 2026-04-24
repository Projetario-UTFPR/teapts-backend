import { Injectable } from "@nestjs/common";
import { pipe } from "fp-ts/lib/function";
import { taskEither as te } from "fp-ts";

import { AccountsRepository } from "../repositories/accounts.repository";
import { Account } from "../entities/account";

import { Hasher } from "../../crypto/hasher";

type Params = {
  name: string;
  email: string;
  password: string;
};

@Injectable()
export class CreateAccountService {
  public constructor(private readonly accountsRepo: AccountsRepository, private readonly hasher: Hasher) {}

  public async execute({ name, email, password }: Params) {
    const passwordHash = await this.hasher.hash(password);

    return pipe(
      this.ensureAccountDoesNotExist(email),
      te.map(() => Account.create({ name, email, passwordHash })),
      te.chain((account) => this.save(account)),
    );
  }

  private ensureAccountDoesNotExist(email: string) {
    return pipe(
      () => this.accountsRepo.findAccountByEmail(email),
      te.match(
        (error) => {
          return Promise.resolve(undefined);
        },
        () => {
          throw new Error("Account already exists");
        },
      ),
      te.fromTask,
    );
  }

  private save(account: Account) {
    return pipe(
      () => this.accountsRepo.create(account),
      te.map(() => account),
    );
  }
}