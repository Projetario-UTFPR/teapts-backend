import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { expand } from "dotenv-expand";
import { config } from "dotenv";
import { DocumentBuilder, SwaggerDocumentOptions, SwaggerModule } from "@nestjs/swagger";
import appConfig from "@/configs/app.config";
import type { ConfigType } from "@nestjs/config";
import { BasicExceptionPresenter } from "@/infra/http/exceptions/basic.presenter";

async function bootstrap() {
  expand(config());

  const app = await NestFactory.create(AppModule);

  const appConfigs: ConfigType<typeof appConfig> = app.get(appConfig.KEY);

  const swaggerConfig = new DocumentBuilder()
    .setTitle("TEA PTS API v1")
    .setVersion(appConfigs.APP_VERSION ?? "development")
    .addGlobalResponse({
      status: 500,
      type: BasicExceptionPresenter,
      description: "Some server internal error has occurred.",
    })
    .addBearerAuth()
    .build();

  const swaggerOptions = {
    operationIdFactory: (_controllerKey: string, methodKey: string) => methodKey,
  } satisfies SwaggerDocumentOptions;

  const document = SwaggerModule.createDocument(app, swaggerConfig, swaggerOptions);
  SwaggerModule.setup("/api-docs/v1", app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
