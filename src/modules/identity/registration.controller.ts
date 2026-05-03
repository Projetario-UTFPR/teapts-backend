import { Public } from "@/infra/auth/decorators/public-route";
import { BasicExceptionPresenter } from "@/infra/http/exceptions/basic.presenter";
import exceptionsFactory from "@/infra/http/exceptions/exceptions-factory";
import { ValidationErrorBagPresenter } from "@/infra/http/exceptions/validation/presenter";
import { SignUpDto } from "@/modules/identity/dtos/signUp.dto";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { CreateAccountService } from "@/modules/identity/services/create-account.service";
import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

@Controller("v1/registration")
export class RegistrationController {
  public constructor(private readonly createAccountService: CreateAccountService) {}

  @Public()
  @Post("registration")
  @ApiOkResponse({
    description: "User succesfully created.",
    type: Account,
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
  public login(@Body() signUpDto: SignUpDto) {
    return pipe(
      () =>
        this.createAccountService.execute({
          email: signUpDto.email,
          name: signUpDto.username,
          plainPassword: signUpDto.password,
          professionalProfilesIds: [],
        }),
      te.getOrElse(exceptionsFactory.fromError),
    )();
  }
}
