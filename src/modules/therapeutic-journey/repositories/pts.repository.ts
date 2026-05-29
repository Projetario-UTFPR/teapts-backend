import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { type UUID } from "@/common/uuid";
import { ProjetoTerapeuticoSingular } from "@/modules/therapeutic-journey/aggregates/pts.aggregate";
import { ProfessionalIsNotRegistered } from "@/modules/therapeutic-journey/errors/professional-is-not-registered.error";
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

  /**
   * Saves the newly created `pts`. Shall not create it successfully if any of the professionals
   * involved (the responsible or any from the multidisciplinary team) does not exist within the platform.
   */
  public abstract createNewPts(
    pts: ProjetoTerapeuticoSingular,
  ): Promise<Either<IrrecoverableError | ProfessionalIsNotRegistered, ProjetoTerapeuticoSingular>>;

  public abstract getPtsById(ptsId: UUID): Promise<ProjetoTerapeuticoSingular>;

  public abstract updateMultidisciplinaryTeam(
    pts: ProjetoTerapeuticoSingular,
    multidisciplinaryTeam: UUID[],
  );

  public abstract setNewResponsible(pts: ProjetoTerapeuticoSingular, professionalId: UUID);
}
