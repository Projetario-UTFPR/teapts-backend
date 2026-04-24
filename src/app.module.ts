import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { Argon2Module } from "./infra/argon2/argon2.module";

@Module({
  imports: [Argon2Module],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
