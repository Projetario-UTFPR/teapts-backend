import { ResourceNotFoundError } from "../../../common/errors/resource-not-found.error";
import { Account } from "../entities/account";

export class AccountNotFoundError extends ResourceNotFoundError {
  public constructor() {
    super({
      message: "Não foi possível encontrar nenhuma conta com essas credenciais.",
      subject: Account.name,
    });
  }
}
