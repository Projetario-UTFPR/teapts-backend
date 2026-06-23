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

describe("[e2e] PTS Activities Controller :: Create Activity (v1)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let hasher: Hasher;
  let tokensService: AssignTokenService;

  let account: Account;
  let professional: Professional;
  let patient: Patient;
  let professionalAccountToken: string;

  const _getEndpoint = (id) => `/v1/pts/${id}/activity/create`;
  const getEndpoint = () => _getEndpoint(patient.getId().toString());

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
    title: "Caminhada Assistida e Mobilidade",
    frequency: {
      times: 3,
      interval: "week",
      duration: [2, "month"],
    },
    documentsIds: documentId ? [documentId] : [],
  });

  test("create activity route requires authentication", { tags: ["createActivity"] }, async () => {
    await request(app.getHttpServer())
      .post(getEndpoint())
      .send(getValidActivityParams())
      .expect(401);
  });

  it.each([
    [{ professionalId: undefined }, "professionalId"] as const,
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
        .post(getEndpoint())
        .set({ authorization: `Bearer ${professionalAccountToken}` })
        .send(body)
        .expect(422);

      assertIsValidationErrorsBag(response);
      expect(response.body.errors).toHaveProperty(missingProperty);
    },
  );

  it(
    "should not allow modifications to a non-active or non-existing PTS",
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

      const body = {
        professionalId: professional.getId().toString(),
        title: "Caminhada Assistida e Mobilidade",
        frequency: {
          times: 3,
          interval: "week",
          duration: [2, "month"],
        },
        documentsIds: [mockDocument.getId().toString()],
      };

      const response = await request(app.getHttpServer())
        .post(_getEndpoint("non-existing-patient-id"))
        .set({ authorization: `Bearer ${professionalAccountToken}` })
        .send(body)
        .expect(403);

      expect(response.body).toHaveProperty("message");
    },
  );

  it(
    "should not allow a unexisting professional to modify the PTS activities",
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
        title: "Caminhada Assistida e Mobilidade",
        frequency: {
          times: 3,
          interval: "week",
          duration: [2, "month"],
        },
        documentsIds: [mockDocument.getId().toString()],
      };

      const response = await request(app.getHttpServer())
        .post(getEndpoint())
        .set({ authorization: `Bearer ${professionalAccountToken}` })
        .send(body)
        .expect(403);

      expect(response.body).toHaveProperty("message");
    },
  );

  it(
    "should not allow a document not belonging to the patient to be referred in the activity",
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
        .post(getEndpoint())
        .set({ authorization: `Bearer ${professionalAccountToken}` })
        .send(body)
        .expect(400);

      expect(response.body).toHaveProperty("message");
    },
  );

  it(
    "should not allow a professional not related to the PTS to add an activity to it",
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

      await request(app.getHttpServer())
        .post(getEndpoint())
        .set({ authorization: `Bearer ${professionalAccountToken}` })
        .send(body)
        .expect(403);
    },
  );

  it(
    "should not let a non-existing document to be associated to the activity",
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
        .post(getEndpoint())
        .set({ authorization: `Bearer ${professionalAccountToken}` })
        .send(body)
        .expect(400);

      expect(response.body).toHaveProperty("message");
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
      .post(getEndpoint())
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

  it.each([{ interval: "foo" }, { duration: "month" }, { duration: [-1, "month"] }, { times: 0 }])(
    "should validate frequency errors for payload $0",
    { tags: ["FrequencyDto"] },
    async (frequencyOverride) => {
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

      const response = await request(app.getHttpServer())
        .post(getEndpoint())
        .set({ authorization: `Bearer ${professionalAccountToken}` })
        .send({
          ...body,
          frequency: {
            ...body.frequency,
            ...frequencyOverride,
          },
        })
        .expect(422);

      expect(response.body).toEqual(
        expect.objectContaining({
          errors: {
            frequency: expect.toBeOneOf([
              expect.objectContaining({ times: expect.arrayContaining([]) }),
              expect.objectContaining({
                duration: expect.toBeOneOf([
                  expect.objectContaining({}),
                  expect.arrayContaining([]),
                ]),
              }),
              expect.objectContaining({
                interval: expect.toBeOneOf([
                  expect.objectContaining({}),
                  expect.arrayContaining([]),
                ]),
              }),
            ]),
          },
        }),
      );
    },
  );
});
