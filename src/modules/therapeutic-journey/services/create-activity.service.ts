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
import { PtsRepository } from "@/modules/therapeutic-journey/repositories/pts.repository";
import { PtsNotFoundError } from "@/modules/therapeutic-journey/errors/pts-not-found.error";
import { ProfessionalNotAuthorizedToAccessPts } from "@/modules/therapeutic-journey/errors/professional-not-authorized-to-access-pts.error";

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
    private readonly ptsRepo: PtsRepository,
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
      te.apS("pts", () => this.ptsRepo.findActivePtsByPatientId(patientId)),
      te.chainFirstW(
        ({ pts }) =>
          () =>
            this.verifyProfessionalIsAuthorized.execute({
              patientId,
              accountId,
              professionalId,
              pts,
            }),
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
      te.let("activity", ({ pts }) =>
        Activity.create({
          documentsIds,
          assigneeProfessionalId: professionalId,
          frequency,
          title,
          ptsId: pts.getId(),
        }),
      ),
      te.mapLeft((error) =>
        error instanceof PtsNotFoundError ? new ProfessionalNotAuthorizedToAccessPts() : error,
      ),
      te.chainW(
        ({ activity }) =>
          () =>
            this.activityRepo.createNewActivity(activity),
      ),
    )();
  }
}
