import { BadRequestError } from "@/common/errors/bad-request.error";

export class AccountWithEmailAlreadyExistError extends BadRequestError {
  public constructor() {
    super({ message: "Já existe uma conta associada a este email." });
  }
}
