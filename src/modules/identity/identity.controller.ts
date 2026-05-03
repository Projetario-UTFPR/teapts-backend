import { Public } from "@/infra/auth/decorators/public-route";
import exceptionsFactory from "@/infra/http/exceptions/exceptions-factory";
import { ValidationErrorBagPresenter } from "@/infra/http/exceptions/validation/presenter";
import { SignUpDto } from "@/modules/identity/dtos/signUp.dto";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { AccountWithEmailAlreadyExistError } from "@/modules/identity/errors/account-with-email-already-exist.error";
import { CreateAccountService } from "@/modules/identity/services/create-account.service";
import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import {
  ApiConflictResponse,
  ApiOkResponse,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
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
  @ApiUnprocessableEntityResponse({
    type: ValidationErrorBagPresenter,
    description: "Some of the inputs contain validation errors.",
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
