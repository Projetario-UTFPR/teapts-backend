import { AssignTokenService } from "@/infra/auth/assign-token.service";
import { PrismaService } from "@/infra/prisma/prisma";
import { ProjetoTerapeuticoSingular } from "@/modules/therapeutic-journey/aggregates/pts.aggregate";
import { RejectDraftPtsService } from "@/modules/therapeutic-journey/services/reject-pts.service";
import { HttpStatus, type INestApplication } from "@nestjs/common";
import { PtsStatus } from "@prisma-gen/enums";
import accountsFactory from "@test/factories/accounts.factory";
import patientsFactory from "@test/factories/patients.factory";
import ptsFactory from "@test/factories/pts.factory";
import { getTestingApp } from "@test/get-testing-app";
import { either as e } from "fp-ts";
import request from "supertest";
import type { App } from "supertest/types";

const ENDPOINT = (pts: ProjetoTerapeuticoSingular) => `/v1/pts/${pts.getId().toString()}/reject`;

describe("[e2e] PTS Controller :: Reject PTS (v1)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokensService: AssignTokenService;
  let underlyingService: RejectDraftPtsService;

  beforeAll(async () => {
    app = await getTestingApp();

    prisma = app.get(PrismaService);
    tokensService = app.get(AssignTokenService);
    underlyingService = app.get(RejectDraftPtsService);

    await app.init();
  });

  const getParameters = async () => {
    const pts = await ptsFactory.createAndPersist(prisma);
    assert(pts.isDraft());

    return { pts };
  };

  it("should be a protected route", async () => {
    const { pts } = await getParameters();
    await request(app.getHttpServer()).patch(ENDPOINT(pts)).expect(HttpStatus.UNAUTHORIZED);
  });

  it("should forbid a non-patient user to even call the underlying service", async () => {
    const spy = vi.spyOn(underlyingService, "execute");

    const nonPatientAccount = await accountsFactory.createAndPersist(prisma);
    const tokens = await tokensService.execute({ account: nonPatientAccount });
    assert(e.isRight(tokens));

    const actualPatient = await patientsFactory.createAndPersist(prisma);
    const pts = await ptsFactory.createAndPersist(prisma, { patientId: actualPatient.getId() });

    await request(app.getHttpServer())
      // the PTS can either exist or not, it should not even test it
      .patch(ENDPOINT(pts))
      .set("Authorization", `Bearer ${tokens.right.accessToken}`)
      .expect(HttpStatus.FORBIDDEN);

    expect(spy).not.toHaveBeenCalled();
  });

  it("should reject a given PTS for the authenticated patient", async () => {
    const patientAccount = await accountsFactory.createAndPersist(prisma);
    await patientsFactory.createAndPersist(prisma, { accountId: patientAccount.getId() });

    const tokens = await tokensService.execute({ account: patientAccount });
    assert(e.isRight(tokens));

    const pts = await ptsFactory.createAndPersist(prisma, { patientId: patientAccount.getId() });

    await request(app.getHttpServer())
      // the PTS can either exist or not, it should not even test it
      .patch(ENDPOINT(pts))
      .set("Authorization", `Bearer ${tokens.right.accessToken}`)
      .expect(HttpStatus.NO_CONTENT);

    const ptsFromDb = await prisma.projetoTerapeuticoSingular.findUniqueOrThrow({
      where: { id: pts.getId().toString() },
    });

    expect(ptsFromDb.status, "it should have been set to 'rejected' status").toBe(
      PtsStatus.Rejected,
    );

    expect(ptsFromDb.rejectedAt, "it should have have been updated with integrity").not.toBeNull();
  });
});
