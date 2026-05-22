import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { UUID } from "@/common/uuid";
import { ProjetoTerapeuticoSingular } from "@/modules/therapeutic-journey/aggregates/pts.aggregate";
import { ProfessionalIsNotRegistered } from "@/modules/therapeutic-journey/errors/professional-is-not-registered.error";
import { PtsRepository } from "@/modules/therapeutic-journey/repositories/pts.repository";
import { InMemoryProfessionalsRepository } from "@test/mocks/repositories/in-memory/professionals.repository";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";

export class InMemoryPtsRepository extends PtsRepository {
  public constructor(
    public professionalsRepo: InMemoryProfessionalsRepository = new InMemoryProfessionalsRepository(),
    public items: ProjetoTerapeuticoSingular[] = [],
  ) {
    super();
  }

  public async activePtsExistsByPatientId(
    patientId: UUID,
  ): Promise<Either<IrrecoverableError, boolean>> {
    const patientsPts = this.items.filter((pts) => pts.belongsToPatient(patientId));
    const activePts = patientsPts.find((pts) => pts.isActive());
    return either.right(Boolean(activePts));
  }

  public async createNewPts(pts: ProjetoTerapeuticoSingular) {
    const snapshot = pts.toSnapshot();

    const responsibleProfessional = this.professionalsRepo.professionals.some(
      (professional) => professional.getId() === snapshot.responsibleProfessionalId,
    );

    if (!responsibleProfessional) {
      return either.left(new ProfessionalIsNotRegistered("responsible"));
    }

    const everyProfessionalFromMultidisciplinaryTeamExists =
      snapshot.multidisciplinaryTeamIds.every((id) =>
        this.professionalsRepo.professionals.some((professional) => professional.getId() === id),
      );

    if (!everyProfessionalFromMultidisciplinaryTeamExists) {
      return either.left(new ProfessionalIsNotRegistered("team"));
    }

    this.items.push(pts);
    return either.right(pts);
  }
}
