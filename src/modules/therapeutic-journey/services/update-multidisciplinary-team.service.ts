import { Injectable } from "@nestjs/common";
import { PtsRepository } from "@/modules/therapeutic-journey/repositories/pts.repository";
import type { UUID } from "@/common/uuid";
import { ProfessionalIsNotResponsible } from "@/modules/professional/errors/professional-is-not-responsible.error";
import { OneResponsibleIsNeeded } from "@/modules/professional/errors/one-responsible-is-needed.error";

type Params = {
  ptsId: UUID;
  professionalId: UUID;
  newResponsibleId?: UUID;
  multidisciplinaryTeamIds: UUID[];
};

@Injectable()
export class UpdateMultidisciplinaryTeamService {
  public constructor(private readonly ptsRepo: PtsRepository) {}

  public async execute({
    ptsId,
    professionalId,
    newResponsibleId,
    multidisciplinaryTeamIds,
  }: Params) {
    const pts = await this.ptsRepo.getPtsById(ptsId);

    if (!pts.isResponsabilityOfProfessional(professionalId)) {
      throw new ProfessionalIsNotResponsible();
    }

    const teamIdsStr = multidisciplinaryTeamIds.map(String);
    if (!teamIdsStr.includes(professionalId.toString()) && !newResponsibleId) {
      throw new OneResponsibleIsNeeded();
    }

    if (newResponsibleId) {
      pts.isResponsabilityOfProfessional(newResponsibleId);
      await this.ptsRepo.setNewResponsible(pts, newResponsibleId);
    }

    return await this.ptsRepo.updateMultidisciplinaryTeam(pts, multidisciplinaryTeamIds);
  }
}
