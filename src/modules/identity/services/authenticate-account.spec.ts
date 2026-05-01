import { Account } from "@/modules/identity/entities/account.aggregate";
import { InvalidCredentialsError } from "@/modules/identity/errors/invalid-credentials.error";
import { AuthenticateAccountService } from "@/modules/identity/services/authenticate-account.service";
import accountsFactory from "@test/factories/accounts.factory";
import { MockHasherAndComparator } from "@test/mocks/crypto/mock-hasher-and-comparator";
import { InMemoryAccountsRepository } from "@test/mocks/repositories/in-memory/accounts.repository";
import { either } from "fp-ts";

describe("[Service] Authenticate Account", async () => {
  let hasherAndComparator = new MockHasherAndComparator();
  let accountsRepo: InMemoryAccountsRepository;
  let account: Account;
  const correctPassword = "12345";

  let sut: AuthenticateAccountService;

  beforeEach(async () => {
    accountsRepo = new InMemoryAccountsRepository();
    sut = new AuthenticateAccountService(hasherAndComparator, accountsRepo);

    const passwordHash = await hasherAndComparator.hash("12345");
    account = await accountsFactory.create({ passwordHash, email: "existingandknown@email.com" });
    accountsRepo.accounts.push(account);
  });

  it("should refuse to authenticate an user with incorrect password", async () => {
    const wrongPassword = "wrong password";
    expect(wrongPassword, "for this test purposes, the correct password mustn't be used").not.toBe(
      correctPassword,
    );

    const result = await sut.execute({
      email: account.getEmail(),
      plainPassword: wrongPassword,
    });

    assert(either.isLeft(result), "it should not have authenticated");
    expect(result.left).toBeInstanceOf(InvalidCredentialsError);
  });

  it("should successfully authenticate an account that exists if credentials are valid", async () => {
    const result = await sut.execute({ email: account.getEmail(), plainPassword: correctPassword });
    assert(either.isRight(result), "it should authenticate an user when credentials are all valid");
    expect(result.right.equals(account));
  });

  it("should not let user know that an account with given e-mail does not exist", async () => {
    const result = await sut.execute({
      email: "nonexisting@email.com",
      plainPassword: correctPassword,
    });

    assert(either.isLeft(result), "it should not succeed since account doesn't even exist");
    expect(result.left).toBeInstanceOf(InvalidCredentialsError);
    expect(result.left.message.includes("email")).not.toBeTruthy();
  });

  it("should not use comparator when there is no account", async () => {
    const spy = vi.spyOn(hasherAndComparator, "compare");

    await sut.execute({
      email: "nonexisting@email.com",
      plainPassword: correctPassword,
    });

    expect(spy).not.toHaveBeenCalled();
  });
});
