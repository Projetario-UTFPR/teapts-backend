import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { type UUID } from "@/common/uuid";
import { Professional } from "@/modules/professional/entities/professional.aggregate";
import { ProfessionalProfileNotFoundError } from "@/modules/professional/errors/professional-profile-not-found.error";
import { Either } from "fp-ts/lib/Either";

export abstract class ProfessionalsRepository {
  public abstract findManyByIds(ids: UUID[]): Promise<Either<IrrecoverableError, Professional[]>>;

  public abstract findById(
    id: UUID,
  ): Promise<Either<IrrecoverableError | ProfessionalProfileNotFoundError, Professional>>;
}
