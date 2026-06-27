import { Account } from "@/modules/identity/entities/account.aggregate";
import { AccountNotFoundError } from "@/modules/identity/errors/account-not-found.error";
import { NotAdminError } from "@/modules/identity/errors/not-admin.error";
import { AccountAlreadyHasPatientProfileError } from "@/modules/patient/errors/account-already-has-patient-profile.error";
import { CreatePatientProfileService } from "@/modules/patient/services/create-patient-profile.service";
import accountsFactory from "@test/factories/accounts.factory";
import patientsFactory from "@test/factories/patients.factory";
import { InMemoryAccountsRepository } from "@test/mocks/repositories/in-memory/accounts.repository";
import { InMemoryPatientsRepository } from "@test/mocks/repositories/in-memory/patients.repository";
import { InMemoryTransactionManager } from "@test/mocks/transaction-manager";
import { either as e } from "fp-ts";

describe("[Service] Create Patient Profile", async () => {
  let accountsRepository: InMemoryAccountsRepository;
  let patientsRepository: InMemoryPatientsRepository;
  const txManager = new InMemoryTransactionManager();

  let sut: CreatePatientProfileService;

  beforeEach(() => {
    accountsRepository = new InMemoryAccountsRepository();
    patientsRepository = new InMemoryPatientsRepository(accountsRepository);

    sut = new CreatePatientProfileService(patientsRepository, txManager);
  });

  it("should require the user to be an admin in order to create a patient profile for some account", async () => {
    const nonAdminUser = await accountsFactory.create();
    const targetAccount = await accountsFactory.create();

    accountsRepository.accounts.push(nonAdminUser, targetAccount);

    const result = await sut.execute({
      accountId: targetAccount.getId(),
      adminAccount: nonAdminUser,
    });

    expect(e.isLeft(result)).toBe(true);
    expect(result["left"]).toBeInstanceOf(NotAdminError);
  });

  it("should create a patient profile for the account", async () => {
    const adminAccount = await accountsFactory.create({ role: Account.Role.Admin });
    const targetAccount = await accountsFactory.create();

    accountsRepository.accounts.push(adminAccount, targetAccount);

    const result = await sut.execute({
      accountId: targetAccount.getId(),
      adminAccount,
    });

    expect(e.isRight(result)).toBe(true);
    expect(patientsRepository.items.length).toBe(1);
    expect(patientsRepository.items[0].belongsToAccount(targetAccount)).toBe(true);
  });

  it("should not create a patient profile if the selected account already has one", async () => {
    const adminAccount = await accountsFactory.create({ role: Account.Role.Admin });
    const targetAccount = await accountsFactory.create();

    accountsRepository.accounts.push(adminAccount, targetAccount);
    patientsRepository.items.push(
      await patientsFactory.create({ accountId: targetAccount.getId() }),
    );

    const result = await sut.execute({
      accountId: targetAccount.getId(),
      adminAccount,
    });

    expect(e.isLeft(result)).toBe(true);
    expect(result["left"]).toBeInstanceOf(AccountAlreadyHasPatientProfileError);
  });

  it("should not create a patient profile if the account does not exist", async () => {
    const adminAccount = await accountsFactory.create({ role: Account.Role.Admin });

    accountsRepository.accounts.push(adminAccount);

    const result = await sut.execute({
      accountId: "unexisting-account",
      adminAccount,
    });

    expect(e.isLeft(result)).toBe(true);
    expect(result["left"]).toBeInstanceOf(AccountNotFoundError);
  });
});
