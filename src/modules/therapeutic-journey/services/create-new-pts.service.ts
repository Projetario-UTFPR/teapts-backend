import { Injectable } from "@nestjs/common";
import { pipe } from "fp-ts/lib/function";
import { taskEither as te } from "fp-ts";
import { ResourceNotFoundError } from "@/common/errors/resource-not-found.error";
import { ConflictError } from "@/common/errors/conflict.error";
import { PtsRepository } from "@/modules/therapeutic-journey/repositories/pts.repository";
import { AccountsRepository } from "@/modules/identity/repositories/accounts.repository";
import { ProjetoTerapeuticoSingular } from "@/modules/therapeutic-journey/aggregates/pts.aggregate";

type Params = {
  professionalId: string;
  patientId: string;
  socialSituation: string;
};

@Injectable()
export class CreateNewPtsService {
  public constructor(
    private readonly ptsRepo: PtsRepository,
    private readonly accountsRepo: AccountsRepository,
  ) {}

  public execute({ professionalId, patientId, socialSituation }: Params) {
    const pts = ProjetoTerapeuticoSingular.create({
      patientId,
      responsibleProfessionalId: professionalId,
      socialSituation,
    });

    return pipe(
      this.findPatient(patientId),
      te.chainW(() => this.ensureNoActivePts(patientId)),
      te.chainW(() => () => this.ptsRepo.createNewPts(pts)),
    )();
  }

  private findPatient(patientId: string) {
    return pipe(
      () => this.accountsRepo.findAccountById(patientId),
      te.mapLeft((error) => {
        return error instanceof ResourceNotFoundError
          ? new ResourceNotFoundError({ message: "Paciente não encontrado.", subject: "Paciente" })
          : error;
      }),
    );
  }

  private ensureNoActivePts(patientId: string) {
    return pipe(
      () => this.ptsRepo.ptsExistsByPatientId(patientId),
      te.chainW((exists) => {
        if (exists) {
          return te.left(
            new ConflictError({
              message: "Já existe uma jornada terapêutica ativa para este paciente.",
            }),
          );
        }
        return te.right(undefined);
      }),
    );
  }
}
