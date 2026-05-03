import { Injectable } from "@nestjs/common";

import { AccountsRepository } from "../repositories/accounts.repository";
import { Account } from "../entities/account.aggregate";

import { Hasher } from "../../crypto/hasher";
import { either as e } from "fp-ts";
import { InvalidCredentialsError } from "@/modules/identity/errors/invalid-credentials.error";

type TCreateAccount = {
  name: string;
  email: string;
  password: string;
  professionalProfilesIds: string[];
};

@Injectable()
export class CreateAccountService {
  public constructor(
    private readonly accountsRepo: AccountsRepository,
    private readonly hasher: Hasher,
  ) {}

  public async execute(params: TCreateAccount) {
    const { password, ...accountProps } = params;

    this.verifyCredentials(params);

    const passwordHash = await this.hasher.hash(password);
    const account = Account.create({ ...accountProps, passwordHash });

    return await this.accountsRepo.create(account);
  }

  private verifyCredentials({ email, name, password }) {
    this.verifyEmailSyntax(email);
    this.verifyUserNameSyntax(name);
    this.verifyPasswordSyntax(password);
  }

  private verifyEmailSyntax(email: string) {
    return !email.includes("@")
      ? Promise.resolve(e.left(new InvalidCredentialsError()))
      : Promise.resolve(e.right(undefined));
  }

  private verifyUserNameSyntax(name: string) {
    return name.length < 5
      ? Promise.resolve(e.left(new InvalidCredentialsError()))
      : Promise.resolve(e.right(undefined));
  }

  private verifyPasswordSyntax(password: string) {
    return password.length < 8
      ? Promise.resolve(e.left(new InvalidCredentialsError()))
      : Promise.resolve(e.right(undefined));
  }
}
