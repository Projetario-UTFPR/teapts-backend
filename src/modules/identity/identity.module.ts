import { IdentityController } from "@/modules/identity/controllers/identity.controller";
import { AuthenticateAccountService } from "@/modules/identity/services/authenticate-account.service";
import { CreateAccountService } from "@/modules/identity/services/create-account.service";
import { SessionsController } from "@/modules/identity/controllers/sessions.controller";
import { Module } from "@nestjs/common";
import { ListAccountsQueryHandler } from "@/modules/identity/query-handlers/list-accounts.query";

@Module({
  providers: [AuthenticateAccountService, CreateAccountService, ListAccountsQueryHandler],
  controllers: [SessionsController, IdentityController],
})
export class IdentityModule {}
