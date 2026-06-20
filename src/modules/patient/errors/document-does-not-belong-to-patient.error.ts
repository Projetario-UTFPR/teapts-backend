import { BadRequestError } from "@/common/errors/bad-request.error";
import { UUID } from "@/common/uuid";

/**
 * Indicates that a professional tried to activate a document's file, but
 * the document hasn't been stored yet.
 */
export class DocumentDoestNotBelongToPatientError extends BadRequestError {
  public constructor(id: UUID) {
    super({
      message:
        `O documento identificado por "${id}" não pertence ao paciente provido, ` +
        "e portanto não pode ser vinculado.",
    });
  }
}
