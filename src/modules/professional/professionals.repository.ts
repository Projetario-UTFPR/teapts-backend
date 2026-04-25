import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { type UUID } from "@/common/uuid";
import { Professional } from "@/modules/professional/entities/professional.entity";
import { Either } from "fp-ts/lib/Either";

export abstract class ProfessionalsRepository {
  public abstract findManyByIds(ids: UUID[]): Promise<Either<IrrecoverableError, Professional[]>>;
}
