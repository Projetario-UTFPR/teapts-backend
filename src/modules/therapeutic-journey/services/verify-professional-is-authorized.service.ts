import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { type UUID } from "@/common/uuid";
import { AccountNotFoundError } from "@/modules/identity/errors/account-not-found.error";
import { AccountsRepository } from "@/modules/identity/repositories/accounts.repository";
import { ProfessionalDoesNotBelongToUserAccountError } from "@/modules/therapeutic-journey/errors/professional-does-not-belong-to-user-account.error";
import { ProfessionalNotAuthorizedToAccessPts } from "@/modules/therapeutic-journey/errors/professional-not-authorized-to-access-pts.error";
import { PtsNotFoundError } from "@/modules/therapeutic-journey/errors/pts-not-found.error";
import { PtsRepository } from "@/modules/therapeutic-journey/repositories/pts.repository";
import { Injectable } from "@nestjs/common";
import { either as e, taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";

type Params = {
  patientId: UUID;
  accountId?: UUID;
  professionalId?: UUID;
};

/**
 * Verifies whether given professional is authorized to perform some action regarding
 * a patient's current PTS.
 *
 * When an `accountId` is provided, `professionalId` must belong to it (if provided) and
 * the checks will be performed against account's professional profiles.
 *
 * When `professionalId` is provided (only), it must belong to the PTS multidisciplinary team
 * or else a {@link ProfessionalDoesNotBelongToUserAccountError `ProfessionalDoesNotBelongToUserAccountError`}
 * will be returned..
 *
 * When none is provided, it's guaranteed that the verification will fail with an
 * {@link ProfessionalNotAuthorizedToAccessPts `ProfessionalNotAuthorizedToAccessPts`} error.
 *
 * Read the parameters descriptions for more details.
 *
 * @note **This service does not ensure user identity**. It only checks that given professional
 * profile has access to the given PTS.
 */
@Injectable()
export class VerifyProfessionalIsAuthorizedService {
  public constructor(
    private readonly ptsRepository: PtsRepository,
    private readonly accountsRepository: AccountsRepository,
  ) {}

  public async execute({
    patientId,
    accountId,
    professionalId,
  }: Params): Promise<
    Either<
      | IrrecoverableError
      | ProfessionalNotAuthorizedToAccessPts
      | ProfessionalDoesNotBelongToUserAccountError,
      void
    >
  > {
    return await pipe(
      te.Do,
      te.apSW("pts", () => this.ptsRepository.findActivePtsByPatientId(patientId)),
      te.apSW(
        "account",
        accountId ? () => this.accountsRepository.findAccountById(accountId) : te.right(undefined),
      ),
      te.chainFirstEitherKW(({ account, pts }) => {
        const professionalProfileDoesntMatchAccount =
          professionalId && account && !account.getProfessionalIds().includes(professionalId);

        if (professionalProfileDoesntMatchAccount) {
          return e.left(new ProfessionalDoesNotBelongToUserAccountError(professionalId));
        }

        const anyProfileFromAccountIsAuthorized =
          account
            ?.getProfessionalIds()
            .some((professionalId) => pts.canBeModifiedByProfessional(professionalId)) ?? false;

        const specifiedProfessionalProfileIsAuthorized =
          !!professionalId && pts.canBeModifiedByProfessional(professionalId);

        const professionalIsAuthorized =
          specifiedProfessionalProfileIsAuthorized || anyProfileFromAccountIsAuthorized;

        return professionalIsAuthorized
          ? e.right(undefined)
          : e.left(new ProfessionalNotAuthorizedToAccessPts());
      }),
      te.map((_) => {}),
      te.mapLeft((error) => {
        const couldNotFindEntities =
          error instanceof AccountNotFoundError || error instanceof PtsNotFoundError;

        if (!couldNotFindEntities) return error;
        return new ProfessionalNotAuthorizedToAccessPts();
      }),
    )();
  }
}
