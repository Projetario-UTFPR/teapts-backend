import exceptionsFactory from "@/infra/http/exceptions/exceptions-factory";
import { LoginDto } from "@/modules/identity/dtos/login.dto";
import { AuthenticateAccountService } from "@/modules/identity/services/authenticate-account.service";
import { Body, Controller, Post } from "@nestjs/common";
import { taskEither } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

@Controller("v1/sessions")
export class SessionsController {
  public constructor(private readonly authenticateAccountService: AuthenticateAccountService) {}

  @Post("login")
  public login(@Body() loginDto: LoginDto) {
    return pipe(
      () =>
        this.authenticateAccountService.execute({
          email: loginDto.email,
          plainPassword: loginDto.password,
        }),
      taskEither.getOrElse(exceptionsFactory.fromError),
    )();
  }
}
