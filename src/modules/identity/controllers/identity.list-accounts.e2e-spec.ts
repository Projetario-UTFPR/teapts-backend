import { AssignTokenService } from "@/infra/auth/services/assign-token.service";
import { PrismaService } from "@/infra/prisma/prisma";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { PaginatedAccountPresenter } from "@/modules/identity/presenters/paginated-accounts.presenter";
import { type INestApplication } from "@nestjs/common";
import accountsFactory from "@test/factories/accounts.factory";
import patientsFactory from "@test/factories/patients.factory";
import professionalsFactory from "@test/factories/professionals.factory";
import { getTestingApp } from "@test/get-testing-app";
import { either as e } from "fp-ts";
import request from "supertest";
import type { App } from "supertest/types";

describe("[e2e] Identity Controller :: List Accounts (v1)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokensService: AssignTokenService;
  let accessToken: string;

  const ENDPOINT = "/v1/identities";

  beforeAll(async () => {
    app = await getTestingApp();

    prisma = app.get(PrismaService);
    tokensService = app.get(AssignTokenService);

    await app.init();
  });

  beforeEach(async () => {
    const authorizedAccount = await accountsFactory.createAndPersist(prisma, {
      role: Account.Role.Admin,
    });

    const token = await tokensService.execute({ account: authorizedAccount });
    assert(e.isRight(token));
    accessToken = token.right.accessToken;
  });

  const createPatient = async () => {
    const account = await accountsFactory.createAndPersist(prisma);
    await patientsFactory.createAndPersist(prisma, { accountId: account.getId() });
    return account;
  };

  const createProfessionalAccount = async () => {
    const account = await accountsFactory.createAndPersist(prisma);
    await professionalsFactory.createAndPersist(prisma, { account });
    return account;
  };

  const createProfessionalAndPatientAccount = async () => {
    const account = await accountsFactory.createAndPersist(prisma);
    await professionalsFactory.createAndPersist(prisma, { account });
    await patientsFactory.createAndPersist(prisma, { accountId: account.getId() });
    return account;
  };

  const createAdminAndPatientAccount = async () => {
    const account = await accountsFactory.createAndPersist(prisma, {
      role: Account.Role.Admin,
    });
    await patientsFactory.createAndPersist(prisma, { accountId: account.getId() });
    return account;
  };

  test("list accounts is a protected route", async () => {
    await request(app.getHttpServer()).get(ENDPOINT).expect(401);
  });

  it.each(["admin", "professional", "professionalAndPatient", "adminAndPatient"] as const)(
    "should let admins or professionals list accounts",
    async (user) => {
      const authorizedAccounts = {
        admin: await accountsFactory.createAndPersist(prisma, { role: Account.Role.Admin }),
        professional: await createProfessionalAccount(),
        professionalAndPatient: await createProfessionalAndPatientAccount(),
        adminAndPatient: await createAdminAndPatientAccount(),
      };

      const userAccount = authorizedAccounts[user];
      const token = await tokensService.execute({ account: userAccount });
      assert(e.isRight(token));
      const accessToken = token.right.accessToken;

      await request(app.getHttpServer())
        .get(ENDPOINT)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
    },
  );

  it.each(["regular", "patient"] as const)(
    "should not let patients-only list accounts",
    async (user) => {
      const unauthorizedAccounts = {
        regular: await accountsFactory.createAndPersist(prisma, { role: Account.Role.User }),
        patient: await createPatient(),
      };

      const userAccount = unauthorizedAccounts[user];
      const token = await tokensService.execute({ account: userAccount });
      assert(e.isRight(token));
      const accessToken = token.right.accessToken;

      await request(app.getHttpServer())
        .get(ENDPOINT)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(403);
    },
  );

  describe("patients filter", () => {
    const PATIENTS_COUNT = 15;
    const NON_PATIENTS_COUNT = 15;

    beforeEach(async () => {
      await Promise.all(Array.from({ length: PATIENTS_COUNT }).map(() => createPatient()));

      await Promise.all(
        Array.from({ length: NON_PATIENTS_COUNT }).map(() =>
          accountsFactory.createAndPersist(prisma),
        ),
      );
    });

    it("should list only patients accounts", async () => {
      const response = await request(app.getHttpServer())
        .get(`${ENDPOINT}?limit=100&isPatient=true`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      const body = response.body as PaginatedAccountPresenter;

      expect(body.items.length).toBe(PATIENTS_COUNT);
      expect(body.items.every((account) => account.isPatient)).toBe(true);
    });

    it("should list only non-patients accounts", async () => {
      const response = await request(app.getHttpServer())
        .get(`${ENDPOINT}?limit=100&isPatient=false`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      const body = response.body as PaginatedAccountPresenter;

      expect(body.items.length).toBe(NON_PATIENTS_COUNT + 1); // the authenticated user is not a patient
      expect(body.items.every((account) => !account.isPatient)).toBe(true);
    });

    it("should list any account regardless being patient or not", async () => {
      const response = await request(app.getHttpServer())
        .get(`${ENDPOINT}?limit=100`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      const body = response.body as PaginatedAccountPresenter;
      expect(body.items.length).toBe(PATIENTS_COUNT + NON_PATIENTS_COUNT + 1); // there is a authenticated user
    });
  });

  describe("patients filter", () => {
    const PROFESSIONALS_COUNT = 15;
    const NON_PROFESSIONALS_COUNT = 15;

    beforeEach(async () => {
      await Promise.all(
        Array.from({ length: PROFESSIONALS_COUNT }).map(() => createProfessionalAccount()),
      );

      await Promise.all(
        Array.from({ length: NON_PROFESSIONALS_COUNT }).map(() =>
          accountsFactory.createAndPersist(prisma),
        ),
      );
    });

    it("should list only professionals accounts", async () => {
      const response = await request(app.getHttpServer())
        .get(`${ENDPOINT}?limit=100&isProfessional=true`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      const body = response.body as PaginatedAccountPresenter;

      expect(body.items.length).toBe(PROFESSIONALS_COUNT);
      expect(body.items.every((account) => account.isProfessional)).toBe(true);
    });

    it("should list only non-professionals accounts", async () => {
      const response = await request(app.getHttpServer())
        .get(`${ENDPOINT}?limit=100&isProfessional=false`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      const body = response.body as PaginatedAccountPresenter;

      expect(body.items.length).toBe(NON_PROFESSIONALS_COUNT + 1); // the authenticated user is not a professional
      expect(body.items.every((account) => !account.isProfessional)).toBe(true);
    });

    it("should list any account regardless being patient or not", async () => {
      const response = await request(app.getHttpServer())
        .get(`${ENDPOINT}?limit=100`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      const body = response.body as PaginatedAccountPresenter;
      expect(body.items.length).toBe(PROFESSIONALS_COUNT + NON_PROFESSIONALS_COUNT + 1); // the authenticated user is not a professional
    });
  });
});
