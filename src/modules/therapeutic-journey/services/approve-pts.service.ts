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
 * Approves the PTS identified by `ptsId` (if, and only if, it belongs to the patient
 * identified by `patientId`). Every other PTS in `draft` status will be rejected
 * atomically.
 */
@Injectable()
export class ApproveDraftPtsService {
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
        if (!pts.belongsToPatient(patientId)) {
          return e.left(new PtsDoesNotBelongToPatientError(ptsId));
        }

        return e.right(undefined);
      }),
      te.chainFirstEitherKW((pts) => pts.acceptAndBeginPlanning()),
      te.chainW((pts) => () => this.ptsRepo.save(pts)),
      te.chainFirstW(() => () => this.ptsRepo.rejectEveryProposalByPatientId(patientId)),
    );

    return this.txManager.executePipeline(pipeline)();
  }
}
