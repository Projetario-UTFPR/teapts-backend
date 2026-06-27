import { BasePaginationDto } from "@/common/pagination/pagination-dto";
import { AuthCollection } from "@/infra/auth/auth-collection";
import { CurrentUser } from "@/infra/auth/decorators/current-user";
import { BasicExceptionPresenter } from "@/infra/http/exceptions/basic.presenter";
import exceptionsFactory from "@/infra/http/exceptions/exceptions-factory";
import { ValidationErrorBagPresenter } from "@/infra/http/exceptions/validation/presenter";
import { AccountNotFoundError } from "@/modules/identity/errors/account-not-found.error";
import { CreatePatientProfileDto } from "@/modules/patient/dtos/create-patient-profile.dto";
import { PaginatedPatientsPresenter } from "@/modules/patient/presenters/paginated-patients.presenter";
import { PatientPresenter } from "@/modules/patient/presenters/patient.presenter";
import { ListPatientsByProfessionalAccountQueryHandler } from "@/modules/patient/query-handlers/list-patients-by-professional-account.query";
import { CreatePatientProfileService } from "@/modules/patient/services/create-patient-profile.service";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

@Controller("/v1/patients")
export class PatientsController {
  public constructor(
    private readonly listPatientsQuery: ListPatientsByProfessionalAccountQueryHandler,
    private readonly createPatientProfile: CreatePatientProfileService,
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

  @ApiCreatedResponse({
    description: "The patient profile has been successfully created.",
    type: PatientPresenter,
  })
  @ApiForbiddenResponse({
    description: "The user is not authorized to create new patient profiles.",
    type: BasicExceptionPresenter,
  })
  @ApiBadRequestResponse({
    description: "The given account cannot have a new patient profile.",
    content: {
      "application/json": {
        examples: {
          accountAlreadyHasPatientProfile: {
            summary: "Account already has a patient profile",
            value: BasicExceptionPresenter.present({
              message: "A conta providenciada já possui um perfil de paciente.",
            }),
          },
          accountDoesNotExist: {
            summary: "Account does not exist",
            value: BasicExceptionPresenter.present({
              message: "A conta selecionada não existe no sistema.",
            }),
          },
        },
      },
    },
  })
  @Post("create")
  @HttpCode(HttpStatus.CREATED)
  public createPatient(
    @CurrentUser() { account }: AuthCollection,
    @Body() { accountId, supportContacts }: CreatePatientProfileDto,
  ) {
    return pipe(
      () =>
        this.createPatientProfile.execute({ adminAccount: account, accountId, supportContacts }),
      te.map((patient) => PatientPresenter.present(patient)),
      te.getOrElse((error) => {
        if (error instanceof AccountNotFoundError) {
          throw new BadRequestException(BasicExceptionPresenter.present(error), { cause: error });
        }

        return exceptionsFactory.fromError(error);
      }),
    )();
  }
}
