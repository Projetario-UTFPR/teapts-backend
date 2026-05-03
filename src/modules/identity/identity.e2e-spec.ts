import { AppModule } from "@/app.module";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import supertest from "supertest";
import request from "supertest";
import type { App } from "supertest/types";

describe("[e2e] Identity Controller (v1)", () => {
  let app: INestApplication<App>;

  const name = "FoooooBar";
  const email = "existingandknown@email.com";
  const plainPassword = "12345678";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  test("create account route is public", async () => {
    const response = await request(app.getHttpServer()).post("/v1/identities/create-account");
    expect(response.status, "A rota não deveria ser privada.").not.toBe(401);
  });

  it("should refuse to register an user with incorrect email syntax", async () => {
    const response = await supertest(app.getHttpServer())
      .post("/v1/identities/create-account")
      .send({ name, email: "existingandknownemail.com", plainPassword })
      .expect(422);

    console.log(response.body);
    await supertest(app.getHttpServer())
      .post("/v1/identities/create-account")
      .send({ name, email, plainPassword })
      .expect(200);
  });

  it("should refuse to register an user with incorrect password length", async () => {
    await supertest(app.getHttpServer())
      .post("/v1/identities/create-account")
      .send({ name, email, plainPassword: "1" })
      .expect(401);

    await supertest(app.getHttpServer())
      .post("/v1/identities/create-account")
      .send({ name, email, plainPassword })
      .expect(200);
  });

  it("should refuse to register an user with incorrect user name length ", async () => {
    await supertest(app.getHttpServer())
      .post("/v1/identities/create-account")
      .send({ name: "La", email, plainPassword })
      .expect(401);

    await supertest(app.getHttpServer())
      .post("/v1/identities/create-account")
      .send({ name, email, plainPassword })
      .expect(200);
  });
});
