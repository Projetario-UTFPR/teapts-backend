import { IPaginatedDataPresenter } from "@/common/pagination/paginated-data.presenter";
import { AssignTokenService } from "@/infra/auth/services/assign-token.service";
import { PrismaService } from "@/infra/prisma/prisma";
import { Hasher } from "@/modules/crypto/hasher";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { Patient } from "@/modules/patient/aggregates/patient.aggregate";
import { DocumentPresenter } from "@/modules/patient/presenters/document.presenter";
import { DocumentFilesStorage } from "@/modules/patient/storage/document-files.storage";
import { Professional } from "@/modules/professional/entities/professional.aggregate";
import { PtsTimeline } from "@/modules/therapeutic-journey/value-objects/pts-timeline.vo";
import { type INestApplication } from "@nestjs/common";
import accountsFactory from "@test/factories/accounts.factory";
import documentsFactory from "@test/factories/documents.factory";
import patientsFactory from "@test/factories/patients.factory";
import professionalsFactory from "@test/factories/professionals.factory";
import ptsFactory from "@test/factories/pts.factory";
import { getTestingApp } from "@test/get-testing-app";
import { either as e } from "fp-ts";
import { readFile } from "fs/promises";
import { resolve } from "path";
import supertest from "supertest";
import { type App } from "supertest/types";

describe("[e2e] Prontuario Controller :: Show Prontuário (List its Documents) (v1)", async () => {
  const documentFileName = "Documento Sigiloso do Paciente.pdf" as const;
  const documentFileBytes = new Blob([
    await readFile(resolve(process.cwd(), "test/fixtures", documentFileName)),
  ]);
  const _documentFile = new File([documentFileBytes], documentFileName, {
    type: "application/pdf",
  });

  let app: INestApplication<App>;
  let prisma: PrismaService;
  let hasher: Hasher;
  let tokensService: AssignTokenService;
  let storage: DocumentFilesStorage;

  type AuthorizedProfessionals = {
    responsible: {
      account?: Account;
      profile?: Professional;
    };
    member: {
      account?: Account;
      profile?: Professional;
    };
  };

  let authorizedProfessionals: AuthorizedProfessionals = { member: {}, responsible: {} };

  let patientAccount: Account;
  let patient: Patient;

  const getEndpoint = () => `/v1/patient/${patient.getId().toString()}/prontuario`;

  beforeAll(async () => {
    app = await getTestingApp();

    prisma = app.get(PrismaService);
    hasher = app.get(Hasher);
    tokensService = app.get(AssignTokenService);
    storage = app.get(DocumentFilesStorage);

    await app.init();
  });

  beforeEach(async () => {
    authorizedProfessionals.responsible.account = await accountsFactory.createAndPersist(
      prisma,
      { plainPassword: "12345678" },
      { hasher },
    );

    authorizedProfessionals.responsible.profile = await professionalsFactory.createAndPersist(
      prisma,
      {
        account: authorizedProfessionals.responsible.account,
      },
    );

    authorizedProfessionals.member.account = await accountsFactory.createAndPersist(prisma);
    authorizedProfessionals.member.profile = await professionalsFactory.createAndPersist(prisma, {
      account: authorizedProfessionals.member.account,
    });

    patientAccount = await accountsFactory.createAndPersist(prisma);
    patient = await patientsFactory.createAndPersist(prisma, { accountId: patientAccount.getId() });
  });

  // since the prontuário belongs to the patient, not to the PTS
  it("should let the patient see its prontuário even when it has no active PTS", async () => {
    const accessTokens = await tokensService.execute({ account: patientAccount });
    assert(e.isRight(accessTokens));
    const { accessToken } = accessTokens.right;

    await supertest(app.getHttpServer())
      .get(getEndpoint())
      .set("authorization", `Bearer ${accessToken}`)
      .expect(200);
  });

  it.each(["responsible", "member"] as const)(
    "should not allow professionals to see the patient's prontuário when they are not member of its active PTS",
    async (profile) => {
      const account = authorizedProfessionals[profile].account!;
      const accessTokens = await tokensService.execute({ account });
      assert(e.isRight(accessTokens));
      const { accessToken } = accessTokens.right;

      await supertest(app.getHttpServer())
        .get(getEndpoint())
        .set("authorization", `Bearer ${accessToken}`)
        .expect(403);
    },
  );

  it.each(["responsible", "member"] as const)(
    "should let $0 profissional of patient's (active) PTS see its patient's prontuário",
    async (profile) => {
      const account = authorizedProfessionals[profile].account!;
      const tokens = await tokensService.execute({ account });
      assert(e.isRight(tokens));
      const { accessToken } = tokens.right;

      await ptsFactory.createAndPersist(prisma, {
        patientId: patient.getId(),
        responsibleProfessionalId: authorizedProfessionals.responsible.profile!.getId(),
        multidisciplinaryTeamIds: [authorizedProfessionals.member.profile!.getId()],
        timeline: ptsFactory.createTimeline({
          status: PtsTimeline.Status.Running,
          acceptedAt: new Date(),
        }),
      });

      const response = await supertest(app.getHttpServer())
        .get(getEndpoint())
        .set("authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          page: 1,
          perPage: expect.any(Number),
          totalElements: expect.any(Number),
          items: expect.arrayContaining([]),
        } satisfies IPaginatedDataPresenter),
      );
    },
  );

  describe("Response Contracts", () => {
    const DOCUMENT_COMMON_CONTENT = "document file being injected";
    let accessToken: string;

    const generateDocumentsForPatient = async (count: number) => {
      for (let i = 0; i < count; i++) {
        const documentFile = Buffer.from(`${DOCUMENT_COMMON_CONTENT} ${i}!!!!`);
        const result = await storage.uploadPendingDocumentFile({
          document: documentFile,
          fileName: `Very Important Document ${i} ${new Date().toString()}`,
          fileType: "text/plain",
        });
        assert(e.isRight(result));
        const { fileKey } = result.right;
        await storage.activateDocumentFile({ fileKey });
        await documentsFactory.createAndPersist(prisma, {
          patientId: patient.getId().toString(),
          documentFileKey: fileKey,
          createdAt: new Date(new Date().getDate() + i),
        });
      }
    };

    beforeEach(async () => {
      const account = authorizedProfessionals.responsible.account!;
      const tokens = await tokensService.execute({ account });

      if (e.isLeft(tokens)) {
        throw new Error("Could not proceed with tests due to failure on getting an access token.");
      }

      accessToken = tokens.right.accessToken;

      await ptsFactory.createAndPersist(prisma, {
        patientId: patient.getId(),
        responsibleProfessionalId: authorizedProfessionals.responsible.profile!.getId(),
        multidisciplinaryTeamIds: [authorizedProfessionals.member.profile!.getId()],
        timeline: ptsFactory.createTimeline({
          status: PtsTimeline.Status.Running,
          acceptedAt: new Date(),
        }),
      });
    });

    it("should generate valid signed download urls for every document", async () => {
      const LIMIT = 10;
      const DOCUMENTS_COUNT = 20;

      await generateDocumentsForPatient(DOCUMENTS_COUNT);

      const response = await supertest(app.getHttpServer())
        .get(`${getEndpoint()}?limit=${LIMIT}`)
        .set("authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          page: 1,
          perPage: LIMIT,
          totalElements: DOCUMENTS_COUNT,
          items: expect.arrayContaining([]),
        } satisfies IPaginatedDataPresenter),
      );

      expect(response.body.items).toHaveLength(LIMIT);

      const anyDocument = response.body.items[0] as DocumentPresenter;
      expect(anyDocument.documentUrl).toEqual(expect.any(String));

      const documentFetch = await fetch(anyDocument.documentUrl!);
      const documentResponse = await documentFetch.text();
      expect(documentResponse).includes(DOCUMENT_COMMON_CONTENT);
    });

    it("should respect pagination", async () => {
      const DOCUMENTS_COUNT = 19;
      const LIMIT = 10;
      const PAGE = 2;

      await generateDocumentsForPatient(DOCUMENTS_COUNT);

      const response = await supertest(app.getHttpServer())
        // pagination
        .get(`${getEndpoint()}?limit=${LIMIT}&page=${PAGE}`)
        .set("authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          page: PAGE,
          perPage: LIMIT,
          totalElements: DOCUMENTS_COUNT,
          items: expect.arrayContaining([]),
        } satisfies IPaginatedDataPresenter),
      );

      expect(response.body.items).toHaveLength(9);
    });

    it("should order by creation date", async () => {
      await generateDocumentsForPatient(15);

      const response = await supertest(app.getHttpServer())
        // pagination
        .get(`${getEndpoint()}`)
        .set("authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          page: expect.any(Number),
          perPage: expect.any(Number),
          totalElements: expect.any(Number),
          items: expect.arrayContaining([]),
        } satisfies IPaginatedDataPresenter),
      );

      const documents = response.body.items as DocumentPresenter[];
      const timestamps = documents.map((item) => new Date(item.createdAt).getTime());

      expect(timestamps, "it should be sorted from latest to oldest").toSatisfy((times: number[]) =>
        times.every((time, i) => i === 0 || time <= times[i - 1]),
      );
    });
  });
});
