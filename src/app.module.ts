import { Module } from "@nestjs/common";
import { Argon2Module } from "./infra/argon2/argon2.module";
import { ExceptionsModule } from "@/infra/http/exceptions/exceptions.module";
import { ValidationProviderModule } from "@/infra/http/validation-provider/validation-provider.module";
import { PrismaModule } from "@/infra/prisma/prisma.module";
import { IdentityModule } from "@/modules/identity/identity.module";
import { ConfigModule } from "@nestjs/config";
import datastoreConfig from "@/configs/datastore.config";
import { AuthModule } from "@/infra/auth/auth.module";
import appConfig from "@/configs/app.config";
import keysetConfig from "@/configs/jwt.config";
import { TherapeuticJourneyModule } from "@/modules/therapeutic-journey/therapeutic-journey.module";
import { ProfessionalsModule } from "@/modules/professional/professionals.module";
import { S3Module } from "@/infra/s3/s3.module";
import blobStorageConfig from "@/configs/blob-storage.config";
import { PatientModule } from "@/modules/patient/patient.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [datastoreConfig, appConfig, keysetConfig, blobStorageConfig],
      expandVariables: true,
    }),
    Argon2Module,
    ExceptionsModule,
    ValidationProviderModule,
    PrismaModule,
    S3Module,
    IdentityModule,
    AuthModule,
    TherapeuticJourneyModule,
    ProfessionalsModule,
    PatientModule,
  ],
})
export class AppModule {}
