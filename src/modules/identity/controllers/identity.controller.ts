import { ForbiddenError } from "@/common/errors/forbidden.error";
import { AuthCollection } from "@/infra/auth/auth-collection";
import { CurrentUser } from "@/infra/auth/decorators/current-user";
import { Public } from "@/infra/auth/decorators/public-route";
import { BasicExceptionPresenter } from "@/infra/http/exceptions/basic.presenter";
import exceptionsFactory from "@/infra/http/exceptions/exceptions-factory";
import { ValidationErrorBagPresenter } from "@/infra/http/exceptions/validation/presenter";
import { ListAccountsDto } from "@/modules/identity/dtos/list-accounts.dto";
import { SignUpDto } from "@/modules/identity/dtos/signUp.dto";
import { PaginatedAccountPresenter } from "@/modules/identity/presenters/paginated-accounts.presenter";
import { ListAccountsQueryHandler } from "@/modules/identity/query-handlers/list-accounts.query";
import { CreateAccountService } from "@/modules/identity/services/create-account.service";
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

@Controller("v1/identities")
export class IdentityController {
  public constructor(
    private readonly createAccountService: CreateAccountService,
    private readonly listAccounts: ListAccountsQueryHandler,
  ) {}

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

  @ApiBearerAuth()
  @ApiOkResponse({
    description: "A paginated list of accounts.",
    type: PaginatedAccountPresenter,
  })
  @ApiForbiddenResponse({
    description: "The user is not allowed to list the accounts registered in the system.",
    type: BasicExceptionPresenter,
  })
  @ApiUnprocessableEntityResponse({
    description: "The query parameters are incorrect.",
    type: ValidationErrorBagPresenter,
  })
  @Get("")
  public list(
    @CurrentUser() { account, professionalProfiles }: AuthCollection,
    @Query() { page, limit, isPatient, isProfessional }: ListAccountsDto,
  ) {
    if (!account.isAdmin() && professionalProfiles.length == 0) {
      return exceptionsFactory.fromError(
        new ForbiddenError({
          message: "Você não está autorizado a visualizar as contas do sistema.",
        }),
      );
    }

    return pipe(
      () =>
        this.listAccounts.execute({
          isPatient,
          isProfessional,
          limit,
          page,
        }),
      te.getOrElse(exceptionsFactory.fromError),
    )();
  }
}
