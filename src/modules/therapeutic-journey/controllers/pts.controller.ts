import { AuthCollection } from "@/infra/auth/auth-collection";
import { CurrentUser } from "@/infra/auth/decorators/current-user";
import { BasicExceptionPresenter } from "@/infra/http/exceptions/basic.presenter";
import exceptionsFactory from "@/infra/http/exceptions/exceptions-factory";
import { ValidationErrorBagPresenter } from "@/infra/http/exceptions/validation/presenter";
import { ProfessionalProfileNotFoundError } from "@/modules/professional/errors/professional-profile-not-found.error";
import { CreatePtsDto } from "@/modules/therapeutic-journey/dtos/create-pts.dto";
import { ProfessionalDoesNotBelongToUserAccountError } from "@/modules/therapeutic-journey/errors/professional-does-not-belong-to-user-account.error";
import { CreateDraftPtsService } from "@/modules/therapeutic-journey/services/create-draft-pts.service";
import { Body, Controller, ForbiddenException, HttpCode, HttpStatus, Post } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

@Controller("v1/pts")
export class PtsController {
  public constructor(private readonly createDraftPts: CreateDraftPtsService) {}

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
}
