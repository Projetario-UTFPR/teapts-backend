import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { AuthCollection } from "@/infra/auth/auth-collection";
import { CurrentUser } from "@/infra/auth/decorators/current-user";
import { BasicExceptionPresenter } from "@/infra/http/exceptions/basic.presenter";
import exceptionsFactory from "@/infra/http/exceptions/exceptions-factory";
import { ValidationErrorBagPresenter } from "@/infra/http/exceptions/validation/presenter";
import { ProfessionalProfileNotFoundError } from "@/modules/professional/errors/professional-profile-not-found.error";
import { CreatePtsDto } from "@/modules/therapeutic-journey/dtos/create-pts.dto";
import { UpdateMultidisciplinaryTeamDTO } from "@/modules/therapeutic-journey/dtos/update-multidisciplinary-team.dto";
import { ProfessionalDoesNotBelongToUserAccountError } from "@/modules/therapeutic-journey/errors/professional-does-not-belong-to-user-account.error";
import { CreateDraftPtsService } from "@/modules/therapeutic-journey/services/create-draft-pts.service";
import { UpdateMultidisciplinaryTeamService } from "@/modules/therapeutic-journey/services/update-multidisciplinary-team.service";
import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Post,
  Put,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

@Controller("v1/pts")
export class PtsController {
  public constructor(
    private readonly createDraftPts: CreateDraftPtsService,
    private readonly updateMultidisciplinaryTeam: UpdateMultidisciplinaryTeamService,
  ) {}

  @Post("create")
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: "PTS successfully drafted.",
  })
  @ApiForbiddenResponse({
    type: BasicExceptionPresenter,
    description: "The provided professional is not allowed to create a PTS.",
  })
  @ApiUnprocessableEntityResponse({
    type: ValidationErrorBagPresenter,
    description: "Some of the inputs contain validation errors.",
  })
  @ApiConflictResponse({
    type: BasicExceptionPresenter,
    description: "The patient to which the PTS would be created already have an active PTS ATM.",
  })
  @ApiBadRequestResponse({
    type: BasicExceptionPresenter,
    description:
      "Some professional involved in the request is actually not registered in the platform.",
  })
  public storeNewPts(@Body() body: CreatePtsDto, @CurrentUser() { account }: AuthCollection) {
    return pipe(
      () =>
        this.createDraftPts.execute({
          accountId: account.getId(),
          professionalId: body.professionalId,
          patientId: body.patientId,
          socialSituation: body.socialSituation,
          multidisciplinaryTeamIds: body.multidisciplinaryTeamIds,
        }),
      te.mapLeft((error) => {
        // We obfuscate the reason why it cannot do it, since informing these could lead some malicious user
        // to successfully creating a PTS when it shouldn't be able to
        if (
          error instanceof ProfessionalProfileNotFoundError ||
          error instanceof ProfessionalDoesNotBelongToUserAccountError
        ) {
          throw new ForbiddenException(
            BasicExceptionPresenter.present({
              message: "Você não tem permissão para criar rascunhar um PTS.",
            }),
            { cause: error },
          );
        }

        return error;
      }),
      te.getOrElse(exceptionsFactory.fromError),
    )();
  }

  @Put("update/multidisciplinary-team")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiNoContentResponse({
    description: "Multidisciplinary team successfully updated. No content returned.",
  })
  @ApiNotFoundResponse({
    type: BasicExceptionPresenter,
    description: "PTS wasn't found.",
  })
  @ApiForbiddenResponse({
    type: BasicExceptionPresenter,
    description: "Professional is not the PTS responsible.",
  })
  @ApiBadRequestResponse({
    description: "Validation/bussiness rules errors",
    content: {
      "application/json": {
        examples: {
          professionalNotRegistered: {
            summary: "Profissional não registrado",
            value: BasicExceptionPresenter.present({
              message: "Este profissional não está apropriadamente registrado na plataforma.",
            }),
          },
          substituteNotRegistered: {
            summary: "Substituto não registrado",
            value: BasicExceptionPresenter.present({
              message:
                "Ao menos um dos profissionais da equipe não está registrado na plataforma apropriadamente.",
            }),
          },
          missingSubstitute: {
            summary: "Remoção sem substituto",
            value: BasicExceptionPresenter.present({
              message:
                "Responsável precisa prover ID de substituto quando busca revogar sua responsabilidade.",
            }),
          },
        },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    type: BasicExceptionPresenter,
    description: "Internal Server Error.",
  })
  public saveNewMultidisciplinaryTeam(
    @Body() body: UpdateMultidisciplinaryTeamDTO,
    @CurrentUser() { account }: AuthCollection,
  ) {
    return pipe(
      () => this.updateMultidisciplinaryTeam.execute({ accountId: account.getId(), ...body }),
      te.map(() => undefined),
      te.mapLeft((error) => {
        if (error instanceof IrrecoverableError) {
          throw new InternalServerErrorException(
            BasicExceptionPresenter.present({
              message: "Ocorreu um erro interno ao processar a atualização da equipe.",
            }),
            { cause: error },
          );
        }
        return error;
      }),
      te.getOrElse(exceptionsFactory.fromError),
    )();
  }
}
