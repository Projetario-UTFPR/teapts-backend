import { Injectable } from "@nestjs/common";

import { AccountsRepository } from "../repositories/accounts.repository";
import { Account } from "../entities/account.aggregate";

import { Hasher } from "../../crypto/hasher";

type TCreateAccount = {
  name: string;
  email: string;
  plainPassword: string;
};

@Injectable()
export class CreateAccountService {
  public constructor(
    private readonly hasher: Hasher,
    private readonly accountsRepo: AccountsRepository,
  ) {}

  public async execute(params: TCreateAccount) {
    const { plainPassword, ...accountProps } = params;

    const passwordHash = await this.hasher.hash(plainPassword);
    const account = Account.create({ ...accountProps, passwordHash, professionalProfilesIds: [] });

    return await this.accountsRepo.create(account);
  }
}
