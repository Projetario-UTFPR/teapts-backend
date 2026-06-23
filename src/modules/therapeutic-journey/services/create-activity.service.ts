import { Injectable } from "@nestjs/common";
import type { UUID } from "@/common/uuid";
import { taskEither as te } from "fp-ts";
import { Activity } from "../aggregates/activity.aggregate";
import { Frequency } from "@/common/time/value-objects/frequency.vo";
import { pipe } from "fp-ts/lib/function";
import { ActivityRepository } from "../repositories/activity.repository";
import { DocumentsRepository } from "@/modules/patient/repositories/documents.repository";
import { CannotAttachDocumentError } from "../errors/cannot-attach-document.error";
import { VerifyProfessionalIsAuthorizedService } from "@/modules/therapeutic-journey/services/verify-professional-is-authorized.service";

type Params = {
  professionalId: UUID;
  patientId: UUID;
  accountId: UUID;
  documentsIds: UUID[];
  title: string;
  frequency: Frequency;
};

@Injectable()
export class CreateActivityService {
  public constructor(
    private readonly activityRepo: ActivityRepository,
    private readonly documentsRepo: DocumentsRepository,
    private readonly verifyProfessionalIsAuthorized: VerifyProfessionalIsAuthorizedService,
  ) {}

  public async execute({
    professionalId,
    patientId,
    accountId,
    documentsIds,
    title,
    frequency,
  }: Params) {
    return pipe(
      te.Do,
      te.chainFirstW(
        () => () =>
          this.verifyProfessionalIsAuthorized.execute({ patientId, accountId, professionalId }),
      ),
      te.chainFirstW(() =>
        pipe(
          () => this.documentsRepo.checkExistsAndBelongsToPatient(documentsIds, patientId),
          te.filterOrElseW(
            (canAttach) => canAttach,
            () => new CannotAttachDocumentError(),
          ),
        ),
      ),
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
