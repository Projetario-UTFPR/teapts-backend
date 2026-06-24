import { InvalidArgumentError } from "@/common/errors/invalid-argument.error";
import { ValidationErrorsBag } from "@/common/errors/validation-errors-bag.error";
import { FrequencyIntegrityViolationError } from "@/common/time/errors/frequency-integrity-violation.error";
import { Frequency } from "@/common/time/value-objects/frequency.vo";
import { AuthCollection } from "@/infra/auth/auth-collection";
import { CurrentUser } from "@/infra/auth/decorators/current-user";
import { BasicExceptionPresenter } from "@/infra/http/exceptions/basic.presenter";
import exceptionsFactory from "@/infra/http/exceptions/exceptions-factory";
import { ValidationErrorBagPresenter } from "@/infra/http/exceptions/validation/presenter";
import { DocumentNotFoundError } from "@/modules/patient/errors/document-not-found-error";
import { ProfessionalProfileNotFoundError } from "@/modules/professional/errors/professional-profile-not-found.error";
import { TimelineRecord } from "@/modules/therapeutic-journey/aggregates/timeline-record.aggregate";
import { CreateActivityDTO } from "@/modules/therapeutic-journey/dtos/create-new-activity-dto";
import { PtsNotFoundError } from "@/modules/therapeutic-journey/errors/pts-not-found.error";
import { ShallowActivityPresenter } from "@/modules/therapeutic-journey/presenters/shallow-activity.presenter";
import { CreateActivityService } from "@/modules/therapeutic-journey/services/create-activity.service";
import { CreateActivePtsTimelineRecordService } from "@/modules/therapeutic-journey/services/create-timeline-record.service";
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { ListActivitiesQueryHandler } from "../query-handlers/list-activities.query";
import { PaginatedActivitiesPresenter } from "../presenters/paginated-activities.presenter";
import { ListActivitiesDto } from "../dtos/list-activities.dto";
import { ProfessionalDoesNotBelongToUserAccountError } from "../errors/professional-does-not-belong-to-user-account.error";
import { ProfessionalNotAuthorizedToAccessPts } from "../errors/professional-not-authorized-to-access-pts.error";
import { VerifyAccountIsAuthorizedAsPatientOrProfessionalService } from "../services/verify-account-is-authorized-as-patient-or-professional.service";

@Controller("v1/pts/:patientId/activity")
@ApiTags("PTS's Activities")
@ApiParam({
  name: "patientId",
  description: "The ID of the patient whose PTS is to be accessed.",
  type: "string",
  format: "uuid",
})
export class ActivitiesController {
  public constructor(
    private readonly createActivity: CreateActivityService,
    private readonly createTimelineRecord: CreateActivePtsTimelineRecordService,
    private readonly listActivitiesHandler: ListActivitiesQueryHandler,
    private readonly verifyAuthService: VerifyAccountIsAuthorizedAsPatientOrProfessionalService,
  ) {}

  @Post("create")
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: "Activity successfully created.",
    type: ShallowActivityPresenter,
  })
  @ApiUnprocessableEntityResponse({
    type: ValidationErrorBagPresenter,
    description: "Some of the inputs contain validation errors.",
  })
  @ApiForbiddenResponse({
    description: "The user is not authorized to proceed",
    content: {
      "application/json": {
        examples: {
          professionalUnauthorized: {
            summary: "Professional is not authorized to access the PTS",
            value: BasicExceptionPresenter.present({
              message: "〜motivo pelo qual o profissional não pode acessar o PTS.",
            }),
          },
          documentDoesNotBelongToPatient: {
            summary: "The document is not related to the patient owning the PTS.",
            value: BasicExceptionPresenter.present({
              message: "O documento não pertence ao paciente e não pode ser atrelado à atividade.",
            }),
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: "The request have integrity issues.",
    content: {
      "application/json": {
        examples: {
          ptsNotFound: {
            summary: "PTS not found",
            value: BasicExceptionPresenter.present({
              message: "O PTS informado não existe.",
            }),
          },
          substituteNotRegistered: {
            summary: "Document not found",
            value: BasicExceptionPresenter.present({
              message: "O documento referido não existe no sistema.",
            }),
          },
        },
      },
    },
  })
  public createNewActivity(
    @Body() body: CreateActivityDTO,
    @CurrentUser() { account }: AuthCollection,
    @Param("patientId") patientId: string,
  ) {
    return pipe(
      te.fromEither(Frequency.create(body.frequency)),
      te.chainW(
        (frequency) => () =>
          this.createActivity.execute({
            professionalId: body.professionalId,
            patientId,
            accountId: account.getId(),
            documentsIds: body.documentsIds,
            title: body.title,
            frequency,
          }),
      ),
      // silently adding a timeline record — yet in foreground
      // see: https://github.com/orgs/Projetario-UTFPR/projects/1/views/1?pane=issue&itemId=204038934
      te.chainFirstW((activity) =>
        pipe(
          () =>
            this.createTimelineRecord.execute({
              patientId,
              description: `A nova atividade ${body.title} foi sugerida.`,
              target: TimelineRecord.TargetType.Activity,
              targetId: activity.getId(),
              type: TimelineRecord.Type.Created,
              responsibleProfessionalId: body.professionalId,
            }),
          te.orElseW((error) => {
            console.error(
              "Ocorreu uma falha ao criar (silenciosamente) o registro de Timeline " +
                `sobre a criação da atividade de ID "${activity.getId().toString()}".`,
              error,
            );
            return te.right(undefined);
          }),
        ),
      ),
      te.map(ShallowActivityPresenter.present),
      te.getOrElse((error) => {
        if (error instanceof PtsNotFoundError || error instanceof DocumentNotFoundError) {
          // These resources not being found indicates that the user performed some bad
          // request actually... We would map the not found error to an actual
          // NOT FOUND HTTP stauts code if the resource of this endpoint — the activity —
          // was the one not being found, only.
          throw new BadRequestException(BasicExceptionPresenter.present(error));
        }

        if (error instanceof ProfessionalProfileNotFoundError) {
          throw new ForbiddenException(BasicExceptionPresenter.present(error), { cause: error });
        }

        // Frequency never returns a invalid argument error because it should not
        // guess what it's named in DTOs — that lies down in another layer.
        // Therefore, we convert it now that we know how it's referred to.
        if (error instanceof FrequencyIntegrityViolationError) {
          const frequencyViolationAsInvalidArgumentError = new InvalidArgumentError({
            errorMessage: error.message,
            field: "frequency",
          });

          const validationErrors = new ValidationErrorsBag();
          validationErrors.appendError(frequencyViolationAsInvalidArgumentError);
          return exceptionsFactory.fromError(validationErrors);
        }

        return exceptionsFactory.fromError(error);
      }),
    )();
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOkResponse({
    description: "A paginated list of activities registered in the PTS.",
    type: PaginatedActivitiesPresenter,
  })
  @ApiForbiddenResponse({
    description: "The user is not authorized to access the requested PTS.",
    type: BasicExceptionPresenter,
  })
  @ApiBadRequestResponse({
    description: "The request have integrity issues.",
    content: {
      "application/json": {
        examples: {
          invalidUUID: {
            summary: "Invalid Patient ID",
            value: BasicExceptionPresenter.present({
              message: "Validation failed (uuid is expected)",
            }),
          },
        },
      },
    },
  })
  public listActivities(
    @Param("patientId", ParseUUIDPipe) patientId: string,
    @Query() { limit, page }: ListActivitiesDto,
    @CurrentUser() { account, patientProfile }: AuthCollection,
  ) {
    return pipe(
      () =>
        this.verifyAuthService.execute({
          patientId: patientId,
          account,
          accountPatientProfile: patientProfile,
        }),

      te.chainW(
        () => () =>
          this.listActivitiesHandler.execute({
            patientId,
            page,
            limit,
          }),
      ),

      te.map(({ activities, count, currentPage, resolvedLimit }) =>
        PaginatedActivitiesPresenter.present({
          items: activities,
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
