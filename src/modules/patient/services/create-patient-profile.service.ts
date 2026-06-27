import { TransactionManager } from "@/common/transaction-manager";
import { type UUID } from "@/common/uuid";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { NotAdminError } from "@/modules/identity/errors/not-admin.error";
import { Patient } from "@/modules/patient/aggregates/patient.aggregate";
import { AccountAlreadyHasPatientProfileError } from "@/modules/patient/errors/account-already-has-patient-profile.error";
import { PatientsRepository } from "@/modules/patient/repositories/patients.repository";
import { SupportContact } from "@/modules/patient/value-objects/support-contact.vo";
import { Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

type Params = {
  /**
   * The account of the authenticated administrator.
   * It's outta scope of this service how it's ensured that this account
   * represents the authenticated user.
   */
  adminAccount: Account;
  /**
   * The ID of the account whose patient profile is to being created.
   */
  accountId: UUID;
  /**
   * A list of support contacts
   */
  supportContacts?: SupportContact[];
};

@Injectable()
export class CreatePatientProfileService {
  public constructor(
    private readonly patientsRepo: PatientsRepository,
    private readonly txManager: TransactionManager,
  ) {}

  public async execute({ accountId, adminAccount, supportContacts = [] }: Params) {
    const pipeline = pipe(
      true,
      te.fromPredicate(
        () => adminAccount.isAdmin(),
        () => new NotAdminError(),
      ),
      te.chainW(() => () => this.patientsRepo.existsByAccountId(accountId)),
      te.filterOrElseW(
        (exists) => !exists,
        () => new AccountAlreadyHasPatientProfileError(),
      ),
      te.chainEitherKW(() => Patient.create({ accountId, supportContacts })),
      te.chainW((patient) => () => this.patientsRepo.createProfile(patient)),
    );

    return await this.txManager.executePipeline(pipeline)();
  }
}
