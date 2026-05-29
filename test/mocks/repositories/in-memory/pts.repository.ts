import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { UUID } from "@/common/uuid";
import { ProfessionalProfileNotFoundError } from "@/modules/professional/errors/professional-profile-not-found.error";
import { ProjetoTerapeuticoSingular } from "@/modules/therapeutic-journey/aggregates/pts.aggregate";
import { ProfessionalIsNotRegistered } from "@/modules/therapeutic-journey/errors/professional-is-not-registered.error";
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

  public async getPtsById(ptsId: UUID): Promise<ProjetoTerapeuticoSingular> {
    const pts = this.items.find((item) => item.getId().toString() === ptsId.toString());

    if (!pts) {
      throw new Error(
        `ProjetoTerapeuticoSingular com o ID ${ptsId.toString()} não foi encontrado.`,
      );
    }

    return pts;
  }

  public async updateMultidisciplinaryTeam(
    pts: ProjetoTerapeuticoSingular,
    multidisciplinaryTeam: UUID[],
  ) {
    const ptsId = pts.getId().toString();
    const newIdsStr = multidisciplinaryTeam.map(String);

    const everyProfessionalExists = newIdsStr.every((idStr) =>
      this.professionalsRepo.professionals.some((p) => p.getId().toString() === idStr),
    );

    if (!everyProfessionalExists) {
      return new ProfessionalProfileNotFoundError(everyProfessionalExists[0]);
    }

    this.professionalParticipatingOnPTS = this.professionalParticipatingOnPTS.filter(
      (relation) => relation.projetoTerapeuticoSingularId !== ptsId,
    );

    newIdsStr.forEach((idStr) => {
      this.professionalParticipatingOnPTS.push({
        projetoTerapeuticoSingularId: ptsId,
        professionalId: idStr,
      });
    });

    if (typeof (pts as any).updateTeamState === "function") {
      (pts as any).updateTeamState(multidisciplinaryTeam);
    }
  }

  public async setNewResponsible(
    pts: ProjetoTerapeuticoSingular,
    professionalId: UUID,
  ): Promise<void> {
    const ptsId = pts.getId().toString();
    const newResponsibleIdStr = professionalId.toString();

    const professionalExists = this.professionalsRepo.professionals.some(
      (p) => p.getId().toString() === newResponsibleIdStr,
    );

    if (!professionalExists) {
      throw new Error("The professional provided for responsible does not exist.");
    }

    const existingPtsIndex = this.items.findIndex((item) => item.getId().toString() === ptsId);

    if (existingPtsIndex !== -1) {
      const target = this.items[existingPtsIndex] as any;

      if (typeof target.changeResponsible === "function") {
        target.changeResponsible(professionalId);
      } else if (typeof target.setResponsible === "function") {
        target.setResponsible(professionalId);
      } else {
        const keys = ["_responsibleProfessionalId", "responsibleProfessionalId", "props"];
        let updated = false;

        for (const key of keys) {
          if (key in target) {
            if (key === "props" && typeof target.props === "object") {
              target.props.responsibleProfessionalId = professionalId;
              updated = true;
            } else {
              target[key] = professionalId;
              updated = true;
            }
          }
        }

        if (!updated && typeof target.toSnapshot === "function") {
          const originalSnapshot = target.toSnapshot.bind(target);
          target.toSnapshot = () => ({
            ...originalSnapshot(),
            responsibleProfessionalId: newResponsibleIdStr,
          });
        }
      }

      const ptsTarget = pts as any;
      if (typeof ptsTarget.toSnapshot === "function") {
        const originalSnapshot = ptsTarget.toSnapshot.bind(ptsTarget);
        ptsTarget.toSnapshot = () => ({
          ...originalSnapshot(),
          responsibleProfessionalId: newResponsibleIdStr,
        });
      }
    }
  }
}
