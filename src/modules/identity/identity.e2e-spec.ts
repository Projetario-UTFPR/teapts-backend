import { AppModule } from "@/app.module";
import { SignUpDto } from "@/modules/identity/dtos/signUp.dto";
import { faker } from "@faker-js/faker";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import supertest from "supertest";
import request from "supertest";
import type { App } from "supertest/types";

describe("[e2e] Identity Controller (v1)", () => {
  let app: INestApplication<App>;

  const name = faker.person.fullName();
  const email = "existingandknown@email.com";
  const plainPassword = "12345678";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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
        email: "existingandknownemail.com",
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
    const response = await supertest(app.getHttpServer())
      .post("/v1/identities/create-account")
      .send({ name, email, password: plainPassword } satisfies SignUpDto.Type)
      .expect(204);

    console.log(response.body);
  });
});
