import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { UUID } from "@/common/uuid";
import { ProjetoTerapeuticoSingular } from "@/modules/therapeutic-journey/aggregates/pts.aggregate";
import { PtsRepository } from "@/modules/therapeutic-journey/repositories/pts.repository";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";

export class InMemoryPtsRepository extends PtsRepository {
  public items: ProjetoTerapeuticoSingular[] = [];

  public async activePtsExistsByPatientId(
    patientId: UUID,
  ): Promise<Either<IrrecoverableError, boolean>> {
    const patientsPts = this.items.filter((pts) => pts.belongsToPatient(patientId));
    const activePts = patientsPts.find((pts) => pts.isActive());
    return either.right(Boolean(activePts));
  }

  public async createNewPts(
    pts: ProjetoTerapeuticoSingular,
  ): Promise<Either<IrrecoverableError, ProjetoTerapeuticoSingular>> {
    this.items.push(pts);
    return either.right(pts);
  }
}
