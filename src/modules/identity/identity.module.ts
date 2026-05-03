import { RegistrationController } from "@/modules/identity/registration.controller";
import { AuthenticateAccountService } from "@/modules/identity/services/authenticate-account.service";
import { CreateAccountService } from "@/modules/identity/services/create-account.service";
import { SessionsController } from "@/modules/identity/sessions.controller";
import { Module } from "@nestjs/common";

@Module({
  providers: [AuthenticateAccountService, CreateAccountService],
  controllers: [SessionsController, RegistrationController],
})
export class IdentityModule {}
