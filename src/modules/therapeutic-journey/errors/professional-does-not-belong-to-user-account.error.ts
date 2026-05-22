import { ForbiddenError } from "@/common/errors/forbidden.error";
import type { UUID } from "@/common/uuid";

export class ProfessionalDoesNotBelongToUserAccountError extends ForbiddenError {
  public constructor(professionalId: UUID) {
    super({ message: `O profissional de ID "${professionalId}" não está associado a você.` });
  }
}
