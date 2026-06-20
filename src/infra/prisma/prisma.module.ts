import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma";
import { AccountsRepository } from "@/modules/identity/repositories/accounts.repository";
import { PrismaAccountsRepository } from "@/infra/prisma/repositories/accounts.repository";
import { ProfessionalsRepository } from "@/modules/professional/professionals.repository";
import { PrismaProfessionalsRepository } from "@/infra/prisma/repositories/professionals.repository";
import { PtsRepository } from "@/modules/therapeutic-journey/repositories/pts.repository";
import { PrismaPtsRepository } from "@/infra/prisma/repositories/pts.repository";
import { DocumentsRepository } from "@/modules/patient/repositories/documents.repository";
import { PrismaDocumentsRepository } from "@/infra/prisma/repositories/documents.repository";
import { ActivityRepository } from "@/modules/therapeutic-journey/repositories/activity.repository";
import { PrismaActivityRepository } from "./repositories/activity.repository";

@Global()
@Module({
  providers: [
    PrismaService,
    { provide: AccountsRepository, useClass: PrismaAccountsRepository },
    { provide: ProfessionalsRepository, useClass: PrismaProfessionalsRepository },
    { provide: PtsRepository, useClass: PrismaPtsRepository },
    { provide: DocumentsRepository, useClass: PrismaDocumentsRepository },
    { provide: ActivityRepository, useClass: PrismaActivityRepository },
  ],
  exports: [
    PrismaService,
    AccountsRepository,
    ProfessionalsRepository,
    PtsRepository,
    DocumentsRepository,
    ActivityRepository,
  ],
})
export class PrismaModule {}
