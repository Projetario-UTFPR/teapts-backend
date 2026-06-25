import { AuthCollection } from "@/infra/auth/auth-collection";
import { CurrentUser } from "@/infra/auth/decorators/current-user";
import { BasicExceptionPresenter } from "@/infra/http/exceptions/basic.presenter";
import exceptionsFactory from "@/infra/http/exceptions/exceptions-factory";
import { ValidationErrorBagPresenter } from "@/infra/http/exceptions/validation/presenter";
import { ProfessionalDoesNotBelongToUserAccountError } from "@/modules/therapeutic-journey/errors/professional-does-not-belong-to-user-account.error";
import { ProfessionalNotAuthorizedToAccessPts } from "@/modules/therapeutic-journey/errors/professional-not-authorized-to-access-pts.error";
import { VerifyAccountIsAuthorizedAsPatientOrProfessionalService } from "../services/verify-account-is-authorized-as-patient-or-professional.service";
import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

import { ListTimelineRecordsDto } from "../dtos/list-timeline-records.dto";
import { ListTimelineRecordsQueryHandler } from "../query-handlers/list-timeline-records.query";
import { PaginatedTimelinePresenter } from "../presenters/paginated-timeline-records.presenter";

@ApiTags("Timeline")
@Controller("v1/pts")
export class TimelineController {
  constructor(
    private readonly verifyAuthService: VerifyAccountIsAuthorizedAsPatientOrProfessionalService,
    private readonly listTimelineRecordsHandler: ListTimelineRecordsQueryHandler,
  ) {}

  @Get(":patientId/timeline")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOkResponse({
    description: "A paginated list of timeline records registered in the PTS.",
    type: PaginatedTimelinePresenter,
  })
  @ApiForbiddenResponse({
    description: "The user is not authorized to access the requested PTS timeline.",
    type: BasicExceptionPresenter,
  })
  @ApiBadRequestResponse({
    description: "The request has integrity issues (UUID invalid).",
    type: BasicExceptionPresenter,
  })
  @ApiUnprocessableEntityResponse({
    description: "Some of the query parameters contain validation errors.",
    type: ValidationErrorBagPresenter,
  })
  public listTimeline(
    @Param("patientId", ParseUUIDPipe) patientId: string,
    @Query() dto: ListTimelineRecordsDto,
    @CurrentUser() { account, patientProfile }: AuthCollection,
  ) {
    return pipe(
      () =>
        this.verifyAuthService.execute({
          patientId,
          account,
          accountPatientProfile: patientProfile,
        }),

      te.chainW(
        () => () =>
          this.listTimelineRecordsHandler.execute({
            patientId,
            page: dto.page,
            limit: dto.limit,
            target: dto.target,
            type: dto.type,
            responsibleProfessionalId: dto.professionalId,
            description: dto.description,
            startDate: dto.startDate,
            endDate: dto.endDate,
          }),
      ),

      te.map(({ records, count, currentPage, resolvedLimit }) =>
        PaginatedTimelinePresenter.present({
          items: records,
          count,
          currentPage,
          resolvedLimit,
        }),
      ),

      te.getOrElse((error) => {
        if (
          error instanceof ProfessionalNotAuthorizedToAccessPts ||
          error instanceof ProfessionalDoesNotBelongToUserAccountError
        ) {
          throw new ForbiddenException(BasicExceptionPresenter.present(error), { cause: error });
        }

        return exceptionsFactory.fromError(error);
      }),
    )();
  }
}
