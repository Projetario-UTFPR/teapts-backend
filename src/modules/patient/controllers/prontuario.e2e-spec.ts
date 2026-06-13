import { type UUID } from "@/common/uuid";
import { AssignTokenService } from "@/infra/auth/assign-token.service";
import { PrismaService } from "@/infra/prisma/prisma";
import { Hasher } from "@/modules/crypto/hasher";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { Patient } from "@/modules/patient/entities/patient.entity";
import { DocumentUploadInitiationPresenter } from "@/modules/patient/presenters/document-upload-initiation.presenter";
import { Professional } from "@/modules/professional/entities/professional.aggregate";
import { PtsTimeline } from "@/modules/therapeutic-journey/value-objects/pts-timeline.vo";
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

const ENDPOINT = (patientId: UUID) => `/v1/patient/${patientId.toString()}/prontuario/document`;

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

  let professionalAccount: Account;
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

  it(
    "should provide a signed URL ",
    {
      tags: ["initiateDocumentUpload"],
    },
    async () => {
      await generateActivePts();

      const response = await supertest(app.getHttpServer())
        .post(ENDPOINT(patient.getId()))
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
    },
  );

  it(
    "should require professional to be membership of the patient's " +
      "PTS in order to upload documents to its prontuário",
    async () => {
      // not creating active PTS here

      const response = await supertest(app.getHttpServer())
        .post(ENDPOINT(patient.getId()))
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
    const response = await supertest(app.getHttpServer()).post(ENDPOINT(patient.getId())).send({
      fileName: documentFile.name,
      fileType: documentFile.type,
      fileSize: documentFile.size,
    });

    expect(response.status).toBe(401);
  });
});
