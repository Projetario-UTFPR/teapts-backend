import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { Argon2Module } from "./infra/argon2/argon2.module";
import { ExceptionsModule } from "@/infra/http/exceptions/exceptions.module";
import { ValidationProviderModule } from "@/infra/http/validation-provider/validation-provider.module";

@Module({
  imports: [Argon2Module, ExceptionsModule, ValidationProviderModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
