import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { type UUID } from "@/common/uuid";
import { AccountNotFoundError } from "@/modules/identity/errors/account-not-found.error";
import { Patient } from "@/modules/patient/entities/patient.entity";
import { type Either } from "fp-ts/lib/Either";

export abstract class PatientsRepository {
  /**
   * Creates a new patient profile for a given account.
   */
  public abstract createProfile(
    patient: Patient,
  ): Promise<Either<IrrecoverableError | AccountNotFoundError, Patient>>;

  public abstract existsByAccountId(accountId: UUID): Promise<Either<IrrecoverableError, boolean>>;
}
