import { TransactionManager } from "@/common/transaction-manager";
import { UUID } from "@/common/uuid";
import { PtsDoesNotBelongToPatientError } from "@/modules/therapeutic-journey/errors/pts-does-not-belong-to-patient.error";
import { PtsNotFoundError } from "@/modules/therapeutic-journey/errors/pts-not-found.error";
import { PtsRepository } from "@/modules/therapeutic-journey/repositories/pts.repository";
import { Injectable } from "@nestjs/common";
import { either as e, taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

type Params = {
  patientId: UUID;
  ptsId: UUID;
};

/**
 * Rejects the (draft) PTS identified by `ptsId` (if, and only if, it belongs to the patient
 * identified by `patientId`).
 */
@Injectable()
export class RejectDraftPtsService {
  public constructor(
    private readonly ptsRepo: PtsRepository,
    private readonly txManager: TransactionManager,
  ) {}

  public execute({ patientId, ptsId }: Params) {
    const pipeline = pipe(
      () => this.ptsRepo.getById(ptsId),
      te.mapLeft((error) =>
        error instanceof PtsNotFoundError ? new PtsDoesNotBelongToPatientError(ptsId) : error,
      ),
      te.chainFirstEitherKW((pts) => {
        if (pts.belongsToPatient(patientId)) return pts.reject();
        return e.left(new PtsDoesNotBelongToPatientError(ptsId));
      }),
      te.mapLeft((err) => err),
      te.chainW((pts) => () => this.ptsRepo.save(pts)),
    );

    return this.txManager.executePipeline(pipeline)();
  }
}
