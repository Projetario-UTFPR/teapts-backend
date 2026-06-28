import { AssignTokenService } from "@/infra/auth/assign-token.service";
import { PrismaService } from "@/infra/prisma/prisma";
import { type INestApplication } from "@nestjs/common";
import accountsFactory from "@test/factories/accounts.factory";
import professionalsFactory from "@test/factories/professionals.factory";
import { getTestingApp } from "@test/get-testing-app";
import { either as e } from "fp-ts";
import request from "supertest";
import type { App } from "supertest/types";

describe("[e2e] Professionals Controller :: List Professionals (v1)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokensService: AssignTokenService;

  let accessToken: string;

  const getEndpoint = (query = "") => `/v1/professionals?${query}`;

  beforeAll(async () => {
    app = await getTestingApp();

    prisma = app.get(PrismaService);
    tokensService = app.get(AssignTokenService);

    await app.init();
  });

  beforeEach(async () => {
    const account = await accountsFactory.createAndPersist(prisma);
    const tokens = await tokensService.execute({ account });
    assert(e.isRight(tokens));
    accessToken = tokens.right.accessToken;
  });

  it(
    "should require authentication to list professionals",
    { tags: ["listActivities"] },
    async () => {
      await request(app.getHttpServer()).get(getEndpoint()).expect(401);
    },
  );

  it("should limit professionals by IDs", async () => {
    const professionalsToKeep = [
      await professionalsFactory.createAndPersist(prisma),
      await professionalsFactory.createAndPersist(prisma),
    ];

    // instantiate many others
    await Promise.all(
      Array.from({ length: 10 }).map(() => professionalsFactory.createAndPersist(prisma)),
    );

    const idsQueries = [
      "inIds=" + professionalsToKeep.map((prof) => prof.getId().toString()).join(","),
      professionalsToKeep
        .map((prof) => prof.getId().toString())
        .map((id) => `inIds=${id}`)
        .join("&"),
    ];

    const count = await prisma.professional.count();
    expect(count).toBeGreaterThan(professionalsToKeep.length);

    for (const query of idsQueries) {
      const response = await request(app.getHttpServer())
        .get(getEndpoint(query))
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      const body = response.body;
      expect(body.totalElements).toBe(professionalsToKeep.length);
    }
  });
});
