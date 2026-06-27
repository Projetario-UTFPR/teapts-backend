import { ForbiddenError } from "@/common/errors/forbidden.error";
import { type UUID } from "@/common/uuid";

export class PtsDoesNotBelongToPatientError extends ForbiddenError {
  public constructor(ptsId: UUID) {
    super({
      message: `O PTS (identificado por "${ptsId.toString()}") não lhe concerne.`,
    });
  }
}
