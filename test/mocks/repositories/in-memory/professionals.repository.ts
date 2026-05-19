import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { UUID } from "@/common/uuid";
import { Professional } from "@/modules/professional/entities/professional.aggregate";
import { ProfessionalProfileNotFoundError } from "@/modules/professional/errors/professional-profile-not-found.error";
import { ProfessionalsRepository } from "@/modules/professional/professionals.repository";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";

export class InMemoryProfessionalsRepository extends ProfessionalsRepository {
  public professionals: Professional[] = [];

  public async findManyByIds(ids: UUID[]): Promise<Either<IrrecoverableError, Professional[]>> {
    const filterSelectedProfessionals = (prof: Professional) => ids.includes(prof.getId());
    const filteredProfessionals = this.professionals.filter(filterSelectedProfessionals);
    return either.right(filteredProfessionals);
  }

  public async findById(
    id: UUID,
  ): Promise<Either<IrrecoverableError | ProfessionalProfileNotFoundError, Professional>> {
    const professional = this.professionals.find((professional) => professional.getId() === id);
    return professional
      ? either.right(professional)
      : either.left(new ProfessionalProfileNotFoundError(id));
  }
}
