import { BasicExceptionPresenter } from "@/infra/http/exceptions/basic.presenter";
import exceptionsFactory from "@/infra/http/exceptions/exceptions-factory";
import { ListProfessionalsDto } from "@/modules/professional/dtos/list-professionals.dto";
import { PaginatedProfessionalsWithAccountsPresenter } from "@/modules/professional/presenters/paginated-professionals-with-accounts.presenter";
import { ListProfessionalsQueryHandler } from "@/modules/professional/query-handlers/list-professionals.query";
import { Controller, Get, HttpCode, HttpStatus, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { taskEither } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

@Controller("v1/professionals")
export class ProfessionalsController {
  public constructor(private readonly listProfessionalsQH: ListProfessionalsQueryHandler) {}

  // TODO: add e2e test to this endpoint ASAP!!
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOkResponse({
    description: "A paginated list of professionals registered in the system.",
    type: PaginatedProfessionalsWithAccountsPresenter,
  })
  @ApiUnauthorizedResponse({
    description: "Login required.",
    type: BasicExceptionPresenter,
  })
  public listProfessionals(
    @Query() { specialisms, limit, name, inIds, page }: ListProfessionalsDto,
  ) {
    return pipe(
      () =>
        this.listProfessionalsQH.execute({
          page,
          limit,
          name,
          specialisms,
          inIds,
        }),
      taskEither.map(({ professionals, count, currentPage, resolvedLimit }) =>
        PaginatedProfessionalsWithAccountsPresenter.present({
          items: professionals,
          count,
          currentPage,
          resolvedLimit,
        }),
      ),
      taskEither.getOrElse(exceptionsFactory.fromError),
    )();
  }
}
