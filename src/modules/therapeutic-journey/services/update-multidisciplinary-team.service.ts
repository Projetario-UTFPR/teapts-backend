import { Injectable } from "@nestjs/common";
import { PtsRepository } from "@/modules/therapeutic-journey/repositories/pts.repository";
import { ProjetoTerapeuticoSingular } from "@/modules/therapeutic-journey/aggregates/pts.aggregate";
import { ProfessionalsRepository } from "@/modules/professional/professionals.repository";
import type { UUID } from "@/common/uuid";
import { ProfessionalIsNotResponsible } from "@/modules/professional/errors/professional-is-not-responsible.error";
import { OneResponsibleIsNeeded } from "@/modules/professional/errors/one-responsible-is-needed.error";

type Params = {
  pts: ProjetoTerapeuticoSingular;
  professionalId: UUID;
  newResponsibleId?: UUID;
  multidisciplinaryTeamIds: UUID[];
};

@Injectable()
export class UpdateMultidisciplinaryTeam {
  public constructor(
    private readonly ptsRepo: PtsRepository,
    private readonly professionalsRepo: ProfessionalsRepository,
  ) {}

  public async execute({
    pts,
    professionalId,
    newResponsibleId,
    multidisciplinaryTeamIds,
  }: Params) {
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
