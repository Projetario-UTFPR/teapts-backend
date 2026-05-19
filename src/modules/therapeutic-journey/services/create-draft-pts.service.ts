import { Injectable } from "@nestjs/common";
import { pipe } from "fp-ts/lib/function";
import { taskEither as te } from "fp-ts";
import { PtsRepository } from "@/modules/therapeutic-journey/repositories/pts.repository";
import { AccountsRepository } from "@/modules/identity/repositories/accounts.repository";
import { ProjetoTerapeuticoSingular } from "@/modules/therapeutic-journey/aggregates/pts.aggregate";
import { ProfessionalsRepository } from "@/modules/professional/professionals.repository";
import type { UUID } from "@/common/uuid";
import { PatientAlreadyHasActivePtsError } from "@/modules/therapeutic-journey/errors/patient-already-has-active-pts.error";

type Params = {
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

  public execute({ professionalId, patientId, socialSituation, multidisciplinaryTeamIds }: Params) {
    return pipe(
      te.Do,
      te.apS("patientAccount", () => this.accountsRepo.findAccountById(patientId)),
      te.apS("professional", () => this.professionalsRepo.findById(professionalId)),
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

  private ensureNoActivePts(patientId: UUID) {
    return pipe(
      () => this.ptsRepo.activePtsExistsByPatientId(patientId),
      te.chainW(
        te.fromPredicate(
          (ptsAlreadyExists) => {
            const canCreateNewPts = !ptsAlreadyExists;
            return canCreateNewPts;
          },
          () => new PatientAlreadyHasActivePtsError(),
        ),
      ),
      te.map(() => {}),
    );
  }
}
