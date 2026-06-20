import { generateUUID } from "@/common/uuid";
import { AssignTokenService } from "@/infra/auth/assign-token.service";
import { PrismaService } from "@/infra/prisma/prisma";
import { Hasher } from "@/modules/crypto/hasher";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { Patient } from "@/modules/patient/entities/patient.entity";
import { Professional } from "@/modules/professional/entities/professional.aggregate";
import { type INestApplication } from "@nestjs/common";
import accountsFactory from "@test/factories/accounts.factory";
import documentsFactory from "@test/factories/documents.factory";
import patientsFactory from "@test/factories/patients.factory";
import professionalsFactory from "@test/factories/professionals.factory";
import ptsFactory from "@test/factories/pts.factory";
import { getTestingApp } from "@test/get-testing-app";
import { either as e } from "fp-ts";
import request from "supertest";
import type { App } from "supertest/types";
import { PtsTimeline } from "../value-objects/pts-timeline.vo";

describe("[e2e] Create Activity - PTS Controller (v1)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let hasher: Hasher;
  let tokensService: AssignTokenService;

  let account: Account;
  let professional: Professional;
  let patient: Patient;
  let professionalAccountToken: string;

  beforeAll(async () => {
    app = await getTestingApp();

    prisma = app.get(PrismaService);
    hasher = app.get(Hasher);
    tokensService = app.get(AssignTokenService);

    await app.init();
  });

  beforeEach(async () => {
    account = await accountsFactory.createAndPersist(
      prisma,
      { plainPassword: "12345678" },
      { hasher },
    );

    professional = await professionalsFactory.createAndPersist(prisma, { account: account });

    patient = await patientsFactory.createAndPersist(prisma);

    const accessTokenResult = await tokensService.execute({ account });
    if (e.isLeft(accessTokenResult)) {
      throw new Error("Didn't issued an access token correctly for the test.");
    }

    professionalAccountToken = accessTokenResult.right.accessToken;
  });

  const assertIsValidationErrorsBag = (response: request.Response) => {
    expect(response.body, "response should be a validation bag object").toHaveProperty("errors");
  };

  const getValidActivityParams = (documentId?: string) => ({
    professionalId: professional.getId().toString(),
    patientId: patient.getId().toString(),
    title: "Caminhada Assistida e Mobilidade",
    frequency: {
      times: 3,
      interval: "week",
      duration: [2, "month"],
    },
    documentsIds: documentId ? [documentId] : [],
  });

  describe("POST /v1/pts/activity/create", () => {
    test(
      "create activity route requires authentication",
      { tags: ["createActivity"] },
      async () => {
        await request(app.getHttpServer())
          .post("/v1/pts/activity/create")
          .send(getValidActivityParams())
          .expect(401);
      },
    );

    it.each([
      [{ professionalId: undefined }, "professionalId"] as const,
      [{ patientId: undefined }, "patientId"] as const,
      [{ title: undefined }, "title"] as const,
      [{ frequency: undefined }, "frequency"] as const,
    ])(
      "should return 422 when `$1` is missing",
      { tags: ["createActivity"] },
      async (override, missingProperty) => {
        const body = {
          ...getValidActivityParams(),
          ...override,
        };

        const response = await request(app.getHttpServer())
          .post("/v1/pts/activity/create")
          .set({ authorization: `Bearer ${professionalAccountToken}` })
          .send(body)
          .expect(422);

        assertIsValidationErrorsBag(response);
        expect(response.body.errors).toHaveProperty(missingProperty);
      },
    );

    it("should return 404 if pts does not exist", { tags: ["createActivity"] }, async () => {
      const activeTimeline = ptsFactory.createTimeline({
        status: PtsTimeline.Status.Running,
      });

      await ptsFactory.createAndPersist(prisma, {
        patientId: patient.getId(),
        timeline: activeTimeline,
        responsibleProfessionalId: professional.getId(),
      });

      const mockDocument = await documentsFactory.createAndPersist(prisma, {
        patientId: patient.getId(),
      });

      const body = {
        professionalId: professional.getId().toString(),
        patientId: generateUUID(),
        title: "Caminhada Assistida e Mobilidade",
        frequency: {
          times: 3,
          interval: "week",
          duration: [2, "month"],
        },
        documentsIds: [mockDocument.getId().toString()],
      };

      const response = await request(app.getHttpServer())
        .post("/v1/pts/activity/create")
        .set({ authorization: `Bearer ${professionalAccountToken}` })
        .send(body)
        .expect(404);

      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toBe("Não foi encontrado nenhum PTS para esse paciente.");
    });

    it(
      "should return 404 if professional does not exist",
      { tags: ["createActivity"] },
      async () => {
        const activeTimeline = ptsFactory.createTimeline({
          status: PtsTimeline.Status.Running,
        });

        await ptsFactory.createAndPersist(prisma, {
          patientId: patient.getId(),
          timeline: activeTimeline,
          responsibleProfessionalId: professional.getId(),
        });

        const mockDocument = await documentsFactory.createAndPersist(prisma, {
          patientId: patient.getId(),
        });

        const otherProfessionalId = generateUUID();

        const body = {
          professionalId: otherProfessionalId,
          patientId: patient.getId().toString(),
          title: "Caminhada Assistida e Mobilidade",
          frequency: {
            times: 3,
            interval: "week",
            duration: [2, "month"],
          },
          documentsIds: [mockDocument.getId().toString()],
        };

        const response = await request(app.getHttpServer())
          .post("/v1/pts/activity/create")
          .set({ authorization: `Bearer ${professionalAccountToken}` })
          .send(body)
          .expect(404);

        expect(response.body).toHaveProperty("message");
        expect(response.body.message).toBe(
          `Não foi possível encontrar nenhum perfil profissional com id "${otherProfessionalId}".`,
        );
      },
    );

    it(
      "should return 400 if document does not belong to patient",
      { tags: ["createActivity"] },
      async () => {
        const activeTimeline = ptsFactory.createTimeline({
          status: PtsTimeline.Status.Running,
        });

        const otherPatient = await patientsFactory.createAndPersist(prisma);

        await ptsFactory.createAndPersist(prisma, {
          patientId: patient.getId(),
          timeline: activeTimeline,
          responsibleProfessionalId: professional.getId(),
        });

        const mockDocument = await documentsFactory.createAndPersist(prisma, {
          patientId: otherPatient.getId(),
        });

        const body = getValidActivityParams(mockDocument.getId().toString());

        const response = await request(app.getHttpServer())
          .post("/v1/pts/activity/create")
          .set({ authorization: `Bearer ${professionalAccountToken}` })
          .send(body)
          .expect(400);

        expect(response.body).toHaveProperty("message");
        expect(response.body.message).toBe(
          `O documento identificado por "${mockDocument.getId()}" não pertence ao paciente provido, ` +
            "e portanto não pode ser vinculado.",
        );
      },
    );

    it(
      "should return 403 if professional does not belong to multidisicplinary team",
      { tags: ["createActivity"] },
      async () => {
        const activeTimeline = ptsFactory.createTimeline({
          status: PtsTimeline.Status.Running,
        });

        const otherAccount = await accountsFactory.createAndPersist(prisma);
        const otherProfessional = await professionalsFactory.createAndPersist(prisma, {
          account: otherAccount,
        });

        await ptsFactory.createAndPersist(prisma, {
          patientId: patient.getId(),
          timeline: activeTimeline,
          responsibleProfessionalId: otherProfessional.getId(),
        });

        const mockDocument = await documentsFactory.createAndPersist(prisma, {
          patientId: patient.getId(),
        });

        const body = getValidActivityParams(mockDocument.getId().toString());

        const response = await request(app.getHttpServer())
          .post("/v1/pts/activity/create")
          .set({ authorization: `Bearer ${professionalAccountToken}` })
          .send(body)
          .expect(403);

        expect(response.body).toHaveProperty("message");
        expect(response.body.message).toBe(
          `Profissional não autorizado a acessar o projeto terapêutico singular.`,
        );
      },
    );

    it(
      "should return 404 when the provided documentId does not exist",
      { tags: ["createActivity"] },
      async () => {
        const activeTimeline = ptsFactory.createTimeline({
          status: PtsTimeline.Status.Running,
        });

        await ptsFactory.createAndPersist(prisma, {
          patientId: patient.getId(),
          timeline: activeTimeline,
          responsibleProfessionalId: professional.getId(),
        });

        const nonExistingDocumentId = generateUUID().toString();
        const body = getValidActivityParams(nonExistingDocumentId);

        const response = await request(app.getHttpServer())
          .post("/v1/pts/activity/create")
          .set({ authorization: `Bearer ${professionalAccountToken}` })
          .send(body)
          .expect(404);

        expect(response.body).toHaveProperty("message");
        expect(response.body.message).toBe(
          `O documento especificado não foi encontrado. ID: ${nonExistingDocumentId}`,
        );
      },
    );

    it("should create a new activity successfully", { tags: ["createActivity"] }, async () => {
      const activeTimeline = ptsFactory.createTimeline({
        status: PtsTimeline.Status.Running,
      });

      await ptsFactory.createAndPersist(prisma, {
        patientId: patient.getId(),
        timeline: activeTimeline,
        responsibleProfessionalId: professional.getId(),
      });

      const mockDocument = await documentsFactory.createAndPersist(prisma, {
        patientId: patient.getId(),
      });

      const body = getValidActivityParams(mockDocument.getId().toString());

      await request(app.getHttpServer())
        .post("/v1/pts/activity/create")
        .set({ authorization: `Bearer ${professionalAccountToken}` })
        .send(body)
        .expect(201);

      const persistedActivity = await prisma.activity.findFirstOrThrow({
        where: { title: "Caminhada Assistida e Mobilidade" },
        include: { activityReferringToDocuments: true },
      });

      expect(persistedActivity).toBeDefined();
      expect(persistedActivity.activityReferringToDocuments).toHaveLength(1);
      expect(persistedActivity.activityReferringToDocuments[0].documentId).toBe(
        mockDocument.getId().toString(),
      );
    });
  });
});
