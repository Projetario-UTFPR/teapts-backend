import { ForbiddenError } from "@/common/errors/forbidden.error";

export class NotAPatientError extends ForbiddenError {
  public constructor() {
    super({ message: "Você precisa ser um paciente para realizar essa ação." });
  }
}
