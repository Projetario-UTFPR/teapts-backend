import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { type UUID } from "@/common/uuid";
import { ProjetoTerapeuticoSingular } from "@/modules/therapeutic-journey/aggregates/pts.aggregate";
import { Either } from "fp-ts/lib/Either";

export abstract class PtsRepository {
  public abstract ptsExistsByPatientId(
    patientId: UUID,
  ): Promise<Either<IrrecoverableError, boolean>>;

  public abstract createNewPts(
    pts: ProjetoTerapeuticoSingular,
  ): Promise<Either<IrrecoverableError, boolean>>;
}
