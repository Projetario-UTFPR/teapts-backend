import { type UUID } from "@/common/uuid";
import { AssignTokenService } from "@/infra/auth/assign-token.service";
import { PrismaService } from "@/infra/prisma/prisma";
import { Hasher } from "@/modules/crypto/hasher";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { Patient } from "@/modules/patient/entities/patient.entity";
import { DocumentUploadInitiationPresenter } from "@/modules/patient/presenters/document-upload-initiation.presenter";
import { DocumentFilesStorage } from "@/modules/patient/storage/document-files.storage";
import { Professional } from "@/modules/professional/entities/professional.aggregate";
import { PtsTimeline } from "@/modules/therapeutic-journey/value-objects/pts-timeline.vo";
import { faker } from "@faker-js/faker";
import { type INestApplication } from "@nestjs/common";
import accountsFactory from "@test/factories/accounts.factory";
import patientsFactory from "@test/factories/patients.factory";
import professionalsFactory from "@test/factories/professionals.factory";
import ptsFactory from "@test/factories/pts.factory";
import { getTestingApp } from "@test/get-testing-app";
import { either as e } from "fp-ts";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import supertest from "supertest";
import { type App } from "supertest/types";

describe("[e2e] Prontuario Controller (v1)", async () => {
  const documentFileName = "Documento Sigiloso do Paciente.pdf" as const;
  const documentFileBytes = new Blob([
    await readFile(resolve(process.cwd(), "test/fixtures", documentFileName)),
  ]);
  const documentFile = new File([documentFileBytes], documentFileName, { type: "application/pdf" });

  let app: INestApplication<App>;
  let prisma: PrismaService;
  let hasher: Hasher;
  let tokensService: AssignTokenService;
  let storage: DocumentFilesStorage;

  let professionalAccount: Account;
  let professional: Professional;
  let patient: Patient;
  let professionalAccountToken: string;

  beforeAll(async () => {
    app = await getTestingApp();

    prisma = app.get(PrismaService);
    hasher = app.get(Hasher);
    tokensService = app.get(AssignTokenService);
    storage = app.get(DocumentFilesStorage);

    await app.init();
  });

  beforeEach(async () => {
    professionalAccount = await accountsFactory.createAndPersist(
      prisma,
      { plainPassword: "12345678" },
      { hasher },
    );

    professional = await professionalsFactory.createAndPersist(prisma, {
      account: professionalAccount,
    });

    patient = await patientsFactory.createAndPersist(prisma);

    const accessTokenResult = await tokensService.execute({ account: professionalAccount });

    if (e.isLeft(accessTokenResult)) {
      throw new Error("Didn't issued an access token correctly for the test.");
    }

    professionalAccountToken = accessTokenResult.right.accessToken;
  });

  const generateActivePts = async () => {
    await ptsFactory.createAndPersist(prisma, {
      patientId: patient.getId(),
      responsibleProfessionalId: professional.getId(),
      timeline: ptsFactory.createTimeline({
        status: PtsTimeline.Status.Running,
      }),
    });
  };

  describe("initiate document upload", { tags: ["initiateDocumentUpload"] }, () => {
    const initiateUploadEndpoint = (patientId: UUID) =>
      `/v1/patient/${patientId.toString()}/prontuario/document/upload/initiate`;

    it("should provide a signed URL ", async () => {
      await generateActivePts();

      const response = await supertest(app.getHttpServer())
        .post(initiateUploadEndpoint(patient.getId()))
        .set("authorization", `Bearer ${professionalAccountToken}`)
        .send({
          fileName: documentFile.name,
          fileType: documentFile.type,
          fileSize: documentFile.size,
        });

      expect(response.status).toBe(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          fileKey: expect.any(String),
          uploadUrl: expect.any(String),
        } satisfies DocumentUploadInitiationPresenter),
      );
    });

    it(
      "should require professional to be membership of the patient's " +
      "PTS in order to upload documents to its prontuário",
      async () => {
        // not creating active PTS here

        const response = await supertest(app.getHttpServer())
          .post(initiateUploadEndpoint(patient.getId()))
          .set("authorization", `Bearer ${professionalAccountToken}`)
          .send({
            fileName: documentFile.name,
            fileType: documentFile.type,
            fileSize: documentFile.size,
          });

        expect(response.status).toBe(403);
      },
    );

    it("should be a guarded route", async () => {
      // not sending auth token
      const response = await supertest(app.getHttpServer())
        .post(initiateUploadEndpoint(patient.getId()))
        .send({
          fileName: documentFile.name,
          fileType: documentFile.type,
          fileSize: documentFile.size,
        });

      expect(response.status).toBe(401);
    });
  });

  describe("document upload", { tags: ["persistDocument"] }, () => {
    const uploadEndpoint = (patientId: UUID) =>
      `/v1/patient/${patientId.toString()}/prontuario/document/upload`;

    const generateAndUploadNewDocument = async (taskId: string) => {
      const document = new File([documentFile], taskId + documentFile.name, {
        type: documentFile.type,
      });

      const result = await storage.uploadPendingDocumentFile({
        document: Buffer.copyBytesFrom(await document.bytes()),
        fileName: document.name,
        fileType: document.type,
      });

      assert(e.isRight(result));

      return { document, fileKey: result.right.fileKey };
    };

    it("should save a document and activate it", async ({ task }) => {
      const { fileKey } = await generateAndUploadNewDocument(task.id);
      await generateActivePts();

      const activationSpy = vi.spyOn(storage, "activateDocumentFile");

      const response = await supertest(app.getHttpServer())
        .post(uploadEndpoint(patient.getId()))
        .set("authorization", `Bearer ${professionalAccountToken}`)
        .send({
          assigneeProfessionalId: professional.getId().toString(),
          documentFileKey: fileKey,
          documentTitle: faker.lorem.sentence(),
          documentDescription: faker.lorem.paragraphs(2),
        });

      expect(response.status).toBe(204);

      expect(
        activationSpy,
        "it should have activated the document's file in the blob storage",
      ).toHaveBeenCalled();

      const documents = await prisma.document.findMany({
        where: { patientAccountId: patient.getId().toString() },
      });

      expect(documents.length).toBe(1);
      expect(documents[0]!.documentFileKey).toBe(fileKey);
    });

    it("should be a guarded route", async ({ task }) => {
      const { document } = await generateAndUploadNewDocument(task.id);

      // not sending auth token
      const response = await supertest(app.getHttpServer())
        .post(uploadEndpoint(patient.getId()))
        .send({
          fileName: document.name,
          fileType: document.type,
          fileSize: document.size,
        });

      expect(response.status).toBe(401);
    });

    it("should not let a professional upload a document to the patient's prontuário if it has no PTS", async ({
      task,
    }) => {
      // no active PTS for given patient
      const { fileKey } = await generateAndUploadNewDocument(task.id);

      const response = await supertest(app.getHttpServer())
        .post(uploadEndpoint(patient.getId()))
        .set("authorization", `Bearer ${professionalAccountToken}`)
        .send({
          assigneeProfessionalId: professional.getId().toString(),
          documentFileKey: fileKey,
          documentTitle: faker.lorem.sentence(),
          documentDescription: faker.lorem.paragraphs(2),
        });

      expect(response.status).toBe(403);
    });

    it("should not let a non-member of the patient's PTS activate any file", async ({ task }) => {
      // no active PTS for given patient
      const { fileKey } = await generateAndUploadNewDocument(task.id);

      // PTS exists
      await generateActivePts();

      const anotherProfessionalAccount = await accountsFactory.createAndPersist(prisma);
      const anotherProfessional = await professionalsFactory.createAndPersist(prisma, {
        account: anotherProfessionalAccount,
      });
      const tokenResult = await tokensService.execute({ account: anotherProfessionalAccount });
      assert(e.isRight(tokenResult));

      const response = await supertest(app.getHttpServer())
        .post(uploadEndpoint(patient.getId()))
        // but the authorized professional doesn't have access to the PTS
        .set("authorization", `Bearer ${tokenResult.right.accessToken}`)
        .send({
          assigneeProfessionalId: anotherProfessional.getId().toString(),
          documentFileKey: fileKey,
          documentTitle: faker.lorem.sentence(),
          documentDescription: faker.lorem.paragraphs(2),
        });

      expect(response.status).toBe(403);
    });

    it("should not let a non-member professional try to assign a document in the name of an actual member", async ({
      task,
    }) => {
      // no active PTS for given patient
      const { fileKey } = await generateAndUploadNewDocument(task.id);

      // PTS exists
      await generateActivePts();

      const anotherProfessionalAccount = await accountsFactory.createAndPersist(prisma);
      await professionalsFactory.createAndPersist(prisma, { account: anotherProfessionalAccount });
      const tokenResult = await tokensService.execute({ account: anotherProfessionalAccount });
      assert(e.isRight(tokenResult));

      const response = await supertest(app.getHttpServer())
        .post(uploadEndpoint(patient.getId()))
        // token of the non-member professional
        .set("authorization", `Bearer ${tokenResult.right.accessToken}`)
        .send({
          // but assigning as an actual member professional
          assigneeProfessionalId: professional.getId().toString(),
          documentFileKey: fileKey,
          documentTitle: faker.lorem.sentence(),
          documentDescription: faker.lorem.paragraphs(2),
        });

      expect(response.status).toBe(403);
    });

    it("should not let it activate a file that does not exist", async () => {
      await generateActivePts();

      const response = await supertest(app.getHttpServer())
        .post(uploadEndpoint(patient.getId()))
        .set("authorization", `Bearer ${professionalAccountToken}`)
        .send({
          assigneeProfessionalId: professional.getId().toString(),
          documentFileKey: "unexisting-file-key",
          documentTitle: faker.lorem.sentence(),
          documentDescription: faker.lorem.paragraphs(2),
        });

      expect(response.status).toBe(400);
    });
  });
});
