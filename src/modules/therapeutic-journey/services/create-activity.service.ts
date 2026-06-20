import { Injectable } from "@nestjs/common";
import type { UUID } from "@/common/uuid";
import { PtsRepository } from "../repositories/pts.repository";
import { ProfessionalsRepository } from "@/modules/professional/professionals.repository";
import { taskEither as te } from "fp-ts";
import { ProfessionalDoesNotBelongToUserAccountError } from "../errors/professional-does-not-belong-to-user-account.error";
import { ProfessionalNotAuthorizedToAccessPts } from "../errors/professional-not-authorized-to-access-pts.error";
import { Activity } from "../aggregates/activity.aggregate";
import { Frequency } from "@/common/time/value-objects/frequency.vo";
import { pipe } from "fp-ts/lib/function";
import { ActivityRepository } from "../repositories/activity.repository";
import { DocumentsRepository } from "@/modules/patient/repositories/documents.repository";
import { DocumentDoestNotBelongToPatientError } from "@/modules/patient/errors/document-does-not-belong-to-patient.error";
import { Either } from "fp-ts/lib/Either";
import { IrrecoverableError } from "@/common/errors/irrecoverable.error";

type Params = {
  professionalId: UUID;
  patientId: UUID;
  accountId: UUID;
  documentsIds: UUID[];
  title: string;
  frequency: Frequency;
};

type CreateActivityResult = Either<
  | ProfessionalDoesNotBelongToUserAccountError
  | ProfessionalNotAuthorizedToAccessPts
  | DocumentDoestNotBelongToPatientError
  | IrrecoverableError,
  Activity
>;

@Injectable()
export class CreateActivityService {
  public constructor(
    private readonly activityRepo: ActivityRepository,
    private readonly documentsRepo: DocumentsRepository,
    private readonly ptsRepo: PtsRepository,
    private readonly professionalsRepo: ProfessionalsRepository,
  ) {}

  public async execute({
    professionalId,
    patientId,
    accountId,
    documentsIds,
    title,
    frequency,
  }: Params): Promise<CreateActivityResult> {
    return pipe(
      te.Do,
      te.apSW("pts", () => this.ptsRepo.findActivePtsByPatientId(patientId)),
      te.apSW("professional", () => this.professionalsRepo.findById(professionalId)),
      te.apSW(
        "documents",
        pipe(
          documentsIds,
          te.traverseArray((id) => () => this.documentsRepo.getById(id)),
        ),
      ),
      te.filterOrElseW(
        ({ professional }) => professional.belongsToAccount(accountId),
        () => new ProfessionalDoesNotBelongToUserAccountError(professionalId),
      ),
      te.filterOrElseW(
        ({ pts, professional }) => pts.canBeModifiedByProfessional(professional),
        () => new ProfessionalNotAuthorizedToAccessPts(),
      ),
      te.chainW(({ documents }) => {
        const invalidDocument = documents.find((document) => !document.belongsToPatient(patientId));
        if (invalidDocument !== undefined) {
          return te.left(new DocumentDoestNotBelongToPatientError(invalidDocument.getId()));
        }
        return te.right(documents);
      }),
      te.let("activity", () =>
        Activity.create({ documentsIds, assigneeProfessionalId: professionalId, frequency, title }),
      ),
      te.chainW(
        ({ activity }) =>
          () =>
            this.activityRepo.createNewActivity(activity),
      ),
    )();
  }
}
