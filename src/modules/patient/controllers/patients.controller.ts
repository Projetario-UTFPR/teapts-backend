import { BasePaginationDto } from "@/common/pagination/pagination-dto";
import { AuthCollection } from "@/infra/auth/auth-collection";
import { CurrentUser } from "@/infra/auth/decorators/current-user";
import exceptionsFactory from "@/infra/http/exceptions/exceptions-factory";
import { ValidationErrorBagPresenter } from "@/infra/http/exceptions/validation/presenter";
import { PaginatedPatientsPresenter } from "@/modules/patient/presenters/paginated-patients.presenter";
import { ListPatientsByProfessionalAccountQueryHandler } from "@/modules/patient/query-handlers/list-patients-by-professional-account.query";
import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiUnprocessableEntityResponse } from "@nestjs/swagger";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

@Controller("/v1/patients")
export class PatientsController {
  public constructor(
    private readonly listPatientsQuery: ListPatientsByProfessionalAccountQueryHandler,
  ) {}

  @ApiBearerAuth()
  @ApiOkResponse({
    description: "The paginated list of patients of the authenticated professional.",
    type: PaginatedPatientsPresenter,
  })
  @ApiUnprocessableEntityResponse({
    description: "The query parameters are invalid.",
    type: ValidationErrorBagPresenter,
  })
  @Get("me")
  public listPatients(
    @Query() { page, limit }: BasePaginationDto,
    @CurrentUser() { account }: AuthCollection,
  ) {
    return pipe(
      () =>
        this.listPatientsQuery.execute({
          professionalAccountId: account.getId(),
          limit,
          page,
        }),
      te.getOrElse(exceptionsFactory.fromError),
    )();
  }
}
