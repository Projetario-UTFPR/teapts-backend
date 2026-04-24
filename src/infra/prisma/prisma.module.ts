import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma";
import { AccountsRepository } from "@/modules/identity/repositories/accounts.repository";
import { PrismaAccountsRepository } from "@/infra/prisma/repositories/accounts.repository";

@Global()
@Module({
  providers: [PrismaService, { provide: AccountsRepository, useClass: PrismaAccountsRepository }],
  exports: [AccountsRepository],
})
export class PrismaModule {}
