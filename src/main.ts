import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { expand } from "dotenv-expand";
import { config } from "dotenv";

async function bootstrap() {
  expand(config());

  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
