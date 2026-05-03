import { Injectable } from "@nestjs/common";

import { AccountsRepository } from "../repositories/accounts.repository";
import { Account } from "../entities/account.aggregate";

import { Hasher } from "../../crypto/hasher";
import { either as e } from "fp-ts";
import { InvalidCredentialsError } from "@/modules/identity/errors/invalid-credentials.error";

type TCreateAccount = {
  name: string;
  email: string;
  plainPassword: string;
  professionalProfilesIds: string[];
};

@Injectable()
export class CreateAccountService {
  public constructor(
    private readonly hasher: Hasher,
    private readonly accountsRepo: AccountsRepository,
  ) {}

  public async execute(params: TCreateAccount) {
    const { plainPassword, ...accountProps } = params;

    const validation = await this.verifyCredentials(params);

    if (e.isLeft(validation)) {
      return validation;
    }

    const passwordHash = await this.hasher.hash(plainPassword);
    const account = Account.create({ ...accountProps, passwordHash });

    const result = await this.accountsRepo.create(account);
    return e.right(result);
  }

  private async verifyCredentials({ email, name, plainPassword }) {
    const emailValidation = this.verifyEmailSyntax(email);
    if (emailValidation) return emailValidation;

    const nameValidation = this.verifyUserNameSyntax(name);
    if (nameValidation) return nameValidation;

    const passwordValidation = this.verifyPasswordSyntax(plainPassword);
    if (passwordValidation) return passwordValidation;

    return e.right(undefined);
  }

  private verifyEmailSyntax(email: string) {
    return !email.includes("@") ? e.left(new InvalidCredentialsError()) : null;
  }

  private verifyUserNameSyntax(name: string) {
    return name.length < 5 ? e.left(new InvalidCredentialsError()) : null;
  }

  private verifyPasswordSyntax(password: string) {
    return password.length < 8 ? e.left(new InvalidCredentialsError()) : null;
  }
}
