import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { type UUID } from "@/common/uuid";
import { ProjetoTerapeuticoSingular } from "@/modules/therapeutic-journey/aggregates/pts.aggregate";
import { Either } from "fp-ts/lib/Either";

export abstract class PtsRepository {
  /**
   * Checks whether is there an active PTS owned by the patient of id `patientId`.
   *
   * @note an 'active' PTS is a PTS that has either `Running` or `Planning` state.
   */
  public abstract activePtsExistsByPatientId(
    patientId: UUID,
  ): Promise<Either<IrrecoverableError, boolean>>;

  public abstract createNewPts(
    pts: ProjetoTerapeuticoSingular,
  ): Promise<Either<IrrecoverableError, ProjetoTerapeuticoSingular>>;
}
