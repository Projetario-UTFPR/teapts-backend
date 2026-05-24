import { AssignTokenService } from "@/infra/auth/assign-token.service";
import { Public } from "@/infra/auth/decorators/public-route";
import { JWTokenPresenter } from "@/infra/auth/presenters/token.presenter";
import { GetAuthCollectionQueryHandler } from "@/infra/auth/query-handlers/get-auth-collection.query";
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
    private readonly getAuthCollection: GetAuthCollectionQueryHandler,
  ) {}

  @Public()
  @Post("login")
  @ApiOkResponse({
    description: "The successful authentication response.",
    type: JWTokenPresenter,
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
      te.Do,
      te.apS("account", () =>
        this.authenticateAccountService.execute({
          email: loginDto.email,
          plainPassword: loginDto.password,
        }),
      ),
      te.bindW(
        "tokens",
        ({ account }) =>
          () =>
            this.tokensService.execute({ account }),
      ),
      te.bindW(
        "authCollection",
        ({ account }) =>
          () =>
            this.getAuthCollection.execute({ accountId: account.getId() }),
      ),
      te.map(({ authCollection, tokens }) => JWTokenPresenter.present(tokens, authCollection)),
      te.getOrElse(exceptionsFactory.fromError),
    )();
  }
}
