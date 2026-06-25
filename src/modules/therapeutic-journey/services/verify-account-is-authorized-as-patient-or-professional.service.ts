import { type UUID } from "@/common/uuid";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { Patient } from "@/modules/patient/entities/patient.entity";
import { VerifyProfessionalIsAuthorizedService } from "@/modules/therapeutic-journey/services/verify-professional-is-authorized.service";
import { Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

type Params = {
  /**
   * The ID of the patient whose resource is to be accessed.
   */
  patientId: UUID;
  /**
   * The possible {@link Patient `Patient`} instance associated to `account`.
   */
  accountPatientProfile?: Patient;
  /**
   * The account of the session user.
   */
  account: Account;
};

/**
 * Verifies whether the session user is authorized to access some of the patient's resources.
 *
 * When the user is the patient itself, it's authorized. Otherwise, the user must be a
 * professional related to this patient's PTS in order to access its resources.
 *
 * @returns "patient" or "professional" describing under which role the user got access to
 * that resource.
 *
 * @note It relies on {@link VerifyProfessionalIsAuthorizedService `VerifyProfessionalIsAuthorizedService`}.
 * It might worth checking its documentation as well.
 */
@Injectable()
export class VerifyAccountIsAuthorizedAsPatientOrProfessionalService {
  public constructor(
    private readonly verifyProfessionalIsAuthorized: VerifyProfessionalIsAuthorizedService,
  ) {}

  public async execute({ patientId, account, accountPatientProfile }: Params) {
    return pipe(
      true,
      te.fromPredicate(
        () => !!patientId && patientId === accountPatientProfile?.getId()?.toString(),
        () => false,
      ),
      te.map(() => "patient" as const),
      te.orElseW(() =>
        pipe(
          () => this.verifyProfessionalIsAuthorized.execute({ patientId, account }),
          te.map(() => "professional" as const),
        ),
      ),
    )();
  }
}
