import { InvalidCredentialsError } from "@/modules/identity/errors/invalid-credentials.error";
import { CreateAccountService } from "@/modules/identity/services/create-account.service";
import { MockHasherAndComparator } from "@test/mocks/crypto/mock-hasher-and-comparator";
import { InMemoryAccountsRepository } from "@test/mocks/repositories/in-memory/accounts.repository";
import { either } from "fp-ts";

describe("[Service] Authenticate Account", async () => {
  let hasherAndComparator = new MockHasherAndComparator();
  let accountsRepo: InMemoryAccountsRepository;
  const professionalProfilesIds = [];
  const name = "FoooooBar";
  const email = "existingandknown@email.com";
  const plainPassword = "12345678";

  let sut: CreateAccountService;

  beforeEach(async () => {
    accountsRepo = new InMemoryAccountsRepository();
    sut = new CreateAccountService(hasherAndComparator, accountsRepo);
  });

  it("should successfully register an account if credentials are valid", async () => {
    const result = await sut.execute({ plainPassword, email, name, professionalProfilesIds });
    assert(either.isRight(result), "it should register an user when credentials are all valid");
  });

  it("should refuse to register an user with incorrect password length", async () => {
    const wrongPassword = "1";
    expect(wrongPassword.length).toBeLessThan(8);

    const result = await sut.execute({
      plainPassword: wrongPassword,
      email,
      name,
      professionalProfilesIds,
    });

    assert(either.isLeft(result), "it should not succeed since password has incorrect length");
    expect(result.left).toBeInstanceOf(InvalidCredentialsError);
  });

  it("should refuse to register an user with incorrect email syntax", async () => {
    const result = await sut.execute({
      email: "nonexistingemail.com",
      plainPassword,
      name,
      professionalProfilesIds,
    });

    assert(either.isLeft(result), "it should not succeed since email has incorrect syntax");
    expect(result.left).toBeInstanceOf(InvalidCredentialsError);
  });

  it("should refuse to register an user with incorrect user name length ", async () => {
    const result = await sut.execute({
      email,
      plainPassword,
      name: "La",
      professionalProfilesIds,
    });

    assert(either.isLeft(result), "it should not succeed since user name has incorrect length");
    expect(result.left).toBeInstanceOf(InvalidCredentialsError);
  });
});
