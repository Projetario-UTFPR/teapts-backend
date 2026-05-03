import { Public } from "@/infra/auth/decorators/public-route";
import { BasicExceptionPresenter } from "@/infra/http/exceptions/basic.presenter";
import exceptionsFactory from "@/infra/http/exceptions/exceptions-factory";
import { SignUpDto } from "@/modules/identity/dtos/signUp.dto";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { AccountWithEmailAlreadyExistError } from "@/modules/identity/errors/account-with-email-already-exist.error";
import { CreateAccountService } from "@/modules/identity/services/create-account.service";
import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiConflictResponse, ApiOkResponse, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

@Controller("v1/identities")
export class IdentityController {
  public constructor(private readonly createAccountService: CreateAccountService) {}

  @Public()
  @Post("create-account")
  @ApiOkResponse({
    description: "User succesfully created.",
    type: Account,
  })
  @ApiConflictResponse({
    type: AccountWithEmailAlreadyExistError,
    description: "Email already in use.",
  })
  @ApiUnauthorizedResponse({
    type: BasicExceptionPresenter,
    description: "Provided credentials are wrong.",
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  public createAccount(@Body() signUpDto: SignUpDto) {
    return pipe(
      () =>
        this.createAccountService.execute({
          email: signUpDto.email,
          name: signUpDto.name,
          plainPassword: signUpDto.password,
        }),
      te.map(() => {}),
      te.getOrElse(exceptionsFactory.fromError),
    )();
  }
}
