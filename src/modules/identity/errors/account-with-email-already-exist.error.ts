import { ConflictError } from "@/common/errors/conflict.error";

export class AccountWithEmailAlreadyExistError extends ConflictError {
  public constructor() {
    super({ message: "Já existe uma conta associada a este email." });
  }
}
