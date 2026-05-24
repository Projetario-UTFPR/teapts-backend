import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { UnauthorizedError } from "@/common/errors/unauthorized.error";
import type { UUID } from "@/common/uuid";
import { AuthCollection } from "@/infra/auth/auth-collection";
import { AccountsRepository } from "@/modules/identity/repositories/accounts.repository";
import { ProfessionalsRepository } from "@/modules/professional/professionals.repository";
import { Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

type Params = {
  accountId: UUID;
};

@Injectable()
export class GetAuthCollectionQueryHandler {
  public constructor(
    private readonly accountsRepository: AccountsRepository,
    private readonly professionalsRepository: ProfessionalsRepository,
  ) {}

  public execute({ accountId }: Params) {
    return pipe(
      te.Do,
      te.apS("account", () => this.accountsRepository.findAccountById(accountId)),
      te.bindW(
        "professionalProfiles",
        ({ account }) =>
          () =>
            this.professionalsRepository.findManyByIds(account.getProfessionalIds()),
      ),
      te.map(
        ({ account, professionalProfiles }) => new AuthCollection(account, professionalProfiles),
      ),
      te.mapLeft((error) => {
        if (error instanceof IrrecoverableError) return error;
        return new UnauthorizedError();
      }),
    )();
  }
}
