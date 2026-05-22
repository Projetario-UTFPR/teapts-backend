import { ResourceNotFoundError } from "@/common/errors/resource-not-found.error";
import type { UUID } from "@/common/uuid";
import { Professional } from "@/modules/professional/entities/professional.aggregate";

export class ProfessionalProfileNotFoundError extends ResourceNotFoundError {
  public constructor(id: UUID) {
    super({
      message: `Não foi possível encontrar nenhum perfil profissional com id "${id}".`,
      subject: Professional.name,
    });
  }
}
