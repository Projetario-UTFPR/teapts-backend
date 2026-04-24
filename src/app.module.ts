import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { Argon2Module } from "./infra/argon2/argon2.module";
import { PrismaModule } from "@/infra/prisma/prisma.module";

@Module({
  imports: [Argon2Module, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
