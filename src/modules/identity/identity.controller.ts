import { Public } from "@/infra/auth/decorators/public-route";
import { BasicExceptionPresenter } from "@/infra/http/exceptions/basic.presenter";
import exceptionsFactory from "@/infra/http/exceptions/exceptions-factory";
import { ValidationErrorBagPresenter } from "@/infra/http/exceptions/validation/presenter";
import { SignUpDto } from "@/modules/identity/dtos/signUp.dto";
import { CreateAccountService } from "@/modules/identity/services/create-account.service";
import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import {
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

@Controller("v1/identities")
export class IdentityController {
  public constructor(private readonly createAccountService: CreateAccountService) {}

  @Public()
  @Post("create-account")
  @ApiNoContentResponse({
    description: "User succesfully created.",
  })
  @ApiConflictResponse({
    type: BasicExceptionPresenter,
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
