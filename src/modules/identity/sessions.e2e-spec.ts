import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/prisma/prisma";
import { Hasher } from "@/modules/crypto/hasher";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { Controller, Get, type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import accountsFactory from "@test/factories/accounts.factory";
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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestController],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    hasher = app.get(Hasher);

    const passwordHash = await hasher.hash(password);
    account = await accountsFactory.createAndPersist(prisma, { passwordHash });
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
});
