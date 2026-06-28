import { AssignTokenService } from "@/infra/auth/services/assign-token.service";
import { PrismaService } from "@/infra/prisma/prisma";
import { Hasher } from "@/modules/crypto/hasher";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { CreatePatientProfileDto } from "@/modules/patient/dtos/create-patient-profile.dto";
import { faker } from "@faker-js/faker";
import { type INestApplication } from "@nestjs/common";
import accountsFactory from "@test/factories/accounts.factory";
import patientsFactory from "@test/factories/patients.factory";
import { getTestingApp } from "@test/get-testing-app";
import { either as e } from "fp-ts";
import supertest from "supertest";
import { type App } from "supertest/types";

describe("[e2e] Patients Controller :: Create Patient Profile (v1)", async () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let hasher: Hasher;
  let tokensService: AssignTokenService;

  let accessToken: string;

  const ENDPOINT = "/v1/patients/create";

  beforeAll(async () => {
    app = await getTestingApp();

    prisma = app.get(PrismaService);
    hasher = app.get(Hasher);
    tokensService = app.get(AssignTokenService);

    await app.init();
  });

  beforeEach(async () => {
    const adminAccount = await accountsFactory.createAndPersist(
      prisma,
      { plainPassword: "12345678", role: Account.Role.Admin },
      { hasher },
    );

    const tokens = await tokensService.execute({ account: adminAccount });

    if (e.isLeft(tokens)) {
      throw new Error("Could not proceed with tests due to failure on getting an access token.");
    }

    accessToken = tokens.right.accessToken;
  });

  it("should create a patient profile for given patient", async () => {
    const patientAccount = await accountsFactory.createAndPersist(prisma);

    const response = await supertest(app.getHttpServer())
      .post(ENDPOINT)
      .set("authorization", `Bearer ${accessToken}`)
      .send({
        accountId: patientAccount.getId().toString(),
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({ supportContacts: expect.arrayContaining([]) }),
    );

    const patientProfiles = await prisma.patient.count({
      where: { accountId: patientAccount.getId().toString() },
    });

    expect(patientProfiles).toBe(1);
  });

  it("should not let create another profile for a patient", async () => {
    const patientAccount = await accountsFactory.createAndPersist(prisma);
    await patientsFactory.createAndPersist(prisma, { accountId: patientAccount.getId() });

    await supertest(app.getHttpServer())
      .post(ENDPOINT)
      .set("authorization", `Bearer ${accessToken}`)
      .send({
        accountId: patientAccount.getId().toString(),
      })
      .expect(400);

    const patientProfiles = await prisma.patient.count({
      where: { accountId: patientAccount.getId().toString() },
    });

    expect(patientProfiles).toBe(1);
  });

  it("should handle patient profile with initial support contacts", async () => {
    const patientAccount = await accountsFactory.createAndPersist(prisma);

    const response = await supertest(app.getHttpServer())
      .post(ENDPOINT)
      .set("authorization", `Bearer ${accessToken}`)
      .send({
        accountId: patientAccount.getId().toString(),
        supportContacts: [
          {
            name: faker.person.fullName(),
            description: faker.lorem.sentence(),
            phone: faker.phone.number(),
          },
          {
            name: faker.person.fullName(),
            description: faker.lorem.sentence(),
            phone: faker.phone.number(),
            email: faker.internet.email(),
          },
        ],
      } as CreatePatientProfileDto)
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({ supportContacts: expect.arrayContaining([]) }),
    );

    const patientProfiles = await prisma.patient.count({
      where: { accountId: patientAccount.getId().toString() },
    });

    expect(patientProfiles).toBe(1);
  });
});
