/**
 * This service has no unit test since there is no business logic to test here.
 * Refer to e2e tests.
 */
import { TransactionManager } from "@/common/transaction-manager";
import { type UUID } from "@/common/uuid";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { ProfessionalNotAuthorizedToAccessPts } from "@/modules/therapeutic-journey/errors/professional-not-authorized-to-access-pts.error";
import { PtsNotFoundError } from "@/modules/therapeutic-journey/errors/pts-not-found.error";
import { PtsRepository } from "@/modules/therapeutic-journey/repositories/pts.repository";
import { VerifyProfessionalIsAuthorizedService } from "@/modules/therapeutic-journey/services/verify-professional-is-authorized.service";
import { Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

type Params = {
  patientId: UUID;
  /**
   * The account of the authenticated professional. Ensuring this *is*
   * the authenticated user's account is out of the scope of this service.
   */
  professionalAccount: Account;
  newSocialSituation: string;
};

@Injectable()
export class UpdateSocialSituationService {
  public constructor(
    private readonly txManager: TransactionManager,
    private readonly ptsRepository: PtsRepository,
    private readonly verifyProfessionalIsAuthorized: VerifyProfessionalIsAuthorizedService,
  ) {}

  public execute({ newSocialSituation, professionalAccount, patientId }: Params) {
    const pipeline = pipe(
      () => this.ptsRepository.findActivePtsByPatientId(patientId),
      te.mapLeft((error) =>
        error instanceof PtsNotFoundError ? new ProfessionalNotAuthorizedToAccessPts() : error,
      ),
      te.chainFirstW(
        (pts) => () =>
          this.verifyProfessionalIsAuthorized.execute({
            account: professionalAccount,
            pts,
            patientId,
          }),
      ),
      te.chainW((pts) => {
        pts.updateSocialSituation(newSocialSituation);
        return () => this.ptsRepository.save(pts);
      }),
    );

    return this.txManager.executePipeline(pipeline)();
  }
}
