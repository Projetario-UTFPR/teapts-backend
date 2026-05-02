import { AppModule } from "@/app.module";
import { AssignTokenService } from "@/infra/auth/assign-token.service";
import * as jose from "jose";
import type { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import accountsFactory from "@test/factories/accounts.factory";
import { either } from "fp-ts";
import { App } from "supertest/types";
import keysetConfig from "@/configs/keyset.config";
import { ConfigType } from "@nestjs/config";
import appConfig from "@/configs/app.config";

describe("[Integration] Assign JWT Service", () => {
  let sut: AssignTokenService;
  let expectedIssuer: string;
  let publicKey: jose.CryptoKey;

  beforeAll(async () => {
    let app: INestApplication<App>;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    sut = app.get(AssignTokenService);
    const keyset: ConfigType<typeof keysetConfig> = app.get(keysetConfig.KEY);
    const appConf: ConfigType<typeof appConfig> = app.get(appConfig.KEY);

    const publicKeyBuffer = Buffer.from(keyset.JWT_PUBLIC_KEY, "base64").toString("utf-8");
    publicKey = await jose.importSPKI(publicKeyBuffer, "RS256");
    expectedIssuer = appConf.APP_URL;
  });

  it("it should produce an access token", async () => {
    const account = await accountsFactory.create();
    const result = await sut.execute({ account });

    assert(either.isRight(result), "it should have produced an access token successfully");
    expect(
      result.right,
      "its return object should contain an 'accessToken' property",
    ).toHaveProperty("accessToken");
  });

  it("it should produce a refresh token", async () => {
    const account = await accountsFactory.create();
    const result = await sut.execute({ account });

    assert(either.isRight(result), "it should have produced the JWTs successfully");
    expect(
      result.right,
      "its return object should contain an 'refreshToken' property",
    ).toHaveProperty("refreshToken");
  });

  it("should set the correct claims to the generated JWTs", async () => {
    const account = await accountsFactory.create();
    const result = await sut.execute({ account });

    assert(either.isRight(result), "it should have produced the JWTs successfully");

    const { accessToken, refreshToken } = result.right;

    for (const token of [accessToken, refreshToken]) {
      const { payload } = await jose.jwtVerify(token, publicKey);

      expect(
        payload.sub,
        "it should sign the ID of the logged-in user as the 'sub' claim of the JWTs",
      ).toBe(account.getId());
      expect(payload.name, "it should put the account name in the 'name' claim of the JWTs").toBe(
        account.getName(),
      );
      expect(
        payload.iss,
        "it should have the 'APP_URL' environment variable set as the issuer ('iss' claim)",
      ).toBe(expectedIssuer);
    }
  });
});
