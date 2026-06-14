import { PrismaService } from "@/infra/prisma/prisma";
import { Hasher } from "@/modules/crypto/hasher";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { Professional } from "@/modules/professional/entities/professional.aggregate";
import { Controller, Get, type INestApplication } from "@nestjs/common";
import accountsFactory from "@test/factories/accounts.factory";
import professionalsFactory from "@test/factories/professionals.factory";
import { getTestingApp } from "@test/get-testing-app";
import supertest from "supertest";
import request from "supertest";
import type { App } from "supertest/types";

const protectedRoute = "/dev/tests/protected";

@Controller()
class TestController {
  @Get(protectedRoute)
  public async protectedRoute() {}
}

describe("[e2e] Sessions Controller (v1)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let hasher: Hasher;

  const password = "12345";
  let account: Account;
  let professionalProfilesOfAccount: Professional[] = [];

  beforeAll(async () => {
    app = await getTestingApp({ extraControllers: [TestController] });

    prisma = app.get(PrismaService);
    hasher = app.get(Hasher);

    await app.init();
  });

  beforeEach(async () => {
    const passwordHash = await hasher.hash(password);
    account = await accountsFactory.createAndPersist(prisma, { passwordHash });

    professionalProfilesOfAccount = [
      await professionalsFactory.createAndPersist(prisma, {
        account: account,
        specialism: Professional.Specialism.Doctor,
      }),
      await professionalsFactory.createAndPersist(prisma, {
        account: account,
        specialism: Professional.Specialism.Physiotherapist,
      }),
    ];
  });

  test("login route is public", async () => {
    const response = await request(app.getHttpServer()).post("/v1/sessions/login");
    expect(response.status, "A rota não deveria ser privada.").not.toBe(401);
  });

  it("should authenticate the user", async () => {
    await supertest(app.getHttpServer())
      .post("/v1/sessions/login")
      .send({
        email: account.getEmail(),
        password: "wrong" + password,
      })
      .expect(401);

    await supertest(app.getHttpServer())
      .post("/v1/sessions/login")
      .send({
        email: account.getEmail(),
        password,
      })
      .expect(200);
  });

  it("should generate access and refresh JWTs upon successful login", async () => {
    const response = await supertest(app.getHttpServer())
      .post("/v1/sessions/login")
      .send({
        email: account.getEmail(),
        password,
      })
      .expect(200);

    expect(response.body, "response should contain access token").toHaveProperty("accessToken");
    expect(response.body, "response should contain refresh token").toHaveProperty("refreshToken");
  });

  test("access token allows access to protected routes", async () => {
    await request(app.getHttpServer()).get(protectedRoute).expect(401);

    const response = await supertest(app.getHttpServer())
      .post("/v1/sessions/login")
      .send({
        email: account.getEmail(),
        password,
      })
      .expect(200);

    const { accessToken } = response.body;

    await request(app.getHttpServer())
      .get(protectedRoute)
      .set({ authorization: `Bearer ${accessToken}` })
      .expect(200);
  });

  it("should return an auth collection along with the tokens", async () => {
    // create a third professional profile that **does not** belong to this user
    // so that we ensure it's not leaking other professional profiles
    await professionalsFactory.createAndPersist(prisma);

    const response = await supertest(app.getHttpServer())
      .post("/v1/sessions/login")
      .send({
        email: account.getEmail(),
        password,
      })
      .expect(200);

    expect(response.body, "response should contain an auth collection object").toHaveProperty(
      "authCollection",
    );

    const { authCollection } = response.body;

    expect(
      authCollection["account"],
      "auth collection should contain account relevant data",
    ).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
      }),
    );

    const { professionalProfiles } = authCollection;

    expect(
      Array.isArray(professionalProfiles),
      "professionals profiles property should be an array",
    ).toBe(true);

    expect(
      professionalProfiles.length,
      "it should bring those and only those professional profiles that belong to the user's account",
    ).toBe(2);

    professionalProfiles.forEach((profile: unknown) => {
      expect(
        profile,
        "it should return the relevant data regarding each professional profile of the user's account",
      ).toEqual(
        expect.objectContaining({
          professionalId: expect.any(String),
          specialism: expect.toBeOneOf(Object.values(Professional.Specialism)),
        }),
      );
    });

    expect(
      professionalProfiles.map(({ professionalId }) => professionalId),
      "it should have returned the exact professional profiles that belongs to the user",
    ).toEqual(
      expect.arrayContaining(
        professionalProfilesOfAccount.map((professional) => professional.getId().toString()),
      ),
    );
  });
});
