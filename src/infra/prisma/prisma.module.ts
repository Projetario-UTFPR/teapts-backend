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
import { TimelineRepository } from "@/modules/therapeutic-journey/repositories/timeline.repository";
import { PrismaTimelineRepository } from "@/infra/prisma/repositories/timeline.repository";
import { TransactionManager } from "@/common/transaction-manager";
import { PrismaTransactionManager } from "@/infra/prisma/transaction-manager";
import { PatientsRepository } from "@/modules/patient/repositories/patients.repository";
import { PrismaPatientsRepository } from "@/infra/prisma/repositories/patients.repository";

@Global()
@Module({
  providers: [
    PrismaService,
    { provide: AccountsRepository, useClass: PrismaAccountsRepository },
    { provide: ProfessionalsRepository, useClass: PrismaProfessionalsRepository },
    { provide: PtsRepository, useClass: PrismaPtsRepository },
    { provide: DocumentsRepository, useClass: PrismaDocumentsRepository },
    { provide: ActivityRepository, useClass: PrismaActivityRepository },
    { provide: TimelineRepository, useClass: PrismaTimelineRepository },
    { provide: PrismaTransactionManager, useClass: PrismaTransactionManager },
    { provide: TransactionManager, useExisting: PrismaTransactionManager },
    { provide: PatientsRepository, useClass: PrismaPatientsRepository },
  ],
  exports: [
    PrismaService,
    AccountsRepository,
    ProfessionalsRepository,
    PtsRepository,
    DocumentsRepository,
    ActivityRepository,
    TimelineRepository,
    TransactionManager,
    PatientsRepository,
  ],
})
export class PrismaModule {}
