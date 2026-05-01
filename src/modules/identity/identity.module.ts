import { AuthenticateAccountService } from "@/modules/identity/services/authenticate-account.service";
import { SessionsController } from "@/modules/identity/sessions.controller";
import { Module } from "@nestjs/common";

@Module({
  providers: [AuthenticateAccountService],
  controllers: [SessionsController],
})
export class IdentityModule {}
