import { Injectable } from "@nestjs/common";
import { PtsRepository } from "@/modules/therapeutic-journey/repositories/pts.repository";
import type { UUID } from "@/common/uuid";
import { ProfessionalsRepository } from "@/modules/professional/professionals.repository";
import { PtsNotFoundError } from "@/modules/therapeutic-journey/errors/pts-not-found.error";
import { Either, isLeft, left } from "fp-ts/lib/Either";
import { ProfessionalIsNotRegisteredError } from "@/modules/therapeutic-journey/errors/professional-is-not-registered.error";
import { ProfessionalIsNotResponsible } from "@/modules/therapeutic-journey/errors/professional-is-not-responsible.error";
import { ProfessionalCannotRemoveItselfWithoutSubstituteError } from "@/modules/therapeutic-journey/errors/professional-cannot-remove-itself-without-substitute.error";
import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { ProfessionalDoesNotBelongToUserAccountError } from "@/modules/therapeutic-journey/errors/professional-does-not-belong-to-user-account.error";
import { ProfessionalProfileNotFoundError } from "@/modules/professional/errors/professional-profile-not-found.error";

type Params = {
  ptsId: UUID;
  professionalId: UUID;
  newResponsibleId?: UUID;
  multidisciplinaryTeamIds: UUID[];
  accountId: UUID;
};

type UpdateMultidisciplinaryTeamResult = Either<
  | PtsNotFoundError
  | ProfessionalIsNotRegisteredError
  | ProfessionalDoesNotBelongToUserAccountError
  | ProfessionalCannotRemoveItselfWithoutSubstituteError
  | ProfessionalProfileNotFoundError
  | IrrecoverableError,
  void
>;

@Injectable()
export class UpdateMultidisciplinaryTeamService {
  public constructor(
    private readonly ptsRepo: PtsRepository,
    private readonly professionalsRepo: ProfessionalsRepository,
  ) { }

  public async execute({
    ptsId,
    professionalId,
    newResponsibleId,
    multidisciplinaryTeamIds,
    accountId,
  }: Params): Promise<UpdateMultidisciplinaryTeamResult> {
    const ptsResult = await this.ptsRepo.getById(ptsId);
    const professional = await this.professionalsRepo.findById(professionalId);

    if (isLeft(ptsResult)) {
      return left(ptsResult.left);
    }

    const pts = ptsResult.right;

    if (isLeft(professional)) {
      return left(professional.left);
    }

    if (!professional.right.belongsToAccount(accountId)) {
      return left(new ProfessionalDoesNotBelongToUserAccountError(professionalId));
    }

    if (!pts.isResponsabilityOfProfessional(professionalId)) {
      return left(new ProfessionalIsNotResponsible());
    }

    const isResponsibleRemovingItself = !multidisciplinaryTeamIds.includes(professionalId);
    if (isResponsibleRemovingItself) {
      if (!newResponsibleId) {
        return left(new ProfessionalCannotRemoveItselfWithoutSubstituteError());
      }

      const newResponsible = await this.professionalsRepo.findById(newResponsibleId);
      if (isLeft(newResponsible)) {
        const error = newResponsible.left;

        if (error instanceof ProfessionalProfileNotFoundError) {
          return left(new ProfessionalIsNotRegisteredError("responsible"));
        }

        return left(error);
      }

      pts.changeResponsibleProfessional(newResponsibleId, multidisciplinaryTeamIds);
    }

    pts.updateMultidisciplinaryTeam(multidisciplinaryTeamIds);

    return await this.ptsRepo.save(pts);
  }
}
