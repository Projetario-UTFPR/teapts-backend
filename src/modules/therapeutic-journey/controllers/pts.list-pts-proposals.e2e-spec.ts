import { AssignTokenService } from "@/infra/auth/assign-token.service";
import { PrismaService } from "@/infra/prisma/prisma";
import { Patient } from "@/modules/patient/entities/patient.entity";
import { Professional } from "@/modules/professional/entities/professional.aggregate";
import { PaginatedDraftPtsProposalsPresenter } from "@/modules/therapeutic-journey/presenters/paginated-draft-pts-proposals.presenter";
import { PtsTimeline } from "@/modules/therapeutic-journey/value-objects/pts-timeline.vo";
import { HttpStatus, type INestApplication } from "@nestjs/common";
import accountsFactory from "@test/factories/accounts.factory";
import patientsFactory from "@test/factories/patients.factory";
import professionalsFactory from "@test/factories/professionals.factory";
import ptsFactory from "@test/factories/pts.factory";
import { getTestingApp } from "@test/get-testing-app";
import { either as e } from "fp-ts";
import supertest from "supertest";
import request from "supertest";
import type { App } from "supertest/types";

const ENDPOINT = "/v1/pts/proposals/me";

describe("[e2e] PTS Controller :: List Draft PTS Proposals (v1)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokensService: AssignTokenService;

  let patient: Patient;
  let accessToken: string;

  let responsibleA: Professional;
  let responsibleB: Professional;
  let memberA: Professional;
  let memberB: Professional;

  beforeAll(async () => {
    app = await getTestingApp();

    prisma = app.get(PrismaService);
    tokensService = app.get(AssignTokenService);

    await app.init();
  });

  beforeEach(async () => {
    const patientAccount = await accountsFactory.createAndPersist(prisma);
    patient = await patientsFactory.createAndPersist(prisma, { accountId: patientAccount.getId() });

    const tokens = await tokensService.execute({ account: patientAccount });
    assert(e.isRight(tokens));
    accessToken = tokens.right.accessToken;

    [responsibleA, responsibleB, memberA, memberB] = await Promise.all([
      professionalsFactory.createAndPersist(prisma),
      professionalsFactory.createAndPersist(prisma),
      professionalsFactory.createAndPersist(prisma),
      professionalsFactory.createAndPersist(prisma),
    ]);

    await Promise.all([
      ptsFactory.createAndPersist(prisma, {
        patientId: patient.getId(),
        responsibleProfessionalId: responsibleA.getId(),
        multidisciplinaryTeamIds: [memberA.getId()],
        timeline: ptsFactory.createTimeline({ createdAt: new Date("2026-05-01T00:00:00.000Z") }),
      }),
      ptsFactory.createAndPersist(prisma, {
        patientId: patient.getId(),
        responsibleProfessionalId: responsibleA.getId(),
        multidisciplinaryTeamIds: [memberA.getId()],
        timeline: ptsFactory.createTimeline({ createdAt: new Date("2026-06-01T00:00:00.000Z") }),
      }),
      ptsFactory.createAndPersist(prisma, {
        patientId: patient.getId(),
        responsibleProfessionalId: responsibleB.getId(),
        multidisciplinaryTeamIds: [memberB.getId()],
        timeline: ptsFactory.createTimeline({ createdAt: new Date("2026-07-01T00:00:00.000Z") }),
      }),
    ]);
  });

  it("should be a protected route", async () => {
    await request(app.getHttpServer()).get(ENDPOINT).expect(HttpStatus.UNAUTHORIZED);
  });

  it("should only list draft PTSs", async () => {
    const statuses = Object.values(PtsTimeline.Status).filter(
      (status) => status !== PtsTimeline.Status.Running,
    );

    for (const status of statuses) {
      await ptsFactory.createAndPersist(prisma, {
        patientId: patient.getId(),
        timeline: ptsFactory.createTimeline({ status }),
      });
    }

    const response = await supertest(app.getHttpServer())
      .get(ENDPOINT)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    const body = response.body as PaginatedDraftPtsProposalsPresenter;

    const proposalsIds = body.items.map((item) => item.id);

    const ptss = await prisma.projetoTerapeuticoSingular.findMany({
      where: { id: { in: proposalsIds } },
    });

    expect(
      ptss.every((pts) => pts.status === "Draft"),
      "it should only bring 'draft' PTSs",
    ).toBe(true);
  });

  async function getProposals(
    query: Record<string, string>,
  ): Promise<PaginatedDraftPtsProposalsPresenter> {
    const response = await request(app.getHttpServer())
      .get(ENDPOINT)
      .query(query)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(HttpStatus.OK);
    return response.body as PaginatedDraftPtsProposalsPresenter;
  }

  it("should filter by responsibleProfessionalId", async () => {
    const body = await getProposals({ responsibleProfessionalId: responsibleA.getId().toString() });

    expect(body.totalElements).toBe(2);
    body.items.forEach((item) =>
      expect(item.responsibleProfessional.id).toBe(responsibleA.getId()),
    );
  });

  it("should filter by professionalId", async () => {
    const body = await getProposals({ professionalId: memberB.getId().toString() });

    expect(body.totalElements).toBe(1);
    body.items.forEach((item) =>
      expect(item.multidisciplinaryTeam.map((p: { id: string }) => p.id)).toContain(
        memberB.getId(),
      ),
    );
  });

  it("should filter by draftedAfter", async () => {
    const body = await getProposals({ draftedAfter: "2026-06-01T00:00:00.000Z" });

    expect(body.totalElements).toBe(2);
    body.items.forEach((item) =>
      expect(new Date(item.createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date("2026-06-01T00:00:00.000Z").getTime(),
      ),
    );
  });

  it("should filter by draftedBefore", async () => {
    const body = await getProposals({ draftedBefore: "2026-06-01T00:00:00.000Z" });

    expect(body.totalElements).toBe(2);
    body.items.forEach((item) =>
      expect(new Date(item.createdAt).getTime()).toBeLessThanOrEqual(
        new Date("2026-06-01T00:00:00.000Z").getTime(),
      ),
    );
  });

  it("should filter by draftedAfter + draftedBefore as a date window", async () => {
    const body = await getProposals({
      draftedAfter: "2026-06-01T00:00:00.000Z",
      draftedBefore: "2026-06-01T00:00:00.000Z",
    });

    expect(body.totalElements).toBe(1);
    expect(new Date(body.items[0].createdAt).getTime()).toBe(
      new Date("2026-06-01T00:00:00.000Z").getTime(),
    );
  });

  it("should intersect responsibleProfessionalId and draftedAfter", async () => {
    const body = await getProposals({
      responsibleProfessionalId: responsibleA.getId().toString(),
      draftedAfter: "2026-06-01T00:00:00.000Z",
    });

    expect(body.totalElements).toBe(1);
    expect(body.items[0].responsibleProfessional.id).toBe(responsibleA.getId());
    expect(new Date(body.items[0].createdAt).getTime()).toBeGreaterThanOrEqual(
      new Date("2026-06-01T00:00:00.000Z").getTime(),
    );
  });
});
