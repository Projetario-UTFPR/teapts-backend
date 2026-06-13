import { Test, type TestingModule } from "@nestjs/testing";

type Params = {
  extraImports?: Parameters<typeof Test.createTestingModule>[0]["imports"];
  extraProviders?: Parameters<typeof Test.createTestingModule>[0]["providers"];
  extraControllers?: Parameters<typeof Test.createTestingModule>[0]["controllers"];
};

export async function getTestingApp({
  extraImports,
  extraProviders,
  extraControllers,
}: Params = {}) {
  const { AppModule } = await import("@/app.module.js");

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [...(extraImports ?? []), AppModule],
    providers: extraProviders,
    controllers: extraControllers,
  }).compile();

  return moduleFixture.createNestApplication();
}
