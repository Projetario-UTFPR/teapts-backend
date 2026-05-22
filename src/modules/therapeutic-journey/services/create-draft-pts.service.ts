import { Injectable } from "@nestjs/common";
import { pipe } from "fp-ts/lib/function";
import { either as e, taskEither as te } from "fp-ts";
import { PtsRepository } from "@/modules/therapeutic-journey/repositories/pts.repository";
import { AccountsRepository } from "@/modules/identity/repositories/accounts.repository";
import { ProjetoTerapeuticoSingular } from "@/modules/therapeutic-journey/aggregates/pts.aggregate";
import { ProfessionalsRepository } from "@/modules/professional/professionals.repository";
import type { UUID } from "@/common/uuid";
import { PatientAlreadyHasActivePtsError } from "@/modules/therapeutic-journey/errors/patient-already-has-active-pts.error";
import { Professional } from "@/modules/professional/entities/professional.aggregate";
import { ProfessionalDoesNotBelongToUserAccountError } from "@/modules/therapeutic-journey/errors/professional-does-not-belong-to-user-account.error";

type Params = {
  /**
   * The ID of the account of the professional (profile) trying to create the PTS.
   */
  accountId: UUID;
  /**
   * The ID of the professional profile under which the user is trying to create the PTS.
   */
  professionalId: UUID;
  patientId: UUID;
  socialSituation: string;
  multidisciplinaryTeamIds?: UUID[];
};

@Injectable()
export class CreateDraftPtsService {
  public constructor(
    private readonly ptsRepo: PtsRepository,
    private readonly accountsRepo: AccountsRepository,
    private readonly professionalsRepo: ProfessionalsRepository,
  ) {}

  public execute({
    professionalId,
    patientId,
    socialSituation,
    multidisciplinaryTeamIds,
    accountId,
  }: Params) {
    return pipe(
      te.Do,
      te.apS("patientAccount", () => this.accountsRepo.findAccountById(patientId)),
      te.apS("professional", () => this.professionalsRepo.findById(professionalId)),
      te.chainFirstEitherKW(({ professional }) =>
        this.ensureProfessionalProfileBelongsToUser(professional, accountId),
      ),
      te.chainFirstW(({ patientAccount }) => this.ensureNoActivePts(patientAccount.getId())),
      te.bindW("pts", ({ patientAccount, professional }) => {
        const pts = ProjetoTerapeuticoSingular.create({
          patientId: patientAccount.getId(),
          responsibleProfessionalId: professional.getId(),
          socialSituation,
          multidisciplinaryTeamIds,
        });

        return te.right(pts);
      }),
      te.chainW((args) => () => this.ptsRepo.createNewPts(args.pts)),
    )();
  }

  private ensureProfessionalProfileBelongsToUser(professional: Professional, accountId: UUID) {
    if (professional.belongsToAccount(accountId)) return e.right(undefined);
    return e.left(new ProfessionalDoesNotBelongToUserAccountError(professional.getId()));
  }

  private ensureNoActivePts(patientId: UUID) {
    return pipe(
      () => this.ptsRepo.activePtsExistsByPatientId(patientId),
      te.chainEitherKW((thereIsAnActivePts) => {
        if (thereIsAnActivePts) return e.left(new PatientAlreadyHasActivePtsError());
        return e.right(undefined);
      }),
    );
  }
}
