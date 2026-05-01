import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma";
import { AccountsRepository } from "@/modules/identity/repositories/accounts.repository";
import { PrismaAccountsRepository } from "@/infra/prisma/repositories/accounts.repository";
import { ProfessionalsRepository } from "@/modules/professional/professionals.repository";
import { PrismaProfessionalsRepository } from "@/infra/prisma/repositories/professionals.repository";

@Global()
@Module({
  providers: [
    PrismaService,
    { provide: AccountsRepository, useClass: PrismaAccountsRepository },
    { provide: ProfessionalsRepository, useClass: PrismaProfessionalsRepository },
  ],
  exports: [PrismaService, AccountsRepository, ProfessionalsRepository],
})
export class PrismaModule {}
