import { AuthCollection } from "@/infra/auth/auth-collection";
import { CurrentUser } from "@/infra/auth/decorators/current-user";
import { BasicExceptionPresenter } from "@/infra/http/exceptions/basic.presenter";
import exceptionsFactory from "@/infra/http/exceptions/exceptions-factory";
import { ValidationErrorBagPresenter } from "@/infra/http/exceptions/validation/presenter";
import { InitiateDocumentUploadDto } from "@/modules/patient/dtos/initiate-document-upload.dto";
import { UploadDocumentDto } from "@/modules/patient/dtos/upload-document.dto";
import { PatientNotFoundError } from "@/modules/patient/errors/patient-not-found-error";
import { DocumentUploadInitiationPresenter } from "@/modules/patient/presenters/document-upload-initiation.presenter";
import { AddNewDocumentToProntuarioService } from "@/modules/patient/services/add-new-document-to-prontuario.service";
import { SignDocumentUploadUrlService } from "@/modules/patient/services/sign-document-upload-url.service";
import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiParam,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

@Controller("v1/patient/:patientId/prontuario")
export class ProntuarioController {
  public constructor(
    private readonly signDocumentUploadUrl: SignDocumentUploadUrlService,
    private readonly addNewDocument: AddNewDocumentToProntuarioService,
  ) {}

  @ApiCreatedResponse({
    description: "URL for uploading the document successfully issued.",
    type: DocumentUploadInitiationPresenter,
  })
  @ApiBadRequestResponse({
    description: "Tried to attach a document to the prontuário of a unexisting patient.",
    type: BasicExceptionPresenter,
  })
  @ApiUnprocessableEntityResponse({
    description: "The request body is invalid.",
    type: ValidationErrorBagPresenter,
  })
  @ApiForbiddenResponse({
    description: "Professional is not authorized.",
    content: {
      "application/json": {
        examples: {
          professionalNotAuthorized: {
            summary: "Unauthorized professional",
            value: BasicExceptionPresenter.present({
              message:
                "Esse profissional não tem acesso ao PTS (e, logo, ao prontuário) do paciente.",
            }),
          },
          professionalProfileDoesntBelongToActualUser: {
            summary: "Professional profile belonging to others",
            value: BasicExceptionPresenter.present({
              message:
                "O perfil profissional escolhido não pertence à conta do usuário autenticado.",
            }),
          },
        },
      },
    },
  })
  @ApiParam({
    name: "patientId",
    description: "The ID of the patient whose prontuário is being modified.",
    type: "string",
    format: "uuid",
  })
  @Post("document/upload/initiate")
  @HttpCode(HttpStatus.CREATED)
  public initiateDocumentUpload(
    @CurrentUser() user: AuthCollection,
    @Body() body: InitiateDocumentUploadDto,
    @Param("patientId")
    patientId: string,
  ) {
    return pipe(
      () =>
        this.signDocumentUploadUrl.execute({
          patientId,
          accountId: user.account.getId(),
          documentFileName: body.fileName,
          documentFileType: body.fileType,
          documentFileSize: body.fileSize,
        }),
      te.map(DocumentUploadInitiationPresenter.present),
      te.getOrElse((error) => {
        if (error instanceof PatientNotFoundError) {
          throw new BadRequestException(BasicExceptionPresenter.present(error), { cause: error });
        }

        return exceptionsFactory.fromError(error);
      }),
    )();
  }

  @ApiNoContentResponse({
    description: "The document has been successfully created and persisted.",
  })
  @ApiBadRequestResponse({
    description: "Tried to modify the prontuário of a unexisting patient.",
    type: BasicExceptionPresenter,
  })
  @ApiUnprocessableEntityResponse({
    description: "The request body is invalid.",
    type: ValidationErrorBagPresenter,
  })
  @ApiForbiddenResponse({
    description: "Professional is not authorized.",
    content: {
      "application/json": {
        examples: {
          professionalNotAuthorized: {
            summary: "Unauthorized professional",
            value: BasicExceptionPresenter.present({
              message:
                "Esse profissional não tem acesso ao PTS (e, logo, ao prontuário) do paciente.",
            }),
          },
          professionalProfileDoesntBelongToActualUser: {
            summary: "Professional profile belonging to others",
            value: BasicExceptionPresenter.present({
              message:
                "O perfil profissional escolhido não pertence à conta do usuário autenticado.",
            }),
          },
        },
      },
    },
  })
  @ApiParam({
    name: "patientId",
    description: "The ID of the patient whose prontuário is being modified.",
    type: "string",
    format: "uuid",
  })
  @Post("document/upload")
  @HttpCode(HttpStatus.NO_CONTENT)
  public async persistDocument(
    @CurrentUser() user: AuthCollection,
    @Param("patientId") patientId: string,
    @Body() body: UploadDocumentDto,
  ) {
    return pipe(
      () =>
        this.addNewDocument.execute({
          account: user.account,
          patientId,
          ...body,
        }),
      te.getOrElse((error) => {
        if (error instanceof PatientNotFoundError) {
          throw new BadRequestException(BasicExceptionPresenter.present(error), { cause: error });
        }

        return exceptionsFactory.fromError(error);
      }),
    )();
  }
}
