import type { INestApplication } from "@nestjs/common";
import accountsFactory from "@test/factories/accounts.factory";
import { either } from "fp-ts";
import { App } from "supertest/types";
import { CreateAccountService } from "@/modules/identity/services/create-account.service";
import { AccountsRepository } from "@/modules/identity/repositories/accounts.repository";
import { MockHasherAndComparator } from "@test/mocks/crypto/mock-hasher-and-comparator";
import { AccountWithEmailAlreadyExistError } from "@/modules/identity/errors/account-with-email-already-exist.error";
import { faker } from "@faker-js/faker";
import { getTestingApp } from "@test/get-testing-app";

describe("[Integration] Prisma Accounts Repository", () => {
  let hasherAndComparator = new MockHasherAndComparator();
  let accountRepo: AccountsRepository;
  let sut: CreateAccountService;

  const knownEmail = "existingandknown@email.com";

  beforeAll(async () => {
    let app: INestApplication<App> = await getTestingApp();

    accountRepo = app.get(AccountsRepository);
    sut = app.get(CreateAccountService);

    await app.init();
  });

  beforeEach(async () => {
    const account = await accountsFactory.create(
      { email: knownEmail },
      { hasher: hasherAndComparator },
    );

    accountRepo.create(account);
  });

  it("it should deny registiring account that email already exists", async () => {
    const result = await sut.execute({
      name: faker.person.fullName(),
      email: knownEmail,
      plainPassword: "12345678",
    });

    assert(either.isLeft(result), "it should have denied the account creation");
    expect(result.left).toBeInstanceOf(AccountWithEmailAlreadyExistError);
  });

  it("it should register the account if all credentials are valid", async () => {
    const result = await sut.execute({
      name: faker.person.fullName(),
      email: "another@email.com",
      plainPassword: "12345678",
    });

    assert(either.isRight(result), "it should have created the account");
  });
});
