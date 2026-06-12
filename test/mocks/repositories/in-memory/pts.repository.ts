import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { UUID } from "@/common/uuid";
import { ProfessionalProfileNotFoundError } from "@/modules/professional/errors/professional-profile-not-found.error";
import { ProjetoTerapeuticoSingular } from "@/modules/therapeutic-journey/aggregates/pts.aggregate";
import { ProfessionalIsNotRegistered } from "@/modules/therapeutic-journey/errors/professional-is-not-registered.error";
import { PtsNotFoundError } from "@/modules/therapeutic-journey/errors/pts-not-found.error";
import { PtsRepository } from "@/modules/therapeutic-journey/repositories/pts.repository";
import { InMemoryProfessionalsRepository } from "@test/mocks/repositories/in-memory/professionals.repository";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";

interface ProfessionalParticipatingOnPTS {
  projetoTerapeuticoSingularId: string;
  professionalId: string;
}

export class InMemoryPtsRepository extends PtsRepository {
  public professionalParticipatingOnPTS: ProfessionalParticipatingOnPTS[] = [];

  public constructor(
    public professionalsRepo: InMemoryProfessionalsRepository = new InMemoryProfessionalsRepository(),
    public items: ProjetoTerapeuticoSingular[] = [],
  ) {
    super();
  }

  public async findActivePtsByPatientId(
    patientId: UUID,
  ): Promise<Either<IrrecoverableError | PtsNotFoundError, ProjetoTerapeuticoSingular>> {
    const patientsPts = this.items.filter((pts) => pts.belongsToPatient(patientId));
    const activePts = patientsPts.find((pts) => pts.isActive());
    if (!activePts) return either.left(new PtsNotFoundError());
    return either.right(activePts);
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
      (professional) => professional.getId().toString() === snapshot.responsibleProfessionalId,
    );

    if (!responsibleProfessional) {
      return either.left(new ProfessionalIsNotRegistered("responsible"));
    }

    const everyProfessionalFromMultidisciplinaryTeamExists = pts
      .getMultidisciplinaryTeam()
      .getCurrent()
      .every((uuid) =>
        this.professionalsRepo.professionals.some(
          (professional) => professional.getId().toString() === uuid.toString(),
        ),
      );

    if (!everyProfessionalFromMultidisciplinaryTeamExists) {
      return either.left(new ProfessionalIsNotRegistered("team"));
    }

    this.items.push(pts);

    const ptsId = pts.getId().toString();
    pts
      .getMultidisciplinaryTeam()
      .getCurrent()
      .forEach((uuid) => {
        this.professionalParticipatingOnPTS.push({
          projetoTerapeuticoSingularId: ptsId,
          professionalId: uuid.toString(),
        });
      });

    return either.right(pts);
  }

  public async save(pts: ProjetoTerapeuticoSingular): Promise<Either<IrrecoverableError, void>> {
    const ptsId = pts.getId().toString();
    const currentTeamUuids = pts.getMultidisciplinaryTeam().getCurrent();

    const missingProfessionalUuid = currentTeamUuids.find(
      (uuid) =>
        !this.professionalsRepo.professionals.some((p) => p.getId().toString() === uuid.toString()),
    );

    if (missingProfessionalUuid) {
      const missingIdStr = missingProfessionalUuid.toString();

      return either.left(
        new IrrecoverableError({
          message: `O profissional com ID ${missingIdStr} não foi encontrado na equipe multidisciplinar.`,
          cause: new ProfessionalProfileNotFoundError(missingIdStr),
        }),
      );
    }

    const existingPtsIndex = this.items.findIndex((item) => item.getId().toString() === ptsId);
    if (existingPtsIndex !== -1) {
      this.items[existingPtsIndex] = pts;
    } else {
      this.items.push(pts);
    }

    this.professionalParticipatingOnPTS = this.professionalParticipatingOnPTS.filter(
      (relation) => relation.projetoTerapeuticoSingularId !== ptsId,
    );

    currentTeamUuids.forEach((uuid) => {
      this.professionalParticipatingOnPTS.push({
        projetoTerapeuticoSingularId: ptsId,
        professionalId: uuid.toString(),
      });
    });

    return either.right(undefined);
  }

  public async getById(
    ptsId: UUID,
  ): Promise<Either<IrrecoverableError | PtsNotFoundError, ProjetoTerapeuticoSingular>> {
    const pts = this.items.find((item) => item.getId().toString() === ptsId.toString());

    if (!pts) {
      return either.left(new PtsNotFoundError());
    }

    return either.right(pts);
  }
}
