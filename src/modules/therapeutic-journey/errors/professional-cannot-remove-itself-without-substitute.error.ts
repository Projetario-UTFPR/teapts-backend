import { BadRequestError } from "@/common/errors/bad-request.error";

export class ProfessionalCannotRemoveItselfWithoutSubstituteError extends BadRequestError {
  public constructor() {
    super({
      message: `Responsável precisa prover ID de substituto quando busca revogar sua responsabilidade.`,
    });
  }
}
