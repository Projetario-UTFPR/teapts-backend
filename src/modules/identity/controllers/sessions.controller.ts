import { AssignTokenService } from "@/infra/auth/assign-token.service";
import { Public } from "@/infra/auth/decorators/public-route";
import { JWTokensPresenter } from "@/infra/auth/presenters/tokens.presenter";
import { BasicExceptionPresenter } from "@/infra/http/exceptions/basic.presenter";
import exceptionsFactory from "@/infra/http/exceptions/exceptions-factory";
import { ValidationErrorBagPresenter } from "@/infra/http/exceptions/validation/presenter";
import { LoginDto } from "@/modules/identity/dtos/login.dto";
import { AuthenticateAccountService } from "@/modules/identity/services/authenticate-account.service";
import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

@Controller("v1/sessions")
export class SessionsController {
  public constructor(
    private readonly authenticateAccountService: AuthenticateAccountService,
    private readonly tokensService: AssignTokenService,
  ) {}

  @Public()
  @Post("login")
  @ApiOkResponse({
    description: "The successful authentication response.",
    type: JWTokensPresenter,
  })
  @ApiUnprocessableEntityResponse({
    type: ValidationErrorBagPresenter,
    description: "Some of the inputs contain validation errors.",
  })
  @ApiUnauthorizedResponse({
    type: BasicExceptionPresenter,
    description: "Provided credentials are wrong.",
  })
  @HttpCode(HttpStatus.OK)
  public login(@Body() loginDto: LoginDto) {
    return pipe(
      () =>
        this.authenticateAccountService.execute({
          email: loginDto.email,
          plainPassword: loginDto.password,
        }),
      te.chainW((account) => () => this.tokensService.execute({ account })),
      te.map(JWTokensPresenter.present),
      te.getOrElse(exceptionsFactory.fromError),
    )();
  }
}
