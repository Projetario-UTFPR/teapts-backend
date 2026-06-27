import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { UUID } from "@/common/uuid";
import { Patient } from "@/modules/patient/entities/patient.entity";
import { PatientsRepository } from "@/modules/patient/repositories/patients.repository";
import { InMemoryAccountsRepository } from "@test/mocks/repositories/in-memory/accounts.repository";
import { either as e, taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";

export class InMemoryPatientsRepository extends PatientsRepository {
  public items: Patient[] = [];

  public constructor(
    public accountsRepo: InMemoryAccountsRepository = new InMemoryAccountsRepository(),
  ) {
    super();
  }

  public createProfile(patient: Patient) {
    return pipe(
      () => this.accountsRepo.findAccountById(patient.getAccountId()),
      te.map(() => {
        this.items.push(patient);
        return patient;
      }),
    )();
  }

  public async existsByAccountId(accountId: UUID): Promise<Either<IrrecoverableError, boolean>> {
    return e.right(this.items.some((patient) => patient.belongsToAccount(accountId)));
  }
}
