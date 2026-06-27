import { BadRequestError } from "@/common/errors/bad-request.error";

export class AccountAlreadyHasPatientProfileError extends BadRequestError {
  public constructor() {
    super({ message: "Essa conta já possui um perfil de paciente." });
  }
}
