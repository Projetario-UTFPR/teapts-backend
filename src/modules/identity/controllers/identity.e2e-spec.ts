import { PrismaService } from "@/infra/prisma/prisma";
import { Hasher } from "@/modules/crypto/hasher";
import { SignUpDto } from "@/modules/identity/dtos/signUp.dto";
import { faker } from "@faker-js/faker";
import { type INestApplication } from "@nestjs/common";
import accountsFactory from "@test/factories/accounts.factory";
import { getTestingApp } from "@test/get-testing-app";
import supertest from "supertest";
import request from "supertest";
import type { App } from "supertest/types";

describe("[e2e] Identity Controller (v1)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let hasher: Hasher;

  const name = faker.person.fullName();
  const email = "anotherknown@email.com";
  const existingEmail = "existingandknown@email.com";
  const plainPassword = "12345678";

  beforeAll(async () => {
    app = await getTestingApp();

    prisma = app.get(PrismaService);
    hasher = app.get(Hasher);

    await app.init();
  });

  const assertIsValidationErrorsBag = (response: supertest.Response) => {
    expect(response.body, "response should be a validation bag object").toHaveProperty("errors");
  };

  test("create account route is public", async () => {
    const response = await request(app.getHttpServer()).post("/v1/identities/create-account");
    expect(response.status, "A rota não deveria ser privada.").not.toBe(401);
  });

  it("should refuse to register an user with incorrect email syntax", async () => {
    const failureResponse = await supertest(app.getHttpServer())
      .post("/v1/identities/create-account")
      .send({
        email: "invalidemail.com",
        password: plainPassword,
        name,
      } satisfies SignUpDto.Type)
      .expect(422);

    assertIsValidationErrorsBag(failureResponse);
    expect(
      failureResponse.body.errors,
      "response should contain email validation errors",
    ).toHaveProperty("email");
  });

  it("should refuse to register an user with incorrect password length", async () => {
    const failureRes = await supertest(app.getHttpServer())
      .post("/v1/identities/create-account")
      .send({ name, email, password: "1" })
      .expect(422);

    assertIsValidationErrorsBag(failureRes);
    expect(
      failureRes.body.errors,
      "response should contain password validation errors",
    ).toHaveProperty("password");
  });

  it("should refuse to register an user with incorrect user name length ", async () => {
    const failureResponse = await supertest(app.getHttpServer())
      .post("/v1/identities/create-account")
      .send({ name: "La", email, password: plainPassword } satisfies SignUpDto.Type)
      .expect(422);

    assertIsValidationErrorsBag(failureResponse);
    expect(
      failureResponse.body.errors,
      "response should contain name validation errors",
    ).toHaveProperty("name");
  });

  it("should create an account successfully", async () => {
    await supertest(app.getHttpServer())
      .post("/v1/identities/create-account")
      .send({ name, email, password: plainPassword } satisfies SignUpDto.Type)
      .expect(204);
  });

  it("should not allow to create an account with an email that already exists", async () => {
    await accountsFactory.createAndPersist(
      prisma,
      {
        email: existingEmail,
        name,
        plainPassword,
      },
      { hasher },
    );

    const response = await supertest(app.getHttpServer())
      .post("/v1/identities/create-account")
      .send({ name, email: existingEmail, password: plainPassword } satisfies SignUpDto.Type)
      .expect(409);

    expect(response.body).toHaveProperty("message");
    expect(response.body.message.includes("email")).toBeTruthy();
  });
});
